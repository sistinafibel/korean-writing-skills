## 두 방식의 차이

**낙관적 잠금**은 행을 읽을 때 `version` 컬럼 값을 함께 읽고, 수정할 때 그 값이 바뀌지 않았을 때만 반영하는 방식입니다. 읽는 동안 DB 잠금을 유지하지 않으므로 충돌이 드물면 대기 시간이 거의 없습니다. 하지만 충돌이 발생하면 `WHERE version = ?` 조건에 맞는 행이 없어서 수정 건수가 0이 되고, 애플리케이션이 다시 읽어서 재시도해야 합니다.

**비관적 잠금**은 읽는 시점에 `SELECT ... FOR UPDATE`로 행을 잠그고, 트랜잭션이 끝날 때까지 다른 트랜잭션이 그 행을 수정하지 못하게 하는 방식입니다. 충돌이 발생해도 뒤에 온 요청이 대기하다가 순서대로 처리되므로 재시도 코드가 필요 없습니다. 대신 잠금을 오래 잡고 있으면 대기열이 길어집니다.

## 인기 상품에는 비관적 잠금이 맞습니다

같은 행에 요청이 몰리면 낙관적 잠금에서는 한 번에 한 요청만 성공하고 나머지는 모두 실패해서 재시도합니다. 동시 요청이 100건이면 재시도가 연쇄적으로 발생하고, 재시도 횟수 상한을 넘은 주문은 재고가 남아 있는데도 실패 처리됩니다. 충돌이 항상 발생하는 환경에서는 이 방식이 DB 부하만 늘립니다. 비관적 잠금은 대기 후 순서대로 처리하므로 재고가 남아 있는 한 주문이 성공합니다.

## 잠금 코드를 직접 작성하지 않는 방법이 가장 간단합니다

재고 차감은 조건부 `UPDATE` 한 문장으로 처리할 수 있습니다. PostgreSQL은 `UPDATE`가 행을 수정하는 동안 그 행에 잠금을 걸기 때문에 별도의 `FOR UPDATE`가 필요 없습니다. 조건에 `stock >= 수량`을 넣으면 음수가 되는 경우에는 수정 건수가 0이 됩니다. Prisma에서는 `updateMany`로 작성합니다.

```ts
await prisma.$transaction(async (tx) => {
  const result = await tx.product.updateMany({
    where: { id: productId, stock: { gte: quantity } },
    data: { stock: { decrement: quantity } },
  });

  if (result.count === 0) {
    throw new OutOfStockError(productId);
  }

  await tx.order.create({ data: { productId, quantity, userId } });
});
```

이 코드는 `UPDATE ... SET stock = stock - $1 WHERE id = $2 AND stock >= $1`로 실행됩니다. 읽은 값을 애플리케이션에서 계산해서 쓰는 방식이 아니므로 동시 요청이 겹쳐도 재고가 음수가 되지 않습니다. `updateMany`의 `count`는 `update`와 달리 조건에 맞는 행이 없어도 예외를 던지지 않고 0을 반환하기 때문에 재고 부족을 직접 판별할 수 있습니다.

`FOR UPDATE`가 필요한 경우는 재고를 읽어서 다른 로직(예: 묶음 상품 가격 계산)에 사용한 뒤에 수정해야 할 때입니다. Prisma의 조회 API는 `FOR UPDATE`를 지원하지 않으므로 트랜잭션 안에서 `$queryRaw`를 사용합니다.

```ts
await prisma.$transaction(async (tx) => {
  const [row] = await tx.$queryRaw<{ stock: number }[]>`
    SELECT stock FROM "Product" WHERE id = ${productId} FOR UPDATE
  `;
  if (!row || row.stock < quantity) throw new OutOfStockError(productId);

  await tx.product.update({
    where: { id: productId },
    data: { stock: { decrement: quantity } },
  });
});
```

## 함께 적용할 사항

- **CHECK 제약**: `ALTER TABLE "Product" ADD CONSTRAINT stock_non_negative CHECK (stock >= 0);`을 추가하면 애플리케이션 코드에 오류가 있어도 DB가 음수 재고를 거부합니다.
- **트랜잭션 길이**: 행 잠금은 커밋될 때까지 유지되므로 트랜잭션 안에서 결제 API 호출이나 외부 HTTP 요청을 하지 않아야 합니다. 이런 호출이 포함되면 같은 상품의 모든 주문이 그 시간만큼 대기합니다.
- **처리량 한계**: 한 행에 대한 수정은 직렬로 처리되므로 초당 수천 건을 넘는 특가 상황에서는 이 방식도 병목이 됩니다. 그때는 Redis에서 재고를 먼저 차감하고 DB에는 비동기로 반영하는 구조나, 재고를 여러 행으로 나누는 방식을 검토해야 합니다.
