## 원인: 읽기 후 쓰기(read-then-write) 경쟁

재고가 음수가 되는 전형적인 원인은 아래와 같은 코드입니다.

```ts
const product = await prisma.product.findUnique({ where: { id } });
if (product.stock >= qty) {
  await prisma.product.update({
    where: { id },
    data: { stock: product.stock - qty },
  });
}
```

두 요청이 동시에 `stock = 1`을 읽으면 둘 다 검사를 통과하고, 둘 다 쓰기를 수행해 결과적으로 재고가 -1이 될 수 있습니다. 이 문제는 잠금 방식을 고르기 전에 **검사와 차감을 하나의 원자적 연산으로 묶어야** 해결됩니다.

## 두 방식의 차이

| 구분 | 비관적 잠금 (Pessimistic) | 낙관적 잠금 (Optimistic) |
|---|---|---|
| 기본 가정 | 충돌이 자주 일어난다 | 충돌이 드물다 |
| 방법 | 읽을 때 행을 잠근다 (`SELECT ... FOR UPDATE`) | 잠그지 않고 `version` 컬럼으로 변경 여부를 확인한다 |
| 충돌 시 | 다른 트랜잭션이 대기한다 | 업데이트 실패 후 재시도한다 |
| 장점 | 충돌이 많아도 재시도가 없고 결과가 확실하다 | 잠금 대기가 없어 충돌이 적을 때 처리량이 높다 |
| 단점 | 잠금 대기가 길어지고 데드락 가능성이 있다 | 인기 상품에서는 재시도가 폭증해 실패가 많아진다 |

## 인기 상품 쇼핑몰에는 비관적 계열이 맞습니다

낙관적 잠금은 충돌이 드물 때 유리합니다. 인기 상품에 주문이 몰리면 동시에 같은 행을 수정하려는 요청이 많아지고, 대부분이 실패 후 재시도하게 됩니다. 재시도가 다시 충돌을 부르는 악순환이 생기고, 사용자는 "재고 부족"이라는 오류를 자주 보게 됩니다.

다만 **명시적인 `FOR UPDATE`보다는 조건부 원자 UPDATE**를 쓰는 것을 권장합니다. 이 방식도 UPDATE 과정에서 행 잠금을 잡기 때문에 비관적 잠금과 같은 효과를 내면서, 잠금을 짧게 유지하고 코드도 단순합니다.

```ts
// 재고가 충분할 때만 차감. 영향받은 행 수로 성공 여부를 판단한다.
const result = await prisma.product.updateMany({
  where: {
    id: productId,
    stock: { gte: qty },   // 검사와 차감이 한 SQL 문장에서 함께 일어난다
  },
  data: {
    stock: { decrement: qty },
  },
});

if (result.count === 0) {
  throw new Error('재고 부족');
}
```

생성되는 SQL은 `UPDATE products SET stock = stock - $1 WHERE id = $2 AND stock >= $3` 형태입니다. PostgreSQL은 행 잠금을 기다린 뒤 WHERE 조건을 다시 평가하므로 Read Committed 격리 수준에서도 안전합니다.

## 추가로 적용할 것

**1. DB 레벨 안전장치**
애플리케이션 코드에 버그가 생겨도 음수 재고가 저장되지 않도록 CHECK 제약을 추가합니다. Prisma 마이그레이션 파일에 직접 작성하면 됩니다.

```sql
ALTER TABLE "Product" ADD CONSTRAINT stock_non_negative CHECK (stock >= 0);
```

**2. 여러 상품을 한 주문에 담는 경우**
트랜잭션 안에서 상품 ID를 정렬한 순서대로 차감해야 데드락을 줄일 수 있습니다. 하나라도 실패하면 예외를 던져 전체를 롤백합니다.

```ts
await prisma.$transaction(async (tx) => {
  const sorted = [...items].sort((a, b) => a.productId.localeCompare(b.productId));
  for (const item of sorted) {
    const r = await tx.product.updateMany({
      where: { id: item.productId, stock: { gte: item.qty } },
      data: { stock: { decrement: item.qty } },
    });
    if (r.count === 0) throw new Error(`재고 부족: ${item.productId}`);
  }
  // 주문 생성 로직 ...
});
```

**3. 트랜잭션은 짧게 유지**
외부 API 호출이나 결제 처리를 트랜잭션 안에 넣으면 잠금 시간이 길어집니다. 재고 차감만 트랜잭션으로 묶고, 결제는 그 뒤에 처리하거나 재고를 "예약" 상태로 두었다가 결제 완료 시 확정하는 방식을 검토하세요.

**4. 트래픽이 매우 많다면**
아주 짧은 시간에 수천 건이 몰리는 한정 판매라면 DB 행 잠금 자체가 병목이 됩니다. 이때는 Redis의 원자 연산으로 재고를 먼저 차감하거나 대기열을 두는 구조를 고려하세요.

## 정리

- 음수 재고의 원인은 읽기와 쓰기가 분리된 코드입니다.
- 인기 상품에는 낙관적 잠금보다 **조건부 원자 UPDATE(비관적 계열)** 가 적합합니다.
- Prisma에서는 `updateMany`에 `stock: { gte: qty }` 조건과 `decrement`를 함께 쓰고, `count`로 성공 여부를 확인하세요.
- CHECK 제약으로 DB에서도 음수를 막아 두면 더 안전합니다.
