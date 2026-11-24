결론부터 말씀드리면 인기 상품에 주문이 몰리는 쇼핑몰에서는 낙관적 잠금이 맞지 않습니다. 비관적 잠금을 쓰거나, 그보다 간단하게 조건부 UPDATE 한 문장으로 차감하는 방식이 적합합니다.

## 두 방식의 차이

| | 비관적 잠금 | 낙관적 잠금 |
|---|---|---|
| 전제 | 충돌이 자주 일어난다고 가정함 | 충돌이 드물다고 가정함 |
| 방법 | 읽을 때 `SELECT ... FOR UPDATE` 로 행을 잠금 | 잠그지 않고 읽은 뒤 `version` 컬럼으로 충돌을 감지함 |
| 충돌 시 | 나중 요청이 앞선 트랜잭션이 끝날 때까지 대기함 | 수정된 행이 0개이므로 다시 읽어서 재시도함 |
| 부담 | 잠금을 오래 쥘수록 대기열이 길어짐 | 충돌이 잦을수록 재시도가 늘어남 |

낙관적 잠금은 `UPDATE ... WHERE id = ? AND version = ?` 의 결과로 충돌 여부를 판단합니다. 대기가 없어서 충돌이 드문 데이터에는 빠르지만, 같은 행에 요청이 몰리면 대부분의 요청이 실패하고 재시도합니다.

## 인기 상품에서의 선택

100명이 같은 상품을 동시에 주문하면 낙관적 잠금에서는 같은 `version` 을 읽은 100개 요청 중 1개만 성공합니다. 나머지 99개가 재시도해도 같은 일이 반복되므로 DB 요청이 크게 늘어나고 일부 주문은 재시도 한도를 넘겨 실패합니다.

비관적 잠금은 요청이 순서대로 처리되어 결과가 정확합니다. 다만 트랜잭션 안에서 결제 API 호출처럼 느린 작업을 하면 그동안 같은 상품의 모든 주문이 대기하므로, 재고 차감 트랜잭션은 짧게 유지해야 합니다.

재고 차감은 읽고 계산한 뒤 쓰는 과정이 없어도 되므로, 조건부 UPDATE 로 한 번에 처리하는 방식을 권합니다. PostgreSQL 은 UPDATE 가 실행되는 동안 해당 행에 잠금을 잡고, 대기하던 요청은 앞선 요청이 커밋된 뒤의 최신 값으로 조건을 다시 평가합니다. 그래서 재고가 모자라면 조건에 맞는 행이 없어서 수정이 일어나지 않습니다.

```ts
const result = await prisma.product.updateMany({
  where: { id: productId, stock: { gte: quantity } },
  data: { stock: { decrement: quantity } },
});

if (result.count === 0) {
  throw new OutOfStockError();
}
```

`count` 가 0이면 재고 부족이므로 품절로 응답하면 됩니다. 재시도 코드도 필요하지 않습니다.

여기에 안전장치로 DB 제약을 추가하면 다른 코드 경로에서 실수가 생겨도 재고가 음수가 되지 않습니다. Prisma 스키마는 CHECK 제약을 표현하지 못하므로 마이그레이션 SQL 에 직접 작성해야 합니다.

```sql
ALTER TABLE "Product" ADD CONSTRAINT stock_non_negative CHECK (stock >= 0);
```

## 비관적 잠금이 필요한 경우

재고를 읽은 값에 따라 분기해야 하거나 여러 테이블을 함께 수정해야 한다면 `FOR UPDATE` 를 사용합니다. Prisma 는 이 구문을 기본 API 로 제공하지 않으므로 인터랙티브 트랜잭션 안에서 `$queryRaw` 를 사용합니다.

```ts
await prisma.$transaction(async (tx) => {
  const [row] = await tx.$queryRaw<{ stock: number }[]>`
    SELECT stock FROM "Product" WHERE id = ${productId} FOR UPDATE
  `;
  if (!row || row.stock < quantity) throw new OutOfStockError();

  await tx.product.update({
    where: { id: productId },
    data: { stock: { decrement: quantity } },
  });
});
```

한 주문에서 여러 상품을 잠글 때는 상품 id 오름차순으로 잠가야 서로 반대 순서로 잠그다가 생기는 데드락을 피할 수 있습니다.

## 그 밖에 주의할 점

- 결제 승인 같은 외부 호출은 재고 차감 트랜잭션 밖에서 수행하고, 결제에 실패하면 재고를 복구하는 보상 로직을 둡니다.
- 한 행에 초당 수천 건이 몰리는 수준이라면 행 잠금 자체가 병목이 됩니다. 이때는 Redis 에서 먼저 재고를 차감하거나 주문을 큐로 직렬화하는 구조를 검토해야 합니다.

현재 차감 로직에서 재고 확인과 차감이 별도 쿼리로 나뉘어 있다면 그 부분이 음수 재고의 직접적인 원인일 가능성이 높습니다. 코드를 보여주시면 위 방식으로 어떻게 바꿀지 구체적으로 알려드리겠습니다.
