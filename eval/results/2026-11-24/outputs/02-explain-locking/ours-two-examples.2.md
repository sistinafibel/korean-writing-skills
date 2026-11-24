## 두 방식의 차이

**비관적 잠금**은 충돌이 일어난다고 가정하고 먼저 행을 잠급니다. PostgreSQL에서는 `SELECT ... FOR UPDATE`로 재고 행을 읽는 순간 잠금을 걸기 때문에, 같은 행을 읽으려는 다른 트랜잭션은 앞선 트랜잭션이 끝날 때까지 대기합니다. 충돌이 발생하지 않으므로 재시도 로직이 필요하지 않지만, 잠금을 오래 쥐고 있으면 대기 시간이 길어집니다.

**낙관적 잠금**은 충돌이 드물다고 가정하고 잠금 없이 진행합니다. 행에 `version` 컬럼을 두고 `UPDATE ... WHERE id = ? AND version = ?`로 갱신하며, 그 사이에 다른 트랜잭션이 먼저 수정했다면 갱신된 행이 0건이므로 충돌을 감지합니다. 충돌이 감지되면 처음부터 다시 읽고 시도해야 합니다.

| 구분 | 비관적 잠금 | 낙관적 잠금 |
|------|-------------|-------------|
| 충돌 처리 | 대기시킴 | 실패시킨 뒤 재시도 |
| 충돌이 드문 경우 | 잠금 비용이 불필요하게 듦 | 추가 비용이 거의 없음 |
| 충돌이 잦은 경우 | 대기열이 생겨도 모든 요청이 결국 성공 | 한 번에 한 건만 성공하고 나머지는 재시도하므로 낭비가 커짐 |
| Prisma 지원 | 원시 SQL 필요 | `version` 컬럼과 `updateMany`로 구현 가능 |

## 인기 상품에는 비관적 잠금 쪽이 맞습니다

같은 행에 요청이 몰리면 낙관적 잠금에서는 동시에 읽은 N개의 요청 가운데 1개만 성공하고 N-1개는 재시도합니다. 재시도한 요청끼리 또 충돌하므로 DB 부하는 늘어나는데 처리량은 늘지 않고, 재시도 횟수 제한에 걸린 주문은 재고가 남아 있어도 실패합니다.

다만 이 문제에는 두 방식보다 더 적합한 방법이 있습니다. 재고 확인과 차감을 하나의 조건부 `UPDATE`로 처리하면 읽기와 쓰기 사이의 틈이 없어지므로, 별도의 `FOR UPDATE`나 `version` 컬럼이 필요하지 않습니다. PostgreSQL은 이 `UPDATE`를 실행하는 동안에만 행 잠금을 잡기 때문에 비관적 잠금의 장점(재시도 없음)을 얻으면서 잠금 시간은 가장 짧게 유지됩니다.

### Prisma 구현

Prisma의 `updateMany`는 조건과 감소를 한 SQL 문으로 보내므로 원시 SQL 없이도 구현할 수 있습니다.

```ts
const { count } = await prisma.product.updateMany({
  where: { id: productId, stock: { gte: quantity } },
  data: { stock: { decrement: quantity } },
});

if (count === 0) {
  throw new Error('재고가 부족합니다');
}
```

이 코드는 `UPDATE "Product" SET stock = stock - $1 WHERE id = $2 AND stock >= $1`로 실행됩니다. 먼저 도착한 요청이 행 잠금을 잡으면 나머지는 잠깐 대기했다가, 갱신된 재고 값으로 `WHERE` 조건을 다시 평가합니다(READ COMMITTED 기본 격리 수준 기준). 그래서 재고가 모자란 요청은 `count`가 0이 되어 자연스럽게 실패합니다.

주의할 점은 `update`에 `decrement`만 쓰면 원자적이기는 해도 하한을 검사하지 않아 재고가 음수가 된다는 것입니다. 반드시 `where`에 `stock: { gte: quantity }` 조건을 함께 넣어야 합니다.

### 안전장치와 주의 사항

- DB에 `CHECK (stock >= 0)` 제약을 추가하면 코드에 실수가 있어도 음수 재고가 저장되지 않습니다. Prisma 스키마에서는 지원하지 않으므로 마이그레이션 SQL에 직접 작성해야 합니다.
- 재고 차감과 주문 생성은 `prisma.$transaction`으로 묶되, 결제 API 호출 같은 외부 통신은 트랜잭션 밖에서 처리해야 합니다. 트랜잭션 안에서 외부 호출을 기다리면 행 잠금이 그 시간만큼 유지되어 인기 상품의 처리량이 크게 떨어집니다.
- 한 주문에 여러 상품이 있다면 상품 ID 순서로 차감해야 합니다. 트랜잭션마다 잠그는 순서가 다르면 데드락이 발생할 수 있습니다.

### 재고 확인 후 다른 로직이 필요한 경우

재고를 읽은 뒤 애플리케이션에서 복잡한 판단을 해야 해서 조건부 `UPDATE`로 표현할 수 없다면, 비관적 잠금을 선택하는 것이 맞습니다. Prisma는 `FOR UPDATE`를 지원하지 않으므로 원시 쿼리를 사용합니다.

```ts
await prisma.$transaction(async (tx) => {
  const [product] = await tx.$queryRaw<{ stock: number }[]>`
    SELECT stock FROM "Product" WHERE id = ${productId} FOR UPDATE
  `;
  if (product.stock < quantity) throw new Error('재고가 부족합니다');

  await tx.product.update({
    where: { id: productId },
    data: { stock: { decrement: quantity } },
  });
});
```

낙관적 잠금은 상품 정보 편집처럼 여러 사용자가 같은 행을 동시에 수정할 가능성이 낮은 곳에 적합하므로, 재고 차감에는 쓰지 않는 편이 좋습니다.
