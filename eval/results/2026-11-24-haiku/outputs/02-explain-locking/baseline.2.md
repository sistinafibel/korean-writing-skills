## 결론

**인기 상품처럼 동시 주문이 몰리는 경우에는 낙관적 잠금보다 비관적 잠금이 맞습니다.** 다만 `SELECT ... FOR UPDATE`를 따로 쓰기보다 **조건부 원자적 UPDATE**(`WHERE stock >= qty`)로 처리하는 방법이 가장 단순하고 안전합니다. 이 방식도 실제로는 행 잠금을 한 문장 동안만 잡는 비관적 방식에 가깝습니다.

## 두 방식의 차이

| 구분 | 비관적 잠금 (Pessimistic) | 낙관적 잠금 (Optimistic) |
|---|---|---|
| 충돌 가정 | 충돌이 자주 일어난다고 가정 | 충돌이 드물다고 가정 |
| 동작 | 읽을 때 행을 잠가서(`FOR UPDATE`) 다른 트랜잭션이 기다리게 함 | 잠그지 않고 읽고, 쓸 때 버전이 같은지 확인 |
| 충돌 시 | 대기 (락 해제까지) | 실패 후 재시도 |
| 장점 | 재시도가 없고 결과가 예측 가능 | 락 대기가 없어 충돌이 적을 때 빠름 |
| 단점 | 트랜잭션이 길면 대기열이 길어짐, 데드락 가능 | 인기 상품에서 재시도가 폭주함 |

### 인기 상품에서 낙관적 잠금이 어려운 이유

1,000명이 같은 상품을 동시에 주문하면 한 명만 성공하고 나머지 999명은 버전 충돌로 실패합니다. 재시도를 하면 다시 충돌이 나서 재시도 폭풍이 발생하고, 재시도 한도를 넘긴 주문은 실패합니다. 충돌이 잦은 상황에서는 낙관적 잠금이 맞지 않습니다.

## Prisma 구현 예시

### 권장: 조건부 원자적 UPDATE

재고 확인과 차감을 한 SQL 문으로 처리하므로 별도 잠금이 필요 없습니다.

```ts
async function placeOrder(productId: number, qty: number, userId: number) {
  return prisma.$transaction(async (tx) => {
    // stock >= qty 인 경우에만 차감됨 (DB가 행 잠금을 보장)
    const res = await tx.product.updateMany({
      where: { id: productId, stock: { gte: qty } },
      data: { stock: { decrement: qty } },
    });

    if (res.count === 0) {
      throw new Error('OUT_OF_STOCK');
    }

    return tx.order.create({
      data: { productId, userId, quantity: qty },
    });
  });
}
```

`count === 0`이면 재고가 부족하거나 상품이 없는 경우이므로 트랜잭션을 롤백합니다.

### 안전장치: DB 제약조건

애플리케이션 로직에 버그가 있어도 음수가 저장되지 않도록 마이그레이션에 추가합니다.

```sql
ALTER TABLE "Product" ADD CONSTRAINT stock_non_negative CHECK (stock >= 0);
```

### 비관적 잠금 (여러 단계 로직이 필요할 때)

재고 조회 후 애플리케이션에서 복잡한 판단을 해야 할 때 씁니다.

```ts
await prisma.$transaction(async (tx) => {
  const [p] = await tx.$queryRaw<{ stock: number }[]>`
    SELECT stock FROM "Product" WHERE id = ${productId} FOR UPDATE
  `;
  if (!p || p.stock < qty) throw new Error('OUT_OF_STOCK');

  await tx.product.update({
    where: { id: productId },
    data: { stock: { decrement: qty } },
  });
  await tx.order.create({ data: { productId, userId, quantity: qty } });
});
```

이 방식은 트랜잭션 안에서 결제 API 같은 외부 호출을 하면 안 됩니다. 락을 쥔 채 외부 응답을 기다리게 되어 대기가 길어집니다.

## 실무 권장 사항

1. **재고 차감은 조건부 UPDATE로** 처리합니다. 가장 단순하고 틀릴 여지가 적습니다.
2. **트랜잭션은 짧게** 유지합니다. 결제, 외부 API 호출은 트랜잭션 밖에서 처리합니다.
3. **여러 상품을 한 번에 차감하면** 항상 같은 순서(예: id 오름차순)로 갱신해서 데드락을 막습니다.
4. **CHECK 제약조건**을 함께 걸어 최후의 방어선을 둡니다.
5. **초대형 선착순 이벤트**라면 DB 한 행에 트래픽이 몰리는 것 자체가 병목이 됩니다. 이 경우 Redis의 원자적 `DECR`로 선착순을 먼저 거르고, 통과한 주문만 DB에 반영하는 구조를 고려하세요.

정리하면, 인기 상품에는 **조건부 원자적 UPDATE(사실상 짧은 비관적 잠금)**를 쓰고, 낙관적 잠금은 충돌이 드문 일반 상품 수정 같은 곳에 쓰는 것이 적절합니다.
