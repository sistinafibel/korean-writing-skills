인기 상품에 주문이 몰리는 경우에는 낙관적 잠금보다 비관적 잠금이 맞습니다. 다만 재고 차감에는 두 방식보다 조건부 UPDATE 한 문장이 더 적합하므로, 그 방법을 먼저 권합니다.

## 두 방식의 차이

| | 낙관적 잠금 | 비관적 잠금 |
|---|---|---|
| 잠금 시점 | 읽을 때는 잠그지 않고 쓸 때 충돌을 검사합니다 | 읽는 시점에 행을 잠급니다 |
| 충돌 처리 | UPDATE가 0건 갱신되면 애플리케이션이 다시 읽고 재시도합니다 | 다른 트랜잭션이 잠금이 풀릴 때까지 기다립니다 |
| 유리한 상황 | 같은 행을 동시에 수정하는 일이 드물 때 | 같은 행에 수정이 자주 몰릴 때 |
| 비용 | 충돌이 잦으면 재시도로 DB 왕복이 늘어납니다 | 트랜잭션이 길면 대기열이 길어지고 커넥션을 오래 점유합니다 |

낙관적 잠금은 `version` 컬럼을 두고 `UPDATE ... WHERE id = ? AND version = ?`로 갱신합니다. 같은 상품에 요청 100개가 동시에 들어오면 한 번에 하나만 성공하고 나머지는 모두 재시도해야 하며, 재시도하는 요청끼리 다시 충돌하므로 DB 왕복이 요청 수에 비례해서 늘어납니다. 재시도 횟수에 상한을 두면 재고가 남아 있는데도 실패하는 주문이 생깁니다.

비관적 잠금은 `SELECT ... FOR UPDATE`로 행을 잠그기 때문에 재시도 없이 요청이 순서대로 처리됩니다. 인기 상품처럼 충돌이 확실히 일어나는 행에서는 이 방식이 낭비하는 작업이 더 적습니다.

## 권장: 조건부 원자적 UPDATE

재고 차감은 "현재 재고가 충분하면 차감한다"는 조건 하나로 표현할 수 있으므로 읽기와 쓰기를 나눌 필요가 없습니다. PostgreSQL은 UPDATE 실행 중 행 잠금을 얻고, 다른 트랜잭션이 먼저 갱신했다면 대기한 뒤 갱신된 값으로 WHERE 조건을 다시 평가합니다. 그래서 별도의 `FOR UPDATE`나 `version` 컬럼 없이도 재고가 음수가 되지 않습니다.

```ts
const result = await prisma.product.updateMany({
  where: { id: productId, stock: { gte: quantity } },
  data: { stock: { decrement: quantity } },
});

if (result.count === 0) {
  throw new OutOfStockError(productId);
}
```

`update`가 아니라 `updateMany`를 쓰는 이유는 조건에 맞는 행이 없을 때 예외 대신 `count: 0`을 받기 위해서입니다. 이 방식은 기본 격리 수준인 READ COMMITTED에서 동작하며, REPEATABLE READ 이상으로 올리면 직렬화 실패가 발생해서 재시도가 필요해집니다.

## 비관적 잠금이 필요한 경우

재고 확인 뒤에 쿠폰 검증처럼 애플리케이션 로직이 끼어들어서 조건을 SQL 한 문장으로 표현할 수 없다면 `FOR UPDATE`를 사용합니다. Prisma는 이 구문을 지원하지 않으므로 interactive transaction 안에서 raw query로 실행합니다.

```ts
await prisma.$transaction(async (tx) => {
  const [row] = await tx.$queryRaw<{ stock: number }[]>`
    SELECT stock FROM "Product" WHERE id = ${productId} FOR UPDATE
  `;

  if (!row || row.stock < quantity) {
    throw new OutOfStockError(productId);
  }

  await tx.product.update({
    where: { id: productId },
    data: { stock: { decrement: quantity } },
  });
});
```

이 방식을 사용할 때에는 다음 사항을 지켜야 합니다.

- 잠금을 보유하는 시간이 곧 대기 시간이므로 결제 API 호출 같은 외부 통신은 트랜잭션 밖에서 처리합니다.
- 한 주문에 여러 상품이 있으면 상품 id 순서대로 잠금을 걸어야 교착 상태를 피할 수 있습니다.
- `$transaction`의 `timeout`과 `maxWait`를 명시해서 대기가 길어질 때 커넥션 풀이 고갈되지 않게 합니다.

## 안전장치로 CHECK 제약 추가

코드에서 조건을 빠뜨리는 경우를 대비해서 DB에도 제약을 걸어 두면 재고가 음수가 되는 상황을 막을 수 있습니다. Prisma schema는 CHECK 제약을 표현하지 못하므로 마이그레이션 SQL을 직접 작성합니다.

```sql
ALTER TABLE "Product" ADD CONSTRAINT product_stock_non_negative CHECK (stock >= 0);
```

한 상품에서 초당 수천 건 이상이 들어오면 단일 행 잠금 자체가 한계가 될 수 있습니다. 그때에는 Redis의 원자적 카운터로 재고를 먼저 선점하고 DB에 비동기로 반영하는 구조를 검토해야 하는데, 현재 규모를 알려 주시면 그 단계가 필요한지 함께 판단해 드리겠습니다.
