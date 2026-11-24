---
id: 09-commit-fix-coupon-timezone
category: 커밋 메시지
kind: commit
title: 만료된 쿠폰이 사용되던 시간대 버그 수정의 커밋 메시지
---
아래 상황과 diff 를 보고 커밋 메시지를 한국어로 써 주세요. 커밋 메시지만 출력하고, 다른 설명이나 코드 블록 표시는 붙이지 마세요.

상황: 고객센터에 "어제 만료된 쿠폰이 오늘 아침에 사용됐다"는 문의가 3건 들어와서 확인했습니다. 이슈 번호는 #214 입니다.

```diff
diff --git a/src/coupons/coupon.service.ts b/src/coupons/coupon.service.ts
index 3f2a1c7..9be04d2 100644
--- a/src/coupons/coupon.service.ts
+++ b/src/coupons/coupon.service.ts
@@ -1,4 +1,5 @@
 import { Injectable } from '@nestjs/common';
+import { formatInTimeZone } from 'date-fns-tz';
 import { CouponRepository } from './coupon.repository';
 import { CouponExpiredError, CouponNotFoundError } from './coupon.errors';
 
@@ -41,8 +42,10 @@ export class CouponService {
     const coupon = await this.coupons.findByCode(code);
     if (!coupon) throw new CouponNotFoundError(code);
 
-    const today = new Date().toISOString().slice(0, 10);
-    if (coupon.expiresOn < today) {
+    // expiresOn 은 한국 시간 기준 날짜(YYYY-MM-DD)다. UTC 날짜와 비교하면
+    // 한국 시간 00:00~08:59 에는 전날 날짜가 나와서 만료된 쿠폰이 통과한다.
+    const todayInSeoul = formatInTimeZone(new Date(), 'Asia/Seoul', 'yyyy-MM-dd');
+    if (coupon.expiresOn < todayInSeoul) {
       throw new CouponExpiredError(code, coupon.expiresOn);
     }
 
diff --git a/test/coupons.integration.spec.ts b/test/coupons.integration.spec.ts
index 77c0d11..a41f6e3 100644
--- a/test/coupons.integration.spec.ts
+++ b/test/coupons.integration.spec.ts
@@ -88,4 +88,15 @@ describe('POST /coupons/redeem', () => {
     expect(res.status).toBe(201);
   });
+
+  it('한국 시간 오전 8시에 전날 만료된 쿠폰을 거절한다', async () => {
+    jest.useFakeTimers().setSystemTime(new Date('2026-11-18T23:00:00Z')); // KST 11-19 08:00
+    await seedCoupon({ code: 'WELCOME10', expiresOn: '2026-11-18' });
+
+    const res = await request(app.getHttpServer())
+      .post('/coupons/redeem')
+      .send({ code: 'WELCOME10' });
+
+    expect(res.status).toBe(410);
+  });
 });
```
