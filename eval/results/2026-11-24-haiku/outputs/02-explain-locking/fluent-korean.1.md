## 결론

인기 상품처럼 동시 주문이 몰리는 상황에는 **조건부 UPDATE(원자적 차감)**나 **비관적 잠금**이 맞습니다. 낙관적 잠금은 충돌이 드문 상황에 적합하므로, 충돌이 잦은 인기 상품에서는 재시도가 많아져 오히려 비효율적입니다.

## 두 방식의 차이

**낙관적 잠금(Optimistic Locking)**은 잠그지 않고 진행한 뒤, 저장할 때 충돌을 검사합니다. 보통 `version` 컬럼을 두고, 읽은 버전과 현재 버전이 같을 때만 갱신합니다. 갱신된 행이 0건이면 다른 트랜잭션이 먼저 바꾼 것이므로 재시도합니다.

- 장점: 잠금을 오래 잡지 않아 대기가 없습니다.
- 단점: 충돌이 잦으면 재시도가 폭증하고, 일부 요청은 계속 실패합니다.

**비관적 잠금(Pessimistic Locking)**은 읽는 시점에 행을 잠가 다른 트랜잭션이 기다리게 합니다. PostgreSQL에서는 `SELECT ... FOR UPDATE`로 구현합니다.

- 장점: 충돌이 많아도 재시도 없이 순서대로 처리됩니다.
- 단점: 같은 상품에 대기가 쌓여 처리량이 떨어지고, 트랜잭션이 길면 데드락 위험이 커집니다.

## 인기 상품에 권장하는 방식

가장 단순하고 안전한 방법은 차감과 검증을 **한 번의 UPDATE**로 처리하는 것입니다. PostgreSQL은 UPDATE 시점에 행 잠금을 잡고 WHERE 조건을 최신 값으로 다시 평가하므로, 재고가 음수가 되지 않습니다.

```ts
const result = await prisma.product.updateMany({
  where: { id: productId, stock: { gte: quantity } },
  data: { stock: { decrement: quantity } },
});

if (result.count === 0) {
  throw new Error("재고가 부족합니다.");
}
```

비관적 잠금이 필요한 경우, 즉 재고 확인 뒤에 다른 복잡한 로직이 이어질 때는 인터랙티브 트랜잭션으로 구현할 수 있습니다.

```ts
await prisma.$transaction(async (tx) => {
  const [product] = await tx.$queryRaw<{ stock: number }[]>`
    SELECT stock FROM "Product" WHERE id = ${productId} FOR UPDATE`;

  if (product.stock < quantity) {
    throw new Error("재고가 부족합니다.");
  }

  await tx.product.update({
    where: { id: productId },
    data: { stock: { decrement: quantity } },
  });
});
```

## 함께 적용하면 좋은 안전장치

- **DB 제약 조건**: `ALTER TABLE "Product" ADD CONSTRAINT stock_non_negative CHECK (stock >= 0);`을 추가하면, 애플리케이션 로직에 버그가 있어도 음수 재고가 저장되지 않습니다.
- **주문 생성과 차감의 원자성**: 주문 기록과 재고 차감을 같은 트랜잭션에 묶어야 합니다. 그래야 한쪽만 성공하는 상황을 막을 수 있습니다.
- **잠금 대기 범위 축소**: 같은 상품의 트랜잭션은 짧게 유지하고, 외부 API 호출은 트랜잭션 밖으로 빼는 것이 좋습니다.

인기 상품의 초고빈도 트래픽이 DB 행 잠금에서 병목이 된다면, 그때는 Redis 등으로 재고를 먼저 차감하는 구조를 검토하는 것이 다음 단계입니다.
