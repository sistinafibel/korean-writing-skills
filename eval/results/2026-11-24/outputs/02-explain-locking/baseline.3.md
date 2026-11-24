## 결론

인기 상품에 주문이 몰리는 경우라면 **비관적 잠금 쪽이 맞습니다**. 다만 이 문제는 두 방식 모두 아니고, **조건부 원자적 UPDATE 한 줄**로 가장 간단하게 풀립니다. 이 방식은 DB가 행 잠금을 짧게 잡아 주기 때문에 사실상 가장 가벼운 비관적 잠금입니다.

## 두 방식의 차이

| | 낙관적 잠금 | 비관적 잠금 |
|---|---|---|
| 가정 | 충돌은 드물다 | 충돌이 잦다 |
| 방식 | 잠금 없이 읽고, 쓸 때 `version`이 그대로인지 확인 | 읽는 시점에 `SELECT ... FOR UPDATE`로 행을 잠금 |
| 충돌 시 | 업데이트가 0건이 되어 **재시도** 필요 | 다른 트랜잭션이 **대기** |
| 장점 | 잠금 대기가 없고, 충돌이 드물면 처리량이 높음 | 충돌이 많아도 결과가 안정적이고 재시도 로직이 불필요 |
| 단점 | 경합이 심하면 재시도가 폭증하고 실패율이 올라감 | 트랜잭션이 길면 대기열이 쌓이고 데드락 위험이 있음 |

## 인기 상품에 낙관적 잠금이 안 맞는 이유

같은 행에 100명이 동시에 접근하면 한 명만 성공하고 99명은 재시도합니다. 재시도에서도 같은 일이 반복되므로 DB 부하는 커지는데 처리량은 오히려 떨어집니다. 사용자에게는 불필요한 실패 응답이 나가기도 합니다.

## 권장: 조건부 원자적 UPDATE

읽고 계산하고 쓰는 과정을 SQL 한 문장으로 합치면 경쟁 상태가 사라집니다.

```ts
const result = await prisma.product.updateMany({
  where: { id: productId, stock: { gte: quantity } },
  data: { stock: { decrement: quantity } },
});

if (result.count === 0) {
  throw new Error('재고가 부족합니다');
}
```

생성되는 SQL은 다음과 같습니다.

```sql
UPDATE "Product" SET stock = stock - $1 WHERE id = $2 AND stock >= $1;
```

- PostgreSQL이 UPDATE 중에 행 잠금을 잡으므로 동시 요청은 순서대로 처리됩니다.
- 대기 후에는 최신 값으로 `stock >= quantity`를 다시 평가하므로 음수가 될 수 없습니다.
- 재시도 로직이 필요 없고 왕복도 1회뿐입니다.

여기서 `findUnique`로 재고를 읽은 뒤 `update`하는 방식은 쓰면 안 됩니다. 지금 문제가 바로 그 패턴에서 생깁니다.

## 안전장치로 CHECK 제약 추가

애플리케이션 버그가 있어도 DB가 음수를 막아 주도록 합니다. Prisma 스키마는 CHECK를 직접 지원하지 않으므로 마이그레이션 SQL에 추가합니다.

```sql
ALTER TABLE "Product" ADD CONSTRAINT stock_non_negative CHECK (stock >= 0);
```

## 재고 외에 검증이나 다른 테이블 작업도 함께 해야 한다면

재고 확인 후 주문 생성 등 여러 단계를 한 트랜잭션에서 처리해야 한다면 `SELECT FOR UPDATE`를 씁니다.

```ts
await prisma.$transaction(async (tx) => {
  const [row] = await tx.$queryRaw<{ stock: number }[]>`
    SELECT stock FROM "Product" WHERE id = ${productId} FOR UPDATE
  `;
  if (!row || row.stock < quantity) throw new Error('재고가 부족합니다');

  await tx.product.update({
    where: { id: productId },
    data: { stock: { decrement: quantity } },
  });
  await tx.order.create({ data: { /* ... */ } });
});
```

주의할 점은 다음과 같습니다.
- 트랜잭션 안에서 **결제 API 같은 외부 호출을 하지 마세요.** 잠금을 오래 쥐면 같은 상품의 모든 주문이 줄을 섭니다.
- 여러 상품을 잠글 때는 **항상 id 오름차순**으로 잠가 데드락을 피하세요.

## 그래도 트래픽이 감당이 안 될 때

단일 행에 초당 수천 건 이상이 몰리는 선착순 판매 같은 경우입니다. 이때는 행 하나가 병목이 되므로 구조를 바꿔야 합니다.
- Redis의 `DECR`로 재고를 선차감하고, DB에는 큐로 비동기 반영
- 재고를 여러 행(샤드)으로 쪼개 경합 분산
- 주문 접수를 큐에 넣어 순차 처리

대부분의 쇼핑몰은 조건부 UPDATE와 CHECK 제약만으로 충분합니다. 이것부터 적용하고 부하 테스트로 한계를 확인한 뒤 다음 단계를 고려하시길 권합니다.
