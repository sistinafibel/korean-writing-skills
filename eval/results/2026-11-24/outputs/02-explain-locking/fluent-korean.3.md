## 문제의 원인

PostgreSQL의 기본 격리 수준은 READ COMMITTED입니다. 재고를 조회한 뒤 애플리케이션에서 계산하고 다시 저장하는 구조라면, 두 요청이 같은 재고 값을 동시에 읽은 상태에서 각자 차감하게 됩니다. 그 결과 재고가 음수가 됩니다. 이 문제는 "조회 후 갱신"이라는 두 단계를 하나의 원자적 연산으로 합쳐야 해결됩니다.

## 두 방식의 차이

| 구분 | 낙관적 잠금 | 비관적 잠금 |
|---|---|---|
| 전제 | 충돌이 드물다고 가정합니다. | 충돌이 자주 발생한다고 가정합니다. |
| 동작 | 잠금 없이 읽고, 갱신 시점에 `version` 값이 바뀌었는지 확인합니다. | 읽는 시점에 `SELECT ... FOR UPDATE`로 행을 잠그고, 트랜잭션이 끝날 때까지 다른 요청을 대기시킵니다. |
| 충돌 시 | 갱신이 실패하므로 재시도해야 합니다. | 대기한 뒤 순서대로 처리됩니다. |
| 장점 | 잠금 대기가 없고, 충돌이 적으면 처리량이 높습니다. | 구현이 단순하고, 재시도 로직이 필요하지 않습니다. |
| 단점 | 충돌이 많으면 실패와 재시도가 급증하여 오히려 성능이 떨어집니다. | 트랜잭션이 길어지면 대기 시간이 늘어나고, 교착 상태 위험이 생깁니다. |

## 인기 상품에는 어느 쪽이 맞는가

**비관적 잠금 계열이 적합합니다.** 인기 상품에는 같은 행에 요청이 집중되므로 충돌 확률이 매우 높습니다. 낙관적 잠금을 쓰면 대부분의 요청이 버전 불일치로 실패하고, 재시도가 다시 부하를 만들어 처리량이 크게 떨어집니다.

다만 실무에서 가장 권장하는 방식은 둘 중 어느 쪽도 아닌 **조건부 원자적 UPDATE**입니다. 조회 없이 갱신 문장 하나로 검사와 차감을 동시에 수행하며, 행 잠금은 해당 문장이 실행되는 짧은 시간에만 유지됩니다.

```ts
const result = await prisma.product.updateMany({
  where: { id: productId, stock: { gte: quantity } },
  data: { stock: { decrement: quantity } },
});

if (result.count === 0) {
  throw new Error('재고가 부족합니다');
}
```

PostgreSQL에서는 이 문장이 `UPDATE ... SET stock = stock - $1 WHERE id = $2 AND stock >= $1`로 실행됩니다. 동시 요청은 행 잠금 때문에 순서대로 처리되고, 재고가 부족해진 시점부터는 `count`가 0으로 반환됩니다.

## Prisma에서의 구현 방법

**1. 조건부 원자적 UPDATE (권장)**

위의 코드를 그대로 사용하면 됩니다. 주문 생성과 재고 차감을 한 번에 묶어야 한다면 `prisma.$transaction` 안에서 실행하십시오.

**2. 비관적 잠금 (조회한 재고 값으로 다른 로직을 수행해야 할 때)**

Prisma는 `FOR UPDATE`를 기본 API로 지원하지 않으므로 `$queryRaw`를 사용해야 합니다.

```ts
await prisma.$transaction(async (tx) => {
  const rows = await tx.$queryRaw<{ stock: number }[]>`
    SELECT stock FROM "Product" WHERE id = ${productId} FOR UPDATE
  `;
  if (rows.length === 0 || rows[0].stock < quantity) {
    throw new Error('재고가 부족합니다');
  }
  await tx.product.update({
    where: { id: productId },
    data: { stock: { decrement: quantity } },
  });
});
```

**3. 낙관적 잠금 (충돌이 드문 일반 상품용)**

모델에 `version Int @default(0)` 필드를 추가한 뒤 사용합니다.

```ts
const product = await prisma.product.findUniqueOrThrow({ where: { id: productId } });
if (product.stock < quantity) throw new Error('재고가 부족합니다');

const result = await prisma.product.updateMany({
  where: { id: productId, version: product.version },
  data: { stock: { decrement: quantity }, version: { increment: 1 } },
});
if (result.count === 0) {
  // 다른 요청이 먼저 갱신했으므로 처음부터 재시도해야 합니다.
}
```

## 추가로 권장하는 사항

- **DB 제약 조건 추가**: 애플리케이션 로직에 결함이 있더라도 음수 재고를 차단하도록, 마이그레이션에 `ALTER TABLE "Product" ADD CONSTRAINT stock_non_negative CHECK (stock >= 0);`를 직접 추가하는 것이 좋습니다.
- **트랜잭션을 짧게 유지**: 비관적 잠금을 쓴다면 잠금을 보유한 상태에서 결제 API 호출 같은 외부 통신을 수행하지 마십시오. 대기 시간이 급격히 늘어납니다.
- **초대형 트래픽 대응**: 한정 수량 특가처럼 단일 행에 초당 수천 건이 몰리는 경우에는 DB 행 하나가 처리 한계가 됩니다. 이때는 Redis에서 재고를 선차감하고 DB에는 비동기로 반영하거나, 재고를 여러 행으로 분할하는 구조를 검토해야 합니다.

## 결론

인기 상품 중심의 쇼핑몰이라면 **조건부 원자적 UPDATE를 기본으로 사용하고**, 재고 값을 읽고 추가 판단이 필요한 경우에만 `FOR UPDATE` 기반 비관적 잠금을 쓰는 것이 적합합니다. 낙관적 잠금은 충돌이 드문 데이터에 한정해서 사용하십시오.
