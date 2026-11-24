---
id: 12-pr-fix-cart-quantity
category: PR 제목과 본문
kind: pr
title: 장바구니 수량을 빠르게 누르면 합계가 틀리는 버그 수정의 PR
deploy: absent
---
아래 상황 설명과 diff 를 보고 PR 제목과 본문을 한국어로 써 주세요. 첫 줄에 PR 제목만 쓰고, 한 줄을 비운 뒤 본문을 Markdown 으로 씁니다. 다른 설명이나 바깥을 감싸는 코드 블록 표시는 붙이지 마세요.

상황 설명:
- 쇼핑몰 웹의 장바구니 화면입니다. 수량 + 버튼을 빠르게 두 번 누르면 화면의 수량은 3인데 합계 금액은 2개 값으로 남는 일이 있다는 제보가 QA 에서 들어왔습니다 (이슈 #131).
- 원인: 버튼을 누를 때마다 PATCH /cart/items/:id 요청을 보내고 응답으로 받은 장바구니로 화면을 덮어씁니다. 첫 번째 요청의 응답이 두 번째 요청의 응답보다 늦게 오면, 늦게 온 예전 응답이 화면을 덮어썼습니다.
- 고친 방법: 수량을 바꿀 때마다 이전 요청을 AbortController 로 취소하고, 응답에 들어 있는 장바구니 version 이 화면이 가진 version 보다 낮으면 버립니다. 서버는 바꾸지 않았습니다 (version 필드는 원래 응답에 있었습니다).
- DB 변경, 환경 변수 변경, 배포 순서 제약은 없습니다.
- 확인한 것: Playwright E2E 를 4개 새로 썼고 (응답 순서를 뒤집는 경우 포함) 전체 E2E 212개가 통과했습니다. 크롬에서 네트워크를 Slow 3G 로 낮추고 20번 눌러 봤는데 합계가 맞았습니다.
- 확인하지 못한 것: iOS 사파리. 테스트 기기가 없었습니다.

```diff
diff --git a/web/src/features/cart/useCartQuantity.ts b/web/src/features/cart/useCartQuantity.ts
index 4b1a9e0..e2d5c3f 100644
--- a/web/src/features/cart/useCartQuantity.ts
+++ b/web/src/features/cart/useCartQuantity.ts
@@ -8,13 +8,24 @@ import { patchCartItem } from './cart.api';
 export function useCartQuantity(itemId: string) {
   const { cart, setCart } = useCartStore();
+  const pending = useRef<AbortController | null>(null);
 
   const change = useCallback(
     async (quantity: number) => {
-      const next = await patchCartItem(itemId, { quantity });
-      setCart(next);
+      pending.current?.abort();
+      const controller = new AbortController();
+      pending.current = controller;
+
+      try {
+        const next = await patchCartItem(itemId, { quantity }, { signal: controller.signal });
+        // 늦게 도착한 예전 응답이 최신 상태를 덮어쓰지 않게 한다
+        setCart((current) => (next.version >= current.version ? next : current));
+      } catch (error) {
+        if (isAbortError(error)) return;
+        throw error;
+      }
     },
     [itemId, setCart],
   );
 
   return { quantity: cart.items[itemId]?.quantity ?? 0, change };
diff --git a/web/e2e/cart-quantity.spec.ts b/web/e2e/cart-quantity.spec.ts
new file mode 100644
--- /dev/null
+++ b/web/e2e/cart-quantity.spec.ts
@@ -0,0 +1,64 @@
+test('수량을 빠르게 두 번 올려도 합계가 맞다', ...);
+test('첫 번째 응답이 두 번째 응답보다 늦게 와도 합계가 맞다', ...);
+test('수량을 올렸다가 바로 내려도 합계가 맞다', ...);
+test('요청이 실패하면 수량을 이전 값으로 되돌리고 오류를 보여 준다', ...);
```
