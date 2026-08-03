# 0001. 비회원 참여자 닉네임+PIN 재접속 도입

## 상태

승인됨 (2026-08-03)

## 배경 (Context)

기존 비회원 참여자는 브라우저 `localStorage`에 저장한 `participantId + participantEditToken`으로만
식별된다. 저장소를 지우거나 다른 기기에서 접속하면 기존 응답을 수정할 방법이 없다.

프론트엔드는 신규 비회원이 닉네임과 숫자 4자리 참여 PIN을 설정하고, 이후 다른 브라우저에서도
닉네임+PIN으로 기존 참여자를 재식별할 수 있는 기능을 요청했다(`docs/frontend-api-requests.md`
"P1. 비회원 닉네임 + 참여 PIN 재접속").

이 제안은 `docs/domain.md`의 기존 규칙과 직접 충돌한다:

> 식별은 닉네임이 아니라 `participant_id + edit_token` 기준. **동일 닉네임 허용**, 닉네임으로
> 덮어쓰지 않음. edit token 없으면 새 참여자로 등록.

## 결정 (Decision)

닉네임 기반 식별을 기존 edit-token 식별을 **대체**하지 않고, **신규 비회원부터 점진 도입**한다.

- `participants`에 `normalized_guest_name`(nullable), `pin_hash`(nullable),
  `pin_failed_attempts`(기본 0), `pin_locked_until`(nullable)을 추가한다.
- `@@unique([meeting_id, normalized_guest_name])`. PostgreSQL은 NULL을 서로 다른 값으로
  취급하므로, 이 컬럼이 null인 회원·레거시 비회원 행은 서로 충돌하지 않는다.
- **신규 비회원 등록부터** PIN(숫자 4자리)이 필수이며, 같은 모임 내 정규화 닉네임
  (trim → 연속 공백 축소 → 소문자 변환)이 유일해야 한다.
- **기존(레거시) 비회원**은 `pin_hash`가 null인 채로 유지되며, 계속 `participant_edit_token`
  방식으로만 접근한다. `POST .../participants/session`(닉네임+PIN)은 `pin_hash`가 있는
  참여자만 허용한다 — 레거시 참여자는 이 API로 재접속할 수 없다.
- 두 식별 방식은 **영구적으로 공존**한다. `participant_edit_token`은 계속 모든 응답
  제출 API(`X-Participant-Edit-Token`)의 유일한 인증 수단이며, PIN은 오직 이 토큰을
  다시 얻기 위한 재발급 절차에만 쓰인다(모든 투표 요청에 PIN을 반복 전송하지 않음).
- 브루트포스 방어는 이중화: (1) 초대+닉네임 단위 실패 카운터 — 5회 실패 시 10분 잠금,
  (2) IP 단위 레이트리밋(`ThrottlerGuard`, 5회/분). PIN 평문은 DB·로그·응답 어디에도
  남기지 않고 bcrypt 해시로만 저장한다.
- PIN을 잊은 비회원의 자동 복구는 제공하지 않는다(MVP 범위 밖). 필요하면 모임장이
  해당 참여자를 삭제(`DELETE /api/meetings/{id}/participants/{participantId}`)한 뒤
  다시 등록하도록 안내한다.

`docs/domain.md`의 "동일 닉네임 허용" 규칙은 이 예외를 반영해 갱신한다(Task 8 Step 2).

## 결과 (Consequences)

- 스키마 마이그레이션 1건 추가(모두 nullable/기본값 있음 — 백필 불필요, 하위 호환).
- 비회원 식별 방식이 두 가지(edit-token, 닉네임+PIN)로 늘어나 개념적 복잡도가 증가한다.
  대신 기존 edit-token 흐름과 모든 기존 데이터는 전혀 변경되지 않는다.
- 배포 순서 주의: 백엔드 배포 시점에 신규 비회원 등록은 즉시 PIN을 요구하게 된다.
  프론트엔드는 `NEXT_PUBLIC_PARTICIPANT_PIN_ENABLED=false`로 이 기능을 꺼둔 채
  배포돼 있으므로, 백엔드 배포와 프론트엔드의 플래그 on 재배포 사이에 시간차가 크면
  구버전 프론트(플래그 off, `pin` 미전송)의 신규 비회원 등록이 400으로 실패한다.
  두 배포를 가깝게 묶어 진행해야 한다.
- **알려진 제약(경합)**: `participantSession`의 잠금 검사(`pinLockedUntil` 조회)와 실패
  카운터 증가·잠금 설정은 하나의 원자적 트랜잭션이 아니다. 동시에 여러 요청이 같은
  참여자를 공격하면(예: 여러 IP에서 동시 요청 — IP 단위 레이트리밋은 단일 IP만 제한하므로
  이 경우 못 막음), 5회 잠금 임계값을 약간 초과하는 추가 시도가 이론적으로 가능하다.
  다만 (a) 실제 동시 요청 트래픽이 필요하고, (b) 10,000가지뿐인 PIN 공간에서 몇 번의
  추가 시도가 성공 확률에 미치는 영향은 미미하며, (c) 침해 시 노출되는 것은 결제·개인정보가
  아니라 비회원 참여자 본인의 가용시간 응답 수정 권한뿐이라 리스크가 낮다고 판단해,
  `confirmMeeting`류의 조건부 원자적 UPDATE는 이번 버전에서는 적용하지 않았다. 필요시
  `participant.updateMany({ where: { id, OR: [{ pinLockedUntil: null }, { pinLockedUntil: { lte: now } }] } })`
  패턴으로 닫을 수 있다.
