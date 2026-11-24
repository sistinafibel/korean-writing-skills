## 결론부터

인기 상품에 주문이 몰리는 환경에서는 **비관적 잠금 쪽이 맞습니다.** 다만 재고 차감처럼 단순한 경우에는 `SELECT ... FOR UPDATE`보다 **조건부 원자적 UPDATE 한 문장**이 더 간단하고 빠릅니다. 이 방식은 사실상 짧은 비관적 잠금처럼 동작합니다.

## 두 방식의 차이

| | 낙관적 잠금 | 비관적 잠금 |
|---|---|---|
| 가정 | 충돌은 드물다 | 충돌이 자주 난다 |
| 방식 | 잠금 없이 읽고, 쓸 때 `version`이 바뀌었는지 확인 | 읽을 때 행 잠금(`FOR UPDATE`)을 걸고 다른 트랜잭션을 대기시킴 |
| 충돌 시 | 업데이트 실패, 애플리케이션이 재시도 | 먼저 온 트랜잭션이 끝날 때까지 대기 후 순차 처리 |
| 장점 | 잠금 대기가 없고 읽기가 가볍다 | 충돌해도 실패 없이 순서대로 처리된다 |
| 단점 | 경합이 심하면 재시도가 폭증하고 대부분 실패한다 | 잠금을 오래 쥐면 대기열이 쌓이고 데드락 위험이 있다 |

## 인기 상품에는 왜 비관적 잠금인가

같은 행에 수백 건이 동시에 몰리면 낙관적 잠금에서는 한 번에 한 건만 성공하고 나머지는 모두 실패 후 재시도합니다. 재시도가 다시 충돌하면서 DB 부하와 응답 지연만 커집니다. 반면 비관적 잠금은 줄을 세워 하나씩 처리하므로 처리량이 예측 가능합니다.

## 추천 구현: 조건부 원자적 UPDATE

읽고, 검사하고, 쓰는 과정을 한 문장으로 합치면 경쟁 구간이 사라집니다. PostgreSQL은 UPDATE 중에 행 잠금을 잡기 때문에 동시 요청이 자동으로 직렬화됩니다.

```ts
const result = await prisma.product.updateMany({
  where: { id: productId, stock: { gte: quantity } },
  data: { stock: { decrement: quantity } },
});

if (result.count === 0) {
  throw new Error('재고 부족');
}
```

실행되는 SQL은 `UPDATE ... SET stock = stock - $1 WHERE id = $2 AND stock >= $1`입니다. 영향받은 행이 0이면 재고가 부족한 것입니다.

주의할 점은 `findUnique`로 재고를 읽어 코드에서 `if (stock >= qty)`로 검사한 뒤 `update`하는 패턴입니다. 이 패턴은 읽기와 쓰기 사이에 다른 요청이 끼어들기 때문에 음수 재고의 원인이 됩니다.

## 주문 생성과 함께 처리해야 할 때

재고 차감과 주문 생성이 한 트랜잭션이어야 하면 `$transaction` 안에서 처리하세요.

```ts
await prisma.$transaction(async (tx) => {
  const r = await tx.product.updateMany({
    where: { id: productId, stock: { gte: quantity } },
    data: { stock: { decrement: quantity } },
  });
  if (r.count === 0) throw new Error('재고 부족');

  await tx.order.create({ data: { /* ... */ } });
});
```

재고 외의 다른 값도 읽고 판단해야 한다면 Prisma가 `FOR UPDATE`를 지원하지 않으므로 raw 쿼리를 쓰세요.

```ts
await prisma.$transaction(async (tx) => {
  const [p] = await tx.$queryRaw<{ stock: number }[]>`
    SELECT stock FROM "Product" WHERE id = ${productId} FOR UPDATE`;
  if (p.stock < quantity) throw new Error('재고 부족');
  await tx.product.update({
    where: { id: productId },
    data: { stock: { decrement: quantity } },
  });
});
```

## 추가 권장 사항

- **안전망 제약**: `ALTER TABLE "Product" ADD CONSTRAINT stock_non_negative CHECK (stock >= 0);` 애플리케이션 로직에 버그가 있어도 음수 재고는 DB가 막아 줍니다.
- **트랜잭션을 짧게**: 잠금을 잡은 상태에서 결제 API 같은 외부 호출을 하지 마세요. 대기열이 막힙니다. 재고 차감 후 결제하고, 실패하면 재고를 복구하는 방식이 일반적입니다.
- **데드락 방지**: 여러 상품을 한 주문에서 차감한다면 항상 상품 ID 순서로 잠금을 잡으세요.
- **초대형 트래픽(특가, 한정 수량)**: 단일 행에 초당 수천 건이 몰리면 DB 행 잠금도 병목이 됩니다. 이때는 Redis의 `DECR`로 선점하고 DB에 비동기 반영하거나, 재고를 여러 행으로 쪼개는 방식을 고려하세요.

## 요약

- 경합이 낮은 일반 상품은 낙관적 잠금도 괜찮습니다.
- 인기 상품에 주문이 몰린다면 조건부 `UPDATE`(또는 `FOR UPDATE`)로 DB가 직렬화하게 하세요.
- 여기에 `CHECK (stock >= 0)` 제약을 더하면 안전합니다.
