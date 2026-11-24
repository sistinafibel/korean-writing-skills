---
id: 10-commit-feature-order-export
category: 커밋 메시지
kind: commit
title: 주문 목록 CSV 내보내기 기능 추가의 커밋 메시지
---
아래 diff 를 보고 커밋 메시지를 한국어로 써 주세요. 커밋 메시지만 출력하고, 다른 설명이나 코드 블록 표시는 붙이지 마세요.

```diff
diff --git a/src/orders/orders.controller.ts b/src/orders/orders.controller.ts
index 5d1e0aa..c93b7f4 100644
--- a/src/orders/orders.controller.ts
+++ b/src/orders/orders.controller.ts
@@ -27,4 +27,19 @@ export class OrdersController {
   list(@Query() query: ListOrdersDto) {
     return this.orders.list(query);
   }
+
+  @Get('export')
+  @Roles('admin', 'manager')
+  @Header('Content-Type', 'text/csv; charset=utf-8')
+  async export(@Query() query: ExportOrdersDto, @Res() res: Response) {
+    const count = await this.orders.count(query);
+    if (count > EXPORT_ROW_LIMIT) {
+      throw new BadRequestException(
+        `한 번에 내보낼 수 있는 주문은 ${EXPORT_ROW_LIMIT}건까지입니다. 기간을 줄여 주세요.`,
+      );
+    }
+    res.setHeader('Content-Disposition', `attachment; filename="orders-${query.from}-${query.to}.csv"`);
+    res.write('﻿'); // 엑셀에서 한글이 깨지지 않도록 BOM 을 붙인다
+    await this.orders.streamCsv(query, res);
+  }
 }
diff --git a/src/orders/orders.constants.ts b/src/orders/orders.constants.ts
index 1b0c2de..8a7714e 100644
--- a/src/orders/orders.constants.ts
+++ b/src/orders/orders.constants.ts
@@ -1,2 +1,5 @@
 export const DEFAULT_PAGE_SIZE = 20;
 export const MAX_PAGE_SIZE = 100;
+
+/** CSV 내보내기 한 번에 허용하는 최대 주문 수 */
+export const EXPORT_ROW_LIMIT = 10_000;
diff --git a/src/orders/orders.service.ts b/src/orders/orders.service.ts
index 9e44b02..d07a5c1 100644
--- a/src/orders/orders.service.ts
+++ b/src/orders/orders.service.ts
@@ -52,4 +52,22 @@ export class OrdersService {
     return { items, total, page: query.page };
   }
+
+  count(query: ExportOrdersDto): Promise<number> {
+    return this.repo.countBetween(query.from, query.to, query.status);
+  }
+
+  /** 주문을 500건씩 읽어서 CSV 행으로 쓴다. 전체를 메모리에 올리지 않는다. */
+  async streamCsv(query: ExportOrdersDto, out: Writable): Promise<void> {
+    out.write('주문번호,주문일시,주문자,상태,결제금액\n');
+    for await (const batch of this.repo.iterateBetween(query.from, query.to, query.status, 500)) {
+      for (const o of batch) {
+        out.write(
+          [o.orderNo, o.orderedAt.toISOString(), csvEscape(o.customerName), o.status, o.paidAmount].join(',') + '\n',
+        );
+      }
+    }
+    out.end();
+  }
 }
diff --git a/test/orders-export.integration.spec.ts b/test/orders-export.integration.spec.ts
new file mode 100644
index 0000000..2c6d9f1
--- /dev/null
+++ b/test/orders-export.integration.spec.ts
@@ -0,0 +1,31 @@
+describe('GET /orders/export', () => {
+  it('기간 안의 주문을 CSV 로 응답한다', async () => {
+    await seedOrders(3, { from: '2026-11-01', to: '2026-11-03' });
+    const res = await request(app.getHttpServer())
+      .get('/orders/export?from=2026-11-01&to=2026-11-30')
+      .set(asAdmin());
+    expect(res.status).toBe(200);
+    expect(res.text.split('\n').filter(Boolean)).toHaveLength(4); // 머리글 1 + 주문 3
+  });
+
+  it('1만 건이 넘으면 400 으로 응답한다', async () => {
+    await seedOrders(10_001, { from: '2026-10-01', to: '2026-10-31' });
+    const res = await request(app.getHttpServer())
+      .get('/orders/export?from=2026-10-01&to=2026-10-31')
+      .set(asAdmin());
+    expect(res.status).toBe(400);
+  });
+
+  it('일반 직원(staff)은 403 을 받는다', async () => {
+    const res = await request(app.getHttpServer())
+      .get('/orders/export?from=2026-11-01&to=2026-11-30')
+      .set(asStaff());
+    expect(res.status).toBe(403);
+  });
+});
```
