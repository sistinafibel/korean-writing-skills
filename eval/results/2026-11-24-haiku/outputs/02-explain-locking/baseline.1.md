## 결론

인기 상품에 주문이 몰리는 쇼핑몰이라면 **낙관적 잠금보다 비관적 잠금이 맞습니다.** 다만 Prisma에서는 잠금을 직접 걸기보다 **조건부 원자적 UPDATE**(`WHERE stock >= 수량`)를 쓰는 것이 가장 간단하고 안전합니다. 이 방식은 사실상 비관적 잠금과 같은 보장을 한 문장으로 얻습니다.

## 두 방식의 차이

| 구분 | 비관적 잠금 (Pessimistic) | 낙관적 잠금 (Optimistic) |
|---|---|---|
| 기본 전제 | 충돌이 자주 난다고 보고 미리 잠금 | 충돌이 드물다고 보고 커밋 시점에 검사 |
| 구현 | `SELECT ... FOR UPDATE` | `version` 컬럼 비교 후 `UPDATE`, 실패 시 재시도 |
| 충돌 시 동작 | 다른 트랜잭션이 대기 | 실패 후 재시도 |
| 인기 상품(고경합) | 대기열처럼 순서대로 처리되어 안정적 | 재시도가 폭주해 실패율과 DB 부하가 급증 |
| 주의점 | 잠금 보유 시간이 길면 처리량 저하, 데드락 가능 | 재시도 로직 필요, 경합이 높으면 비효율 |

낙관적 잠금은 상품 리뷰 수정처럼 충돌이 드문 작업에 적합합니다. 재고처럼 같은 행에 요청이 몰리는 곳에서는 대부분의 요청이 재시도를 반복하게 됩니다.

## 권장 방식: 조건부 원자적 UPDATE + CHECK 제약

PostgreSQL은 `UPDATE` 한 문장을 실행할 때 행 잠금을 자동으로 걸고, 조건을 확인한 뒤 값을 바꿉니다. 그래서 "읽고 → 검사하고 → 쓰는" 과정을 따로 하면 경쟁 상태가 생기지만, 조건을 `WHERE`에 넣으면 이 문제가 사라집니다.

```ts
// 재고 차감
const result = await prisma.product.updateMany({
  where: {
    id: productId,
    stock: { gte: quantity }, // 재고가 충분할 때만 차감
  },
  data: {
    stock: { decrement: quantity },
  },
});

if (result.count === 0) {
  throw new Error('재고 부족');
}
```

`decrement`만 쓰고 `where` 조건을 빼면 음수가 그대로 들어갑니다. 조건이 핵심입니다.

DB 레벨에서도 한 번 더 막아 두는 것을 권장합니다. 마이그레이션 파일에 다음을 추가하세요.

```sql
ALTER TABLE "Product"
  ADD CONSTRAINT stock_non_negative CHECK (stock >= 0);
```

애플리케이션 코드에 버그가 있어도 DB가 음수 재고를 거부합니다.

## 비관적 잠금을 써야 하는 경우

차감 전후로 복잡한 계산이나 여러 테이블 조작이 필요하면 행을 잠그고 트랜잭션을 여는 방식이 편합니다. Prisma에서는 `$queryRaw`로 `FOR UPDATE`를 씁니다.

```ts
await prisma.$transaction(async (tx) => {
  const [product] = await tx.$queryRaw<{ stock: number }[]>`
    SELECT stock FROM "Product" WHERE id = ${productId} FOR UPDATE
  `;

  if (!product || product.stock < quantity) {
    throw new Error('재고 부족');
  }

  await tx.product.update({
    where: { id: productId },
    data: { stock: { decrement: quantity } },
  });

  await tx.order.create({
    data: { productId, quantity /* ... */ },
  });
});
```

이 방식은 트랜잭션을 짧게 유지해야 합니다. 트랜잭션 안에서 외부 API(결제 등)를 호출하면 잠금이 그만큼 오래 유지되어 인기 상품의 처리량이 크게 떨어집니다.

## 추가로 고려할 점

- **주문 생성과 재고 차감은 같은 트랜잭션에 넣으세요.** 한쪽만 성공하는 상황을 막습니다.
- **트래픽이 매우 크다면** (타임세일 등) DB 행 잠금만으로는 한계가 옵니다. 주문을 큐(예: Redis, SQS)에 쌓아 순차 처리하거나, Redis의 원자적 `DECRBY`로 먼저 재고를 예약한 뒤 DB에 반영하는 구조를 검토하세요.
- **재시도를 허용한다면** 주문 요청에 멱등성 키를 붙여 같은 주문이 두 번 차감되지 않도록 하세요.

정리하면, 지금 상황에서는 **조건부 원자적 UPDATE + CHECK 제약**으로 시작하고, 차감 로직이 복잡해지면 `FOR UPDATE` 기반 비관적 잠금을 쓰는 것이 현실적인 선택입니다.
