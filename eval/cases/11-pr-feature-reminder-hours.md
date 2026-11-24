---
id: 11-pr-feature-reminder-hours
category: PR 제목과 본문
kind: pr
title: 매장별 예약 알림 시간 설정 기능의 PR
deploy: required
---
아래 상황 설명과 diff 요약을 보고 PR 제목과 본문을 한국어로 써 주세요. 첫 줄에 PR 제목만 쓰고, 한 줄을 비운 뒤 본문을 Markdown 으로 씁니다. 다른 설명이나 바깥을 감싸는 코드 블록 표시는 붙이지 마세요.

상황 설명:
- 미용실 예약 서비스입니다. 지금은 예약 알림 문자가 모든 매장에서 예약 24시간 전에 나갑니다.
- 매장 12곳이 "당일 예약이 많아서 24시간 전 알림은 의미가 없다. 2~3시간 전에 보내고 싶다"고 요청했습니다 (이슈 #87).
- 이 PR 로 매장 관리자가 설정 화면에서 알림 시간을 1~72시간 사이로 고를 수 있습니다. 기본값은 지금과 같은 24시간입니다.
- 문자 발신 번호를 코드에 박아 두었던 것을 환경 변수 SMS_SENDER_ID 로 뺐습니다. 이 값이 없으면 서버가 시작할 때 오류를 내고 멈춥니다.
- 스케줄러는 10분마다 돌면서 "지금부터 알림 시간 안에 시작하는 예약 가운데 아직 알림을 보내지 않은 것"을 찾아 보냅니다. 전에는 하루에 한 번 09:00 에 돌았습니다.
- 확인한 것: 통합 테스트 23개 통과(새로 쓴 것 6개 포함). 스테이징에서 알림 시간을 2시간으로 바꾼 매장에 예약을 넣고, 문자 발송 기록이 예약 2시간 전에 생기는 것을 봤습니다.
- 확인하지 못한 것: 스테이징은 문자 발송을 모의(mock)로 처리해서 실제 통신사 발송은 확인하지 못했습니다.

diff 요약:

```diff
diff --git a/prisma/migrations/20261121_add_reminder_hours_before/migration.sql
+ALTER TABLE "stores" ADD COLUMN "reminder_hours_before" INTEGER NOT NULL DEFAULT 24;
+ALTER TABLE "reservations" ADD COLUMN "reminder_sent_at" TIMESTAMPTZ;
+CREATE INDEX "reservations_reminder_idx" ON "reservations" ("starts_at") WHERE "reminder_sent_at" IS NULL;

diff --git a/src/config/env.ts
+  SMS_SENDER_ID: z.string().regex(/^\d{8,11}$/),

diff --git a/src/sms/sms.client.ts
-const SENDER = '0212345678';
+const SENDER = env.SMS_SENDER_ID;

diff --git a/src/reminders/reminder.scheduler.ts
-  @Cron('0 9 * * *')
-  async sendDailyReminders() {
-    const targets = await this.reservations.findStartingBetween(addHours(now(), 24), addHours(now(), 48));
+  @Cron('*/10 * * * *')
+  async sendDueReminders() {
+    const targets = await this.reservations.findDueForReminder(now());
     for (const r of targets) {
       await this.sms.send(r.customerPhone, buildReminderText(r));
+      await this.reservations.markReminderSent(r.id, now());
     }
   }

diff --git a/src/stores/dto/update-store-settings.dto.ts
+  @IsInt() @Min(1) @Max(72)
+  reminderHoursBefore?: number;

diff --git a/web/src/pages/store-settings/ReminderSection.tsx   (새 파일, 58줄)
diff --git a/test/reminders.integration.spec.ts                 (새 테스트 6개)
```
