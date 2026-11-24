## 재고가 음수가 되는 원인

재고를 조회한 뒤 애플리케이션에서 `stock >= quantity`를 확인하고 나중에 차감하면, 두 요청이 같은 재고 값을 읽고 둘 다 검증을 통과할 수 있습니다. PostgreSQL의 기본 격리 수준인 READ COMMITTED에서는 이런 경쟁 상태를 막아 주지 않습니다. 두 방식은 이 경쟁을 막는 시점이 서로 다릅니다.

## 두 방식의 차이

| | 낙관적 잠금 | 비관적 잠금 |
|---|---|---|
| 전제 | 충돌이 드물다 | 충돌이 잦다 |
| 동작 | 잠그지 않고 읽은 뒤 `version`이 그대로일 때만 갱신 | 읽는 시점에 행을 잠가 다른 트랜잭션을 대기시킴 |
| 충돌 시 | 갱신된 행이 0건이므로 애플리케이션이 재시도 | 먼저 잠근 트랜잭션이 끝날 때까지 대기 |
| 비용 | 충돌이 많으면 재시도가 늘어 DB 부하가 커짐 | 트랜잭션이 길면 대기 시간이 늘고 교착 상태 위험이 생김 |

Prisma에는 낙관적 잠금 기능이 내장되어 있지 않아서 `version` 컬럼을 직접 만들고 `updateMany`로 조건을 걸어야 합니다.

```ts
// 낙관적 잠금: 읽은 version과 같을 때만 갱신
const result = await prisma.inventory.updateMany({
  where: { productId, version: current.version, stock: { gte: quantity } },
  data: { stock: { decrement: quantity }, version: { increment: 1 } },
});
if (result.count === 0) {
  // 다른 요청이 먼저 갱신했거나 재고가 부족한 상태이므로 다시 조회해서 재시도
}
```

비관적 잠금은 인터랙티브 트랜잭션 안에서 `SELECT ... FOR UPDATE`를 사용해야 하며, Prisma 클라이언트의 기본 메서드로는 표현할 수 없어서 `$queryRaw`가 필요합니다.

```ts
await prisma.$transaction(async (tx) => {
  const [row] = await tx.$queryRaw<{ stock: number }[]>`
    SELECT stock FROM inventory WHERE product_id = ${productId} FOR UPDATE`;
  if (!row || row.stock < quantity) throw new SoldOutError();

  await tx.inventory.update({
    where: { productId },
    data: { stock: { decrement: quantity } },
  });
});
```

## 인기 상품에는 어느 쪽이 맞는가

인기 상품에는 낙관적 잠금이 맞지 않습니다. 같은 행에 요청이 몰리면 한 번에 한 요청만 성공하고 나머지는 모두 실패해서 재시도하므로, 재시도 요청이 다시 서로 충돌하면서 DB 부하가 요청 수보다 빠르게 늘어납니다.

비관적 잠금은 요청을 한 줄로 세워 순서대로 처리하므로 몰리는 상황에서도 동작이 예측 가능합니다. 다만 잠금을 잡은 채로 결제 API 호출 같은 외부 작업을 하면 대기열이 길어지므로, 트랜잭션 안에서는 재고 확인과 차감만 수행해야 합니다.

## 더 간단한 방법: 조건부 원자적 UPDATE

재고 차감만 필요하다면 잠금 방식을 고르지 않고 검증과 차감을 SQL 한 문장으로 합치는 편이 가장 간단합니다. PostgreSQL이 UPDATE 중에 행 잠금을 자동으로 잡으므로, 조건 검사와 차감이 한 번에 이루어집니다.

```ts
const result = await prisma.inventory.updateMany({
  where: { productId, stock: { gte: quantity } },
  data: { stock: { decrement: quantity } },
});
if (result.count === 0) throw new SoldOutError(); // 품절 또는 재고 부족
```

이 방식은 별도의 `version` 컬럼이 필요 없고 트랜잭션도 짧게 유지됩니다. 재고 확인 후 쿠폰 검증처럼 읽은 값에 따라 분기하는 로직이 길게 이어질 때에만 `FOR UPDATE`를 사용하면 됩니다.

## 함께 적용할 사항

- **CHECK 제약**: `ALTER TABLE inventory ADD CONSTRAINT stock_non_negative CHECK (stock >= 0);`를 추가하면 애플리케이션 코드에 버그가 있어도 DB가 음수 재고를 거부합니다.
- **단일 행 병목**: 한 상품에 초당 수천 건 이상 몰리는 수준이라면 행 잠금 대기가 병목이 됩니다. 이때는 Redis에서 `DECR`로 재고를 먼저 차감하고 DB에 비동기로 반영하는 구조나, 재고를 여러 행으로 나누는 방식을 검토해야 합니다. 일반적인 쇼핑몰 규모에서는 위의 조건부 UPDATE로 충분한 경우가 많습니다.
