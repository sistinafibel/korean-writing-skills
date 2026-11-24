# 재고 차감 동시성: 낙관적 잠금 vs 비관적 잠금

## 두 방식의 차이

| | 낙관적 잠금 | 비관적 잠금 |
|---|---|---|
| 전제 | 충돌은 드물다 | 충돌이 자주 난다 |
| 동작 | 잠그지 않고 읽은 뒤, 쓸 때 `version`이 그대로인지 확인 | 읽는 시점에 행을 잠가 다른 트랜잭션을 대기시킴 |
| 충돌 시 | 업데이트가 0건이 되어 **재시도** 필요 | 앞 트랜잭션이 끝날 때까지 **대기** |
| 비용 | 충돌이 많으면 재시도 폭증 | 락 대기와 데드락 위험, 커넥션 점유 |
| PostgreSQL | `version` 컬럼 + 조건부 `UPDATE` | `SELECT ... FOR UPDATE` |

## 인기 상품 쇼핑몰에는 비관적 쪽이 맞습니다

같은 행에 요청이 몰리면 낙관적 잠금은 거의 매번 충돌합니다. 100명이 동시에 주문하면 1명만 성공하고 99명이 재시도하며, 재시도해도 다시 충돌합니다. DB 부하만 늘고 처리량은 오히려 떨어집니다. 비관적 잠금은 순서대로 처리하므로 결과가 예측 가능합니다.

다만 이 경우에는 **둘 다 쓰지 않고, 조건부 원자적 UPDATE 한 줄로 푸는 방법**이 가장 낫습니다. 아래에서 설명합니다.

## 권장안: 원자적 조건부 UPDATE (Prisma)

PostgreSQL은 `UPDATE` 시점에 행 락을 자동으로 잡습니다. 그래서 "재고가 충분할 때만 차감"을 한 문장으로 쓰면 읽기와 쓰기 사이의 틈이 없습니다.

```ts
const result = await prisma.product.updateMany({
  where: { id: productId, stock: { gte: qty } },
  data: { stock: { decrement: qty } },
});

if (result.count === 0) {
  throw new Error("재고 부족");
}
```

생성되는 SQL은 `UPDATE ... SET stock = stock - $1 WHERE id = $2 AND stock >= $1`입니다. 락 유지 시간이 이 문장 하나로 끝나서 가장 짧고, 재시도 로직도 필요 없습니다.

안전장치로 DB 제약도 추가해 두세요. 코드에 버그가 있어도 음수는 막아 줍니다.

```sql
ALTER TABLE "Product" ADD CONSTRAINT stock_non_negative CHECK (stock >= 0);
```

## 비관적 잠금이 꼭 필요할 때

재고 확인 후 다른 로직(쿠폰, 포인트, 여러 테이블 갱신 등)이 같은 트랜잭션에서 이어져야 한다면 `FOR UPDATE`를 씁니다. Prisma는 이 문법을 지원하지 않으므로 raw 쿼리를 사용합니다.

```ts
await prisma.$transaction(async (tx) => {
  const [row] = await tx.$queryRaw<{ stock: number }[]>`
    SELECT stock FROM "Product" WHERE id = ${productId} FOR UPDATE
  `;
  if (!row || row.stock < qty) throw new Error("재고 부족");

  await tx.product.update({
    where: { id: productId },
    data: { stock: { decrement: qty } },
  });
  // 주문 생성 등 후속 처리
});
```

주의할 점은 다음과 같습니다.
- 트랜잭션을 짧게 유지하세요. 락을 잡은 채 외부 API(결제 등)를 호출하면 대기열이 쌓입니다.
- 여러 상품을 한 주문에서 차감한다면 **상품 ID 오름차순**으로 처리하세요. 락 순서가 일정해야 데드락이 생기지 않습니다.

## 낙관적 잠금은 언제 쓰나

충돌이 드문 데이터에 적합합니다. 예를 들어 관리자가 상품 정보를 수정하는 경우입니다. 인기 상품의 재고 차감에는 맞지 않습니다.

## 그래도 부족하다면

한 행에 초당 수천 건이 몰리면 어떤 락 방식이든 그 행이 병목이 됩니다. 그때는 다음을 검토하세요.
- Redis `DECR`로 선차감한 뒤 DB에 비동기로 반영
- 주문을 큐에 넣어 순차 처리
- 재고를 여러 행(샤드)으로 나눠 분산

## 결론

1. 기본은 **조건부 원자적 UPDATE + CHECK 제약**입니다.
2. 재고 확인 뒤 복잡한 로직이 이어진다면 **`FOR UPDATE`(비관적)**를 씁니다.
3. 인기 상품에는 낙관적 잠금을 피하세요.
