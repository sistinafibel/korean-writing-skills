## 결론

인기 상품처럼 같은 행에 주문이 몰리는 경우에는 **비관적 잠금 방식**이 맞습니다. 다만 Prisma에서는 `SELECT ... FOR UPDATE`를 직접 쓰기보다 **조건을 포함한 단일 UPDATE문**으로 처리하는 편이 간단하고 안전합니다. 이 방식은 DB가 행 잠금을 잡은 상태에서 재고 확인과 차감을 한 번에 수행합니다.

## 두 방식의 차이

**낙관적 잠금**은 행을 잠그지 않고, `version` 같은 컬럼으로 충돌 여부를 나중에 확인합니다. 읽은 값과 저장하려는 시점의 버전이 다르면 실패시키고 재시도합니다. 충돌이 드문 환경에서는 잠금 대기가 없어 효율적입니다.

**비관적 잠금**은 행을 읽는 시점에 잠금을 걸어 다른 트랜잭션이 그 행을 수정하지 못하게 막습니다. 다른 요청은 잠금이 풀릴 때까지 기다립니다.

## 인기 상품에 비관적 잠금이 맞는 이유

낙관적 잠금은 충돌이 잦을수록 실패가 늘어납니다. 주문 100건이 동시에 들어오면 한 건만 성공하고 나머지는 재시도를 반복하며, 재시도 횟수가 많아지면 결국 실패로 처리됩니다. 재고가 남아 있는데도 주문이 실패하는 상황이 생기기 쉽습니다.

비관적 잠금은 요청을 순서대로 처리하므로 충돌 자체는 해소됩니다. 트랜잭션이 짧다면 대기 시간도 감당할 만합니다.

## Prisma 구현 예시

### 1. 조건부 원자적 UPDATE (권장)

재고가 요청 수량 이상일 때만 차감합니다. 조건과 차감이 한 문장에서 이루어지므로 읽고 나서 쓰는 사이의 간격이 생기지 않습니다.

```ts
async function decreaseStock(productId: number, quantity: number) {
  const { count } = await prisma.product.updateMany({
    where: { id: productId, stock: { gte: quantity } },
    data: { stock: { decrement: quantity } },
  });

  if (count === 0) {
    throw new Error('재고가 부족합니다.');
  }
}
```

### 2. 여러 상품을 한 주문에 담는 경우

교차 잠금으로 인한 데드락을 막으려면 상품 ID 순서로 차감하고, 주문 생성도 같은 트랜잭션에 묶어야 합니다.

```ts
await prisma.$transaction(async (tx) => {
  const sorted = [...items].sort((a, b) => a.productId - b.productId);

  for (const item of sorted) {
    const { count } = await tx.product.updateMany({
      where: { id: item.productId, stock: { gte: item.quantity } },
      data: { stock: { decrement: item.quantity } },
    });
    if (count === 0) {
      throw new Error(`상품 ${item.productId}의 재고가 부족합니다.`);
    }
  }

  await tx.order.create({ data: { /* 주문 정보 */ } });
});
```

### 3. 안전장치: DB 제약 조건

애플리케이션 로직에 버그가 생겨도 음수 재고가 저장되지 않도록 마이그레이션에 CHECK 제약을 추가합니다.

```sql
ALTER TABLE "Product" ADD CONSTRAINT stock_non_negative CHECK (stock >= 0);
```

### 4. 참고: 재고 계산이 복잡한 경우

할인 규칙처럼 차감 전에 여러 값을 계산해야 한다면 행 잠금을 직접 잡을 수 있습니다.

```ts
await prisma.$transaction(async (tx) => {
  const [product] = await tx.$queryRaw<{ stock: number }[]>`
    SELECT stock FROM "Product" WHERE id = ${productId} FOR UPDATE
  `;

  if (product.stock < quantity) {
    throw new Error('재고가 부족합니다.');
  }

  await tx.product.update({
    where: { id: productId },
    data: { stock: { decrement: quantity } },
  });
});
```

## 참고 사항

- 트랜잭션은 짧게 유지하세요. 외부 API 호출을 트랜잭션 안에 넣으면 잠금 시간이 길어져 병목이 됩니다.
- 낙관적 잠금은 상품 수정처럼 충돌이 드문 작업에 적합합니다. 재고 차감에는 맞지 않습니다.
- 기본 격리 수준인 READ COMMITTED에서도 위 방식들은 음수 재고를 막습니다. 별도로 SERIALIZABLE을 설정할 필요는 없습니다.
