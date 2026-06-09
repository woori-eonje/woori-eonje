# 도메인 규칙 · 데이터 모델 · API 규약

도메인 전체의 단일 출처는 **`plan/whenwe_plan_v0.3.pdf`**. 아래는 구현 시 자주 틀리는 핵심 규칙의 요약이며, 충돌 시 기획서가 우선한다.

## 핵심 도메인 로직 (구현 시 정확히 따를 것)

### 추천 계산
- 시간 슬롯 단위는 **1시간**, 조율 기간 **최대 14일**.
- 응답 점수: **가능=2, 애매=1, 불가=0** (`AVAILABILITY_SCORE` in `@whenwe/types`).
- 예상 소요 시간이 N시간이면 **연속된 N개 슬롯**을 묶어 후보 구간 생성.
- **추천 우선순위(8단계 안정 정렬)**: ①필수참석자 전원 가능 → ②연속 구간 내 최소 가능 인원 多 → ③평균 점수 高 → ④불가 인원 少 → ⑤애매 인원 少 → ⑥미응답자 少 → ⑦빠른 날짜 → ⑧생성 순서(id/start_at 오름차순). 8단계까지 동일하면 항상 같은 결과를 반환(결정론적).
- **필수 참석자**: 모임 생성이 아니라 *응답 수집 후 추천 결과 화면*에서 모임장이 지정. 불가능 시간은 "제외"가 아니라 **"낮은 순위 처리"**(결과가 완전히 비는 상황 방지).
- **계산 시점**: 응답 제출 시 재계산 → `recommendation_results` 갱신. 조회 API는 계산하지 않고 저장된 결과만 반환.

### 비회원 참여 & 토큰 (두 토큰을 혼동하지 말 것)
- `invite_token`: 모임 **접근**용. UUID/랜덤. 기본 만료 = 응답 마감일. 재발급 시 기존 토큰 비활성화.
- `participant_edit_token`: 비회원 참여자의 **내 응답 수정**용. 클라이언트(localStorage)에 저장.
- 식별은 닉네임이 아니라 `participant_id + edit_token` 기준. **동일 닉네임 허용**, 닉네임으로 덮어쓰지 않음. edit token 없으면 새 참여자로 등록.

### 모임 상태머신
`DRAFT → COLLECTING → READY_TO_CONFIRM → CONFIRMED → CLOSED` (`MeetingStatus` in `@whenwe/types`)
- 상태별로 가능한 액션을 **서버에서 강제 제한**한다 (예: READY_TO_CONFIRM 이후 참여자 응답 수정 불가).
- `response_deadline` 경과 시 **스케줄러가 COLLECTING → READY_TO_CONFIRM 자동 전환**. **자동 확정은 하지 않음**(모임장이 수동 확정).
- 중복 확정 방지: 상태 조건부 UPDATE — `UPDATE meetings SET status='CONFIRMED' WHERE id=? AND status IN ('COLLECTING','READY_TO_CONFIRM')`.

### 동시성
- `participant_availability` 는 `(participant_id, slot_id)` **unique**. 같은 슬롯 재제출은 insert가 아니라 **update**.
- 응답 저장과 추천 재계산은 한 트랜잭션으로 처리하거나, 재계산 실패 시 상태를 PENDING으로 남긴다.

## 데이터 모델 (7개 테이블)

`users` · `meetings` · `participants` · `availability_slots` · `participant_availability` · `recommendation_results` · `meeting_state_logs`

스키마 컬럼 정의는 기획서 23장 참조. 주요 인덱스 후보: `meetings.invite_token`, `meetings(status, response_deadline)`, `participants.meeting_id`, `participant_availability(participant_id, slot_id)`, `recommendation_results(meeting_id, rank)`.

## API 규약

- **공통 응답**: `{ "success": true, "data": {...}, "error": null }`
- **공통 에러**: `{ "success": false, "data": null, "error": { "code": "...", "message": "..." } }`
- 응답/에러 타입과 에러코드는 `@whenwe/types`의 `ApiResponse`, `ErrorCode`를 사용. 새 에러는 같은 컨벤션으로 거기 추가.
- API DTO/스키마는 `packages/types`에 정의하고 FE·BE가 공유한다. **API 변경 시 타입과 양쪽 사용처를 같은 PR에서 함께 수정.**
- 엔드포인트 초안 및 인증 필요 여부는 기획서 24장 참조(`/api/auth/*`, `/api/meetings`, `/api/invites/{inviteToken}/*`, `/api/meetings/{id}/availability|recommendations|confirm|calendar.ics`).

## MVP 범위 경계

- **포함**: 인증, 모임 생성, 비회원 참여, 가능시간 제출, 추천 계산, 일정 확정, `.ics` 내보내기, 상태 전환 스케줄러.
- **제외(2차)**: 정기 모임, 장소 투표, 정산/채팅/댓글, 카카오 알림톡, PWA 푸시, Google Calendar OAuth, 지도 API, 복잡한 반복 일정. — 이 기능들을 MVP에 끌어들이지 않는다.
