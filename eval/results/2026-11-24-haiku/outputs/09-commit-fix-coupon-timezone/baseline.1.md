fix(coupon): 쿠폰 만료일 비교를 한국 시간 기준으로 수정 (#214)

만료일 비교에 UTC 날짜를 사용하던 문제를 수정했습니다. expiresOn은 한국 시간 기준 날짜인데, 한국 시간 00:00~08:59 사이에는 UTC 기준 전날 날짜가 나와 전날 만료된 쿠폰이 통과했습니다. 이제 Asia/Seoul 시간대의 오늘 날짜로 비교합니다.

- coupon.service.ts: 오늘 날짜 계산을 formatInTimeZone(…, 'Asia/Seoul')으로 변경
- coupons.integration.spec.ts: 한국 시간 오전 8시에 전날 만료 쿠폰이 거절되는지 검증하는 테스트 추가
