## 결론

인기 상품에 주문이 몰리는 쇼핑몰에는 **비관적 잠금 방식**이 적합합니다. 다만 Prisma에서는 `SELECT ... FOR UPDATE`를 직접 쓰는 것보다 **조건부 원자적 UPDATE**로 같은 효과를 얻는 편이 간단하고 안전합니다. 이 방식은 행 잠금을 UPDATE 한 번 안에서 처리하므로, 엄밀히 말하면 비관적 잠금의 한 형태입니다.

## 두 방식의 차이

**낙관적 잠금**은 잠금을 걸지 않고, 행에 `version` 같은 필드를 두어 충돌을 나중에 감지합니다. 재고를 읽은 뒤 `version`이 같은 경우에만 갱신하고, 실패하면 다시 시도합니다. 충돌이 드문 상황에서는 효율적입니다. 그러나 인기 상품처럼 동시 요청이 많으면 대부분의 요청이 실패하고 재시도가 연쇄적으로 발생해서 오히려 DB 부하가 커집니다.

**비관적 잠금**은 행을 읽는 시점에 잠금을 걸어 다른 트랜잭션이 기다리게 합니다. 충돌을 미리 막으므로 재시도가 필요 없습니다. 대신 잠금을 오래 쥐고 있으면 대기가 길어지므로, 트랜잭션을 짧게 유지해야 합니다.

| 구분 | 낙관적 잠금 | 비관적 잠금 |
|---|---|---|
| 충돌 처리 | 나중에 감지하고 재시도 | 미리 막고 대기 |
| 충돌이 잦을 때 | 재시도가 쌓여 비효율적 | 대기 시간이 늘지만 정합성 유지 |
| 구현 난이도 | 재시도 로직이 필요함 | 상대적으로 단순함 |

## Prisma 구현 방법

### 1. 조건부 원자적 UPDATE (권장)

재고가 충분한 경우에만 차감하도록 WHERE 조건에 포함합니다. PostgreSQL은 UPDATE 시 행을 잠그고, 대기 후에도 조건을 다시 평가하므로 음수가 되지 않습니다.

```ts
const result = await prisma.product.updateMany({
  where: {
    id: productId,
    stock: { gte: quantity },
  },
  data: {
    stock: { decrement: quantity },
  },
});

if (result.count === 0) {
  throw new Error('재고가 부족합니다.');
}
```

`result.count`가 0이면 차감된 행이 없다는 뜻이므로, 재고 부족으로 처리합니다.

### 2. 명시적 비관적 잠금

주문 처리 중에 재고를 읽고 검증한 뒤 다른 로직과 함께 처리해야 한다면, 트랜잭션 안에서 `FOR UPDATE`를 사용합니다.

```ts
await prisma.$transaction(async (tx) => {
  const [product] = await tx.$queryRaw<{ stock: number }[]>`
    SELECT stock FROM "Product" WHERE id = ${productId} FOR UPDATE
  `;

  if (!product || product.stock < quantity) {
    throw new Error('재고가 부족합니다.');
  }

  await tx.product.update({
    where: { id: productId },
    data: { stock: { decrement: quantity } },
  });

  // 주문 생성 등 같은 트랜잭션에서 처리할 작업을 이어서 수행합니다.
});
```

트랜잭션 안에서 외부 API 호출처럼 시간이 오래 걸리는 작업은 넣지 않는 것이 좋습니다. 잠금 시간이 늘어나 대기가 길어집니다.

### 3. 최후의 안전장치

애플리케이션 로직과 별개로 DB 수준에서 음수를 막아 두는 것이 좋습니다. Prisma 스키마로는 CHECK 제약을 표현할 수 없으므로 마이그레이션 SQL에 직접 추가합니다.

```sql
ALTER TABLE "Product" ADD CONSTRAINT stock_non_negative CHECK (stock >= 0);
```

## 추가로 고려할 점

- **트랜잭션 범위**: 재고 차감과 주문 생성을 같은 트랜잭션에 묶어야 한쪽만 성공하는 상황을 막을 수 있습니다.
- **결제 흐름**: 결제 완료 시점에 차감하면 결제 실패나 이탈로 재고가 묶이는 문제가 생깁니다. 주문 접수 시점에 임시 점유를 하고, 결제 실패 시 복구하는 구조도 함께 검토해 보세요.
- **초고트래픽**: 한 상품에 초당 수천 건 이상이 몰리면 DB 행 하나가 병목이 됩니다. 이때는 Redis의 원자적 카운터로 먼저 차감하고 DB에 비동기로 반영하는 방식이나, 대기열을 두는 방식을 고려할 수 있습니다.

우선은 1번 방식으로 구현하고 CHECK 제약을 함께 추가하는 것을 권합니다. 그 뒤 부하 테스트로 병목을 확인하면서 구조를 키워 가시면 됩니다.
