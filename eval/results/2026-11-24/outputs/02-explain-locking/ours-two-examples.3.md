인기 상품에 주문이 몰리는 쇼핑몰에는 비관적 잠금이 맞습니다. 재고 차감만 처리한다면 잠금 없이 조건부 UPDATE 한 문장으로 처리하는 방식이 더 적합합니다.

## 두 방식의 차이

**낙관적 잠금**은 충돌이 드물다고 가정하고 잠금 없이 읽은 뒤, 쓸 때 `version` 값이 바뀌지 않았는지 확인합니다. 그 사이에 다른 요청이 먼저 쓰면 갱신된 행이 0개이므로 처음부터 다시 시도해야 합니다.

```ts
const result = await prisma.product.updateMany({
  where: { id, version: current.version },
  data: { stock: current.stock - qty, version: { increment: 1 } },
});
if (result.count === 0) {
  // 다른 요청이 먼저 갱신했으므로 다시 읽고 재시도
}
```

**비관적 잠금**은 읽는 시점에 행 잠금을 걸어서 다른 요청이 그 행을 읽거나 쓰지 못하게 대기시킵니다. Prisma 는 `FOR UPDATE` 를 지원하지 않아서 `$queryRaw` 를 사용해야 합니다.

```ts
await prisma.$transaction(async (tx) => {
  const [row] = await tx.$queryRaw<{ stock: number }[]>`
    SELECT stock FROM "Product" WHERE id = ${id} FOR UPDATE`;
  if (row.stock < qty) throw new Error('OUT_OF_STOCK');
  await tx.product.update({
    where: { id },
    data: { stock: { decrement: qty } },
  });
});
```

## 인기 상품에는 비관적 잠금이 맞는 이유

같은 행에 요청 100개가 동시에 들어오면 낙관적 잠금에서는 1개만 성공하고 99개가 재시도합니다. 재시도한 요청끼리 다시 충돌하므로 DB 왕복 횟수가 크게 늘고, 재시도 한도를 넘긴 요청은 재고가 남아 있어도 실패합니다. 비관적 잠금에서는 요청이 줄을 서서 순서대로 처리되므로 재시도가 없고 재고가 남아 있는 만큼 모두 성공합니다.

비관적 잠금을 쓸 때는 다음 세 가지를 지켜야 합니다.

- 잠금을 잡은 채로 외부 결제 API 를 호출하지 않습니다. 트랜잭션 안에는 재고 확인과 차감만 둡니다.
- Prisma 의 interactive transaction 은 커넥션을 점유하고 기본 타임아웃이 5초이므로, 대기하는 요청이 많으면 커넥션 풀이 고갈될 수 있습니다.
- 한 주문에 여러 상품이 있으면 상품 `id` 오름차순으로 잠금을 잡아야 데드락을 피할 수 있습니다.

## 조건부 UPDATE 로 처리하는 방식

재고 차감은 "남은 재고가 충분하면 줄인다"는 단일 조건이므로 읽기와 쓰기를 나눌 필요가 없습니다.

```ts
const { count } = await prisma.product.updateMany({
  where: { id, stock: { gte: qty } },
  data: { stock: { decrement: qty } },
});
if (count === 0) throw new Error('OUT_OF_STOCK');
```

PostgreSQL 의 기본 격리 수준인 READ COMMITTED 에서는 UPDATE 가 행 잠금을 잡고, 대기하던 UPDATE 는 잠금이 풀린 뒤 최신 값으로 `WHERE` 조건을 다시 평가합니다. 따라서 재고가 부족해진 시점부터는 조건에 맞지 않아 0행이 갱신되므로 음수가 되지 않습니다. 이 방식은 DB 왕복이 한 번이고 잠금 보유 시간이 한 문장의 실행 시간으로 줄어듭니다.

여기에 안전장치로 DB 제약을 추가하면 코드에 오류가 있어도 음수 재고가 저장되지 않습니다.

```sql
ALTER TABLE "Product" ADD CONSTRAINT stock_non_negative CHECK (stock >= 0);
```

주문 생성과 재고 차감은 같은 `$transaction` 에 묶어야 합니다. 그래야 주문 저장이 실패했을 때 차감한 재고도 함께 롤백됩니다.

## 추가로 확인할 사항

한정 수량 특가처럼 한 행에 초당 수천 건이 몰리는 상황이라면 행 잠금 대기 자체가 병목이 됩니다. 이때는 Redis 에서 재고를 먼저 차감하고 DB 에는 비동기로 반영하는 구조를 검토해야 합니다. 일반적인 인기 상품 수준의 동시성이라면 조건부 UPDATE 로 충분합니다.
