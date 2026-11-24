## 두 방식의 차이

**비관적 잠금**은 재고 행을 읽는 시점에 잠가서 다른 트랜잭션이 끝날 때까지 기다리게 합니다. PostgreSQL 에서는 `SELECT ... FOR UPDATE` 로 구현합니다. 충돌이 자주 일어난다고 가정하고 미리 막는 방식입니다.

**낙관적 잠금**은 잠그지 않고 읽은 뒤, `version` 컬럼이 읽을 때와 같은지 확인하면서 갱신합니다. 다른 요청이 먼저 바꿨다면 갱신된 행이 0건이므로 다시 읽고 재시도합니다. 충돌이 드물다고 가정하는 방식입니다.

현재 문제는 대부분 "재고를 읽고, 애플리케이션에서 계산한 뒤, 다시 쓰는" 순서에서 생깁니다. 두 요청이 같은 재고 값을 읽으면 둘 다 차감에 성공해서 재고가 음수가 됩니다.

## 인기 상품에는 어느 쪽이 맞는가

인기 상품은 같은 행에 요청이 몰리므로 충돌이 자주 일어납니다. 이 상황에서 낙관적 잠금은 충돌마다 실패하고 재시도하므로, 요청이 많을수록 재시도가 늘어나고 재시도 한도를 넘긴 주문이 실패합니다. 따라서 이런 상품에는 비관적 잠금이 더 적합합니다.

다만 이 문제에서는 잠금을 직접 잡기보다 **조건을 포함한 단일 UPDATE 문**을 쓰는 편이 가장 단순합니다. 재고 확인과 차감이 한 문장으로 실행되므로 요청끼리 엇갈릴 여지가 없습니다. PostgreSQL 은 대기하던 UPDATE 가 잠금을 얻은 뒤 WHERE 조건을 최신 행으로 다시 평가하므로, 재고가 부족한 요청은 0건으로 끝납니다.

## Prisma 구현 예시

조건부 UPDATE 는 Prisma 의 `updateMany` 로 작성합니다. `update` 는 `where` 에 고유 키만 받으므로 재고 조건을 걸 수 없습니다.

```ts
const result = await prisma.product.updateMany({
  where: { id: productId, stock: { gte: quantity } },
  data: { stock: { decrement: quantity } },
});

if (result.count === 0) {
  throw new Error('재고가 부족합니다.');
}
```

DB 에도 마지막 안전장치를 두는 것이 좋습니다. 애플리케이션 코드에 버그가 생겨도 음수 재고가 저장되지 않습니다.

```sql
ALTER TABLE "Product" ADD CONSTRAINT stock_non_negative CHECK (stock >= 0);
```

여러 상품을 한 주문에서 함께 차감해야 한다면 비관적 잠금이 필요할 수 있습니다. 이때는 트랜잭션 안에서 `FOR UPDATE` 로 행을 잠그고 차감하며, 여러 행을 잠글 때는 `id` 순서로 정렬해야 교착 상태를 피할 수 있습니다.

```ts
await prisma.$transaction(async (tx) => {
  const [product] = await tx.$queryRaw<{ stock: number }[]>`
    SELECT stock FROM "Product" WHERE id = ${productId} FOR UPDATE`;

  if (product.stock < quantity) {
    throw new Error('재고가 부족합니다.');
  }

  await tx.product.update({
    where: { id: productId },
    data: { stock: { decrement: quantity } },
  });
});
```

단일 상품 주문이라면 앞의 `updateMany` 방식으로 충분하고, 코드도 더 짧습니다.
