## 두 방식의 차이

**낙관적 잠금**은 충돌이 드물다고 가정하고 잠금 없이 작업을 진행합니다. 갱신하는 시점에 다른 트랜잭션이 먼저 데이터를 변경했는지 확인하며, 변경되었다면 갱신을 실패시키고 재시도합니다. 보통 `version` 컬럼을 두고 `WHERE id = ? AND version = ?` 조건으로 갱신합니다.

**비관적 잠금**은 충돌이 자주 발생한다고 가정하고 읽는 시점에 행을 잠급니다. PostgreSQL에서는 `SELECT ... FOR UPDATE`를 사용하며, 같은 행에 접근하는 다른 트랜잭션은 첫 트랜잭션이 끝날 때까지 대기합니다.

| 구분 | 낙관적 잠금 | 비관적 잠금 |
|---|---|---|
| 충돌 처리 | 실패 후 재시도 | 대기 후 순차 처리 |
| 충돌이 적을 때 | 유리함 | 불필요한 잠금 비용이 발생함 |
| 충돌이 잦을 때 | 재시도가 폭증하여 불리함 | 안정적으로 동작함 |
| 구현 복잡도 | 재시도 로직이 필요함 | 트랜잭션 관리가 필요함 |

## 인기 상품에는 어느 쪽이 맞는가

인기 상품에는 **비관적 방식이 맞습니다.** 같은 행에 동시 요청이 집중되면 낙관적 잠금에서는 요청 하나만 성공하고 나머지가 모두 실패하여 재시도하게 됩니다. 이 과정에서 DB 부하가 오히려 커지고, 재시도 한도를 넘긴 주문은 재고가 남아 있는데도 실패할 수 있습니다.

다만 실무에서 가장 권장하는 방식은 `SELECT ... FOR UPDATE`가 아니라 **조건부 원자적 UPDATE**입니다. 행 잠금은 `UPDATE` 실행 중에 DB가 자동으로 획득하므로 비관적 방식의 장점을 그대로 얻으면서, 조회와 갱신을 한 번에 처리하여 잠금 유지 시간이 최소화됩니다.

```ts
const result = await prisma.product.updateMany({
  where: { id: productId, stock: { gte: quantity } },
  data: { stock: { decrement: quantity } },
});

if (result.count === 0) {
  throw new Error('재고가 부족합니다.');
}
```

이 코드는 다음 SQL로 실행됩니다.

```sql
UPDATE "Product" SET stock = stock - $1
WHERE id = $2 AND stock >= $1;
```

`stock >= quantity` 조건이 갱신과 동시에 평가되므로 재고가 음수가 될 수 없습니다. 영향받은 행이 0개라면 재고 부족으로 판단하면 됩니다. 주문 생성과 재고 차감을 하나의 원자적 작업으로 묶어야 한다면 `prisma.$transaction` 안에서 실행하십시오.

## 명시적으로 잠금이 필요한 경우

차감 전에 재고 외의 다른 값을 읽고 복잡한 판단을 해야 한다면 `FOR UPDATE`가 필요합니다. Prisma는 이를 지원하지 않으므로 raw query를 사용해야 합니다.

```ts
await prisma.$transaction(async (tx) => {
  const [row] = await tx.$queryRaw<{ stock: number }[]>`
    SELECT stock FROM "Product" WHERE id = ${productId} FOR UPDATE`;
  if (row.stock < quantity) throw new Error('재고가 부족합니다.');
  await tx.product.update({
    where: { id: productId },
    data: { stock: { decrement: quantity } },
  });
});
```

이때는 트랜잭션 안에서 외부 API 호출 같은 느린 작업을 하지 않아야 합니다. 잠금 유지 시간이 길어지면 대기 요청이 쌓이기 때문입니다.

## 추가로 권장하는 사항

- **CHECK 제약 추가**: `CHECK (stock >= 0)`을 걸면 코드에 실수가 있어도 DB가 음수 재고를 거부합니다. Prisma 스키마는 CHECK 제약을 표현하지 못하므로 마이그레이션 SQL을 직접 수정하여 추가해야 합니다.
- **격리 수준 유지**: 위 방식은 기본 격리 수준인 `READ COMMITTED`에서 정확하게 동작하므로, `SERIALIZABLE`로 올릴 필요가 없습니다.
- **단일 행의 처리량 한계 인지**: 한 상품 행에 대한 갱신은 순차적으로 처리됩니다. 초당 수천 건 이상이 같은 상품에 몰리는 선착순 판매라면, Redis에서 `DECR`로 재고를 먼저 차감하고 DB에는 비동기로 반영하거나, 대기열을 도입하는 구조를 검토해야 합니다.

## 결론

일반적인 쇼핑몰의 인기 상품에는 낙관적 잠금보다 **조건부 원자적 UPDATE**(사실상 짧게 유지되는 비관적 잠금)를 사용하시기 바랍니다. 구현이 가장 간단하고 충돌이 많은 상황에서도 안정적이며, CHECK 제약과 함께 쓰면 음수 재고를 이중으로 방지할 수 있습니다.
