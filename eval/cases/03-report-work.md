---
id: 03-report-work
category: 작업 결과 보고
kind: prose
title: 느린 회원 목록 화면을 고친 작업의 결과 보고
---
당신은 코딩 에이전트이고, 사용자가 맡긴 작업을 방금 끝냈습니다. 아래 작업 기록을 바탕으로 사용자에게 보낼 작업 결과 보고를 써 주세요.

사용자의 요청: "관리자 회원 목록 화면이 너무 느려요. 원인을 찾아서 고쳐 주세요."

작업 기록:
- GET /admin/members 응답 시간 측정: 회원 2만 명 기준 평균 4.2초
- 원인 1: 회원마다 최근 주문을 따로 조회 (N+1). 한 페이지가 50명이라 쿼리 51번
- 원인 2: members.created_at 에 인덱스 없음. 정렬할 때 전체 스캔
- 조치 1: MemberRepository.findPage 가 최근 주문을 JOIN LATERAL 쿼리 한 번으로 가져오게 변경
- 조치 2: 마이그레이션 20261120_add_members_created_at_idx 추가 (CREATE INDEX CONCURRENTLY)
- 다시 측정: 평균 4.2초 → 0.31초 (같은 데이터, 10회 평균)
- 테스트: members.integration.spec.ts 12개 통과. 전체 통합 테스트는 148개 중 147개 통과
- 실패 1개: coupons.integration.spec.ts 의 "만료 쿠폰 정리" 케이스. 이번 변경 전의 main 에서도 실패함 (시간대 문제로 보임). 건드리지 않음
- 하지 않은 것: 회원 검색(이름 LIKE 검색)은 여전히 1.8초. 요청 범위 밖이라 그대로 둠
- 마이그레이션은 스테이징에만 적용함. 운영 DB 적용은 사용자가 결정해야 함
