# 프론트엔드 API 요청 사항

> 갱신일: 2026-07-30
>
> 대상: 투표 상세·비회원 재접속·계정 관리 개선
>
> API 공통 규약: `docs/domain.md`, `openapi/openapi.yaml`, `packages/types/src/index.ts`

프론트엔드 구현에 앞서 **백엔드에서 지원해야 하는 API·스키마 변경만** 정리한다.
프론트엔드만 수정하면 되는 UI 작업은 이 문서의 범위에 포함하지 않는다. 백엔드 API
변경 시 OpenAPI와 `@whenwe/types` 공유 타입을 같은 PR에서 함께 수정한다.

기존 문서의 1차 요청 9건(모임 요약, 참여자 목록, 집계, 회원 참여 연동, 특정 날짜,
시간 블록, 모임 수정·삭제 등)은 모두 구현 완료된 상태다.

---

## 전체 우선순위

| 우선순위 | 항목 | 백엔드 필요 | 비고 |
|---|---|---:|---|
| P0 | 빈 응답 제출 차단 | ✅ | 데이터 정합성 |
| P1 | 조율 기간 최대 30일 지원 | ✅ | 현재 서버 상한 14일 |
| P1 | 참여자별 투표 상세 조회 | ✅ | 현황·우선순위·확정 화면의 공통 기반 |
| P1 | 모임장의 투표자 삭제 | ✅ | 삭제 후 추천 재계산 필요 |
| P1 | 비회원 닉네임 + 참여 PIN 재접속 | ✅ | 스키마·인증 플로우 변경 |
| P2 | 회원 탈퇴 | ✅ | 소유 모임만 삭제 |
| P2 | 비밀번호 재설정 | ✅ | 이메일 발송 인프라 필요 |

권장 구현 순서:

```text
1. 빈 응답 제출 차단
2. 조율 기간 최대 30일 지원
3. 참여자별 투표 상세 API
4. 투표자 삭제 API
5. 비회원 참여 PIN
6. 회원 탈퇴
7. 비밀번호 재설정
```

---

## P0. 빈 응답 제출 차단

### 대상

`POST /api/meetings/{meetingId}/availability`

현재 프론트는 선택한 시간 블록이 0개이면 제출 버튼을 비활성화한다. 하지만 API는
`items: []`를 허용하며, 빈 배열 제출 시 기존 응답을 모두 삭제한 뒤 정상 응답으로
처리한다.

### 요청사항

- `items`는 최소 1개 이상이어야 한다.
- 빈 배열이면 기존 응답을 삭제하거나 추천을 재계산하지 않고 `400`을 반환한다.
- 프론트 검증과 무관하게 서버에서 강제한다.

```json
{
  "participantId": 12,
  "items": []
}
```

권장 오류:

```yaml
status: 400
code: AVAILABILITY_REQUIRED
message: 시간을 하나 이상 선택해 주세요.
```

### 완료 조건

- 신규 참여자의 빈 응답 제출이 거부된다.
- 기존 응답자가 `items: []`를 보내도 저장된 응답이 삭제되지 않는다.
- 서비스 테스트에 빈 배열 케이스가 추가된다.
- OpenAPI와 `ErrorCode`가 갱신된다.

---

## P1. 조율 기간 최대 30일 지원

### 대상

`POST /api/meetings`, `PATCH /api/meetings/{meetingId}`

프론트의 모임 생성·수정 날짜 선택 범위는 시작일 포함 최대 30일로 변경되었다. 현재
백엔드는 `MAX_PERIOD_DAYS = 14`로 검증하므로 15일 이상 요청이 거부된다.

### 요청사항

- `apps/api/src/meetings/meetings.service.ts`의 기간 상한을 30일로 변경
- 생성·수정 양쪽에 같은 상한 적용
- `dates`를 사용하는 특정 날짜 모드도 전체 범위는 최대 30일로 검증
- 30일은 성공하고 31일은 실패하는 서비스 테스트 추가
- `docs/domain.md`, `openapi/openapi.yaml`, `packages/types/src/index.ts`의 14일 설명을
  30일로 갱신

### 완료 조건

- 시작일과 종료일을 포함해 30일인 모임을 생성·수정할 수 있다.
- 31일 이상이면 기존 공통 검증 오류 형식으로 거부된다.
- 최대 날짜·시간대 조합에서도 슬롯 생성과 추천 재계산이 정상 동작한다.

---

## P1. 참여자별 투표 상세 조회

### 목적

현재 API는 참여자 이름과 응답 여부, 슬롯·추천 결과별 인원수만 반환한다. 다음 UI를
구현하려면 “누가 어떤 시간에 무엇을 선택했는지”가 필요하다.

- 응답 현황에서 특정 시간의 가능·애매·불가 참여자 확인
- 추천 우선순위에서 후보 일정별 가능·애매·불가 참여자 확인
- 확정 일정에서 참석 가능·애매·불가·미응답 참여자 확인
- 참여자 한 명의 전체 투표 내역 확인

### 신규 API 제안

```http
GET /api/meetings/{meetingId}/vote-details
Authorization: Bearer {organizerJwt}
```

- 모임장 전용
- `assertMeetingOwner` 적용
- 슬롯은 `startAt` 오름차순
- 참여자는 `createdAt` 오름차순
- 공개 초대 API에서는 제공하지 않는다.

### 응답 제안

```json
{
  "meetingId": 1,
  "participants": [
    {
      "participantId": 10,
      "guestName": "민수",
      "participantType": "GUEST",
      "isRequired": false,
      "hasResponded": true
    }
  ],
  "slots": [
    {
      "slotId": 101,
      "startAt": "2026-08-01T09:00:00.000Z",
      "endAt": "2026-08-01T10:00:00.000Z",
      "votes": [
        {
          "participantId": 10,
          "status": "AVAILABLE"
        }
      ]
    }
  ],
  "recommendations": [
    {
      "recommendationId": 20,
      "participantStatuses": [
        {
          "participantId": 10,
          "status": "AVAILABLE"
        }
      ]
    }
  ]
}
```

권장 공유 타입:

```ts
type ParticipantWindowStatus =
  | "AVAILABLE"
  | "MAYBE"
  | "UNAVAILABLE"
  | "NO_RESPONSE";

interface ParticipantVoteSummary {
  participantId: number;
  guestName: string;
  participantType: ParticipantType;
  isRequired: boolean;
  hasResponded: boolean;
}

interface SlotVoteDetail {
  slotId: number;
  startAt: string;
  endAt: string;
  votes: Array<{
    participantId: number;
    status: AvailabilityStatus;
  }>;
}

interface RecommendationParticipantDetail {
  recommendationId: number;
  participantStatuses: Array<{
    participantId: number;
    status: ParticipantWindowStatus;
  }>;
}

interface VoteDetailsResponse {
  meetingId: number;
  participants: ParticipantVoteSummary[];
  slots: SlotVoteDetail[];
  recommendations: RecommendationParticipantDetail[];
}
```

### 추천 구간 상태 계산 규칙

`recommendations[].participantStatuses`는 반드시 현재 추천 엔진과 같은 규칙으로
백엔드에서 계산한다.

- 구간 내 슬롯이 하나라도 미응답: `NO_RESPONSE`
- 모든 슬롯이 가능: `AVAILABLE`
- 응답한 슬롯 중 하나라도 불가: `UNAVAILABLE`
- 불가는 없지만 하나라도 애매: `MAYBE`

프론트가 이 규칙을 별도로 재구현하면 추천 인원수와 상세 명단이 달라질 수 있으므로,
추천 엔진의 `classifyParticipant` 로직을 재사용 가능한 함수로 분리하는 것을 권장한다.

### 완료 조건

- 슬롯별 상세 명단의 합이 기존 aggregate 카운트와 일치한다.
- 추천별 상세 명단의 합이 기존 recommendation 카운트와 일치한다.
- 미응답 참여자도 추천 구간 상세에 `NO_RESPONSE`로 포함된다.
- 다른 모임장 또는 참여자 JWT로 조회하면 `403`이다.
- OpenAPI와 공유 타입이 추가된다.

---

## P1. 모임장의 투표자 삭제

### 신규 API 제안

```http
DELETE /api/meetings/{meetingId}/participants/{participantId}
Authorization: Bearer {organizerJwt}
```

### 권장 정책

- 모임장만 삭제 가능
- `COLLECTING`, `READY_TO_CONFIRM` 상태에서만 허용
- `CONFIRMED`, `CLOSED` 상태에서는 확정 결과 보존을 위해 거부
- 참여자 삭제 시 해당 참여자의 availability는 cascade 삭제
- 삭제 직후 추천 결과 재계산
- 존재하지 않거나 다른 모임의 참여자이면 `404`

권장 성공 응답:

```json
{}
```

권장 오류:

```yaml
403:
  code: FORBIDDEN_MEETING_OWNER_ONLY

404:
  code: PARTICIPANT_NOT_FOUND

409:
  code: MEETING_NOT_EDITABLE
  message: 확정된 모임의 참여자는 삭제할 수 없습니다.
```

### 트랜잭션

가능하면 다음 작업을 원자적으로 처리한다.

1. owner 및 모임 상태 검증
2. participant 삭제
3. 연관 availability 삭제
4. recommendation 재계산

### 완료 조건

- 삭제된 참여자가 참여자 목록과 투표 상세에서 사라진다.
- 해당 참여자의 모든 availability가 삭제된다.
- 추천 결과의 가능·애매·불가·미응답 수가 다시 계산된다.
- 다른 모임의 participantId를 전달해도 삭제되지 않는다.
- OpenAPI와 프론트 API 함수에 사용할 공유 타입·에러 코드가 갱신된다.

---

## P1. 비회원 닉네임 + 참여 PIN 재접속

### 배경

현재 비회원은 브라우저 `localStorage`에 저장한 `participantId +
participantEditToken`으로 식별한다. 저장소를 삭제하거나 다른 기기에서 접속하면 기존
응답을 수정할 수 없다.

신규 비회원은 같은 초대 링크에서 닉네임과 숫자 4자리 참여 PIN을 설정하고, 이후 다른
브라우저에서도 닉네임과 PIN으로 기존 응답에 접근할 수 있어야 한다.

`임시 비밀번호`라는 표현은 회원 비밀번호 재설정과 혼동되므로 API와 UI에서는
`참여 PIN`을 사용한다.

### 프론트 선행 구현 상태

다음 항목은 백엔드 연결 전까지 구현되어 있다.

- 신규 비회원의 닉네임 + 숫자 4자리 PIN + PIN 확인 입력
- 기존 참여자의 닉네임 + PIN 재접속 화면
- 닉네임 `trim` 및 연속 공백 축소, 2~12자 형식 검증
- 중복 닉네임·인증 실패·요청 제한 오류 메시지
- 재접속 응답의 `participantId`, `guestName`, `participantEditToken` 런타임 검증
- 기존 `participantEditToken` 기반 사용자의 하위 호환 유지

현재 기능은 `NEXT_PUBLIC_PARTICIPANT_PIN_ENABLED=false`로 비활성화되어 있다. 백엔드
API와 OpenAPI·공유 타입이 배포된 뒤 프론트를
`NEXT_PUBLIC_PARTICIPANT_PIN_ENABLED=true`로 다시 빌드해야 한다.

### 스키마 변경 제안

`participants`에 다음 필드를 추가한다.

```prisma
normalizedGuestName String?   @map("normalized_guest_name")
pinHash             String?   @map("pin_hash")
pinFailedAttempts   Int       @default(0) @map("pin_failed_attempts")
pinLockedUntil      DateTime? @map("pin_locked_until")

@@unique([meetingId, normalizedGuestName])
```

- 회원 참여자는 `normalizedGuestName`, `pinHash`를 `null`로 둘 수 있다.
- PostgreSQL은 복합 unique의 `null`을 서로 다른 값으로 처리하므로 회원 여러 명을
  막지 않는다.
- PIN 평문은 DB·응답·로그에 남기지 않는다.
- PIN은 bcrypt 등 현재 회원 비밀번호와 같은 안전한 해시를 사용한다.

닉네임 정규화 최소 규칙:

```text
trim → 연속 공백 하나로 축소 → 소문자 변환
```

표시용 `guestName`은 사용자가 입력한 원문을 유지한다.

### 참여자 신규 등록 API 변경

```http
POST /api/invites/{inviteToken}/participants
```

비회원 요청:

```json
{
  "guestName": "민수",
  "pin": "1234"
}
```

검증:

- `pin`은 정확히 숫자 4자리
- 같은 모임의 정규화 닉네임 중복 금지
- 회원 Bearer 참여에는 PIN을 요구하지 않음

권장 중복 오류:

```yaml
status: 409
code: PARTICIPANT_NICKNAME_TAKEN
message: 이미 사용 중인 닉네임이에요.
```

### 기존 참여자 재접속 API 신규

```http
POST /api/invites/{inviteToken}/participants/session
```

요청:

```json
{
  "guestName": "민수",
  "pin": "1234"
}
```

성공 응답:

```json
{
  "participantId": 10,
  "guestName": "민수",
  "participantEditToken": "기존 또는 새로 발급한 랜덤 토큰"
}
```

비회원 세션 성공 시 `participantEditToken`은 반드시 비어 있지 않은 문자열이어야 한다.
회원 등록 응답에서만 `null`을 허용한다. 잘못된 성공 응답을 저장하지 않도록 프론트에서도
검증하지만, 서버 응답 스키마에서도 이 차이를 명시해야 한다.

PIN은 참여자 확인에만 사용하고, 확인 후 기존 availability API는
`X-Participant-Edit-Token`을 계속 사용한다. PIN을 모든 투표 요청에 반복 전송하지
않는다.

### 보안 요구사항

숫자 4자리는 경우의 수가 10,000개이므로 다음 제한이 필수다.

- 초대 토큰 + 닉네임 단위 실패 횟수 제한
- IP 단위 rate limit
- 예: 5회 실패 시 10분 잠금
- 닉네임 존재 여부와 PIN 오류를 같은 메시지로 반환
- 잠금 여부와 실패 횟수를 API 응답에 상세히 노출하지 않음

권장 인증 실패:

```yaml
status: 401
code: INVALID_PARTICIPANT_CREDENTIALS
message: 닉네임 또는 참여 PIN을 확인해 주세요.
```

권장 잠금:

```yaml
status: 429
code: PARTICIPANT_LOGIN_RATE_LIMITED
message: 잠시 후 다시 시도해 주세요.
```

### 기존 비회원 마이그레이션

기존 비회원은 PIN이 없으므로 즉시 기존 방식을 제거하지 않는다.

- 기존 `participantEditToken` 인증은 계속 허용
- 기존 토큰으로 접속한 사용자에게 PIN 설정 기능을 추후 제공 가능
- 신규 참여자부터 PIN 필수
- PIN을 잊은 비회원의 자동 복구는 MVP에서 제공하지 않음
- 필요하면 모임장이 해당 참여자를 삭제한 뒤 다시 등록하도록 안내

### 완료 조건

- 신규 비회원은 같은 모임에서 중복 닉네임으로 등록할 수 없다.
- 다른 모임에서는 같은 닉네임을 사용할 수 있다.
- 다른 브라우저에서 닉네임+PIN으로 기존 participant token을 받을 수 있다.
- PIN 원문이 DB와 로그에 저장되지 않는다.
- 반복 대입 공격이 rate limit과 잠금으로 제한된다.
- 기존 edit token 사용자는 계속 응답을 수정할 수 있다.

---

## P2. 회원 탈퇴

### 확정 정책

- 회원 계정 삭제
- 회원이 만든 모임만 삭제
- 소유 모임의 참여자·슬롯·응답·추천·상태 로그는 기존 cascade로 함께 삭제
- 다른 사람이 만든 모임에 남긴 투표는 유지
- 다른 모임의 participant에서는 `userId`만 `null`로 분리
- 탈퇴 후 해당 참여 응답은 더 이상 수정할 수 없음

### 스키마 확인

`Participant.user` 관계에 삭제 정책을 명시한다.

```prisma
user User? @relation(fields: [userId], references: [id], onDelete: SetNull)
```

DB migration의 실제 FK도 `ON DELETE SET NULL`인지 확인한다.

### 신규 API 제안

```http
DELETE /api/auth/me
Authorization: Bearer {jwt}
```

요청:

```json
{
  "password": "현재 비밀번호"
}
```

비밀번호를 다시 확인한 뒤 탈퇴시킨다.

권장 성공 응답:

```json
{}
```

권장 오류:

```yaml
401:
  code: INVALID_CREDENTIALS
  message: 비밀번호가 올바르지 않습니다.
```

### 서버 처리 순서

하나의 트랜잭션에서 다음을 처리한다.

1. 현재 사용자 조회 및 비밀번호 검증
2. `participants.userId`를 `null`로 변경
3. `ownerId`가 현재 사용자인 meeting 삭제
4. user 삭제

다른 모임의 투표를 유지하므로 그 모임들의 추천 결과는 재계산하지 않는다.

탈퇴한 사용자의 JWT가 남아 있더라도 보호 API에서 사용할 수 없도록
`JwtAuthGuard`가 토큰 서명뿐 아니라 사용자 존재 여부도 확인하는 것을 권장한다.

### 완료 조건

- 비밀번호가 틀리면 어떤 데이터도 삭제되지 않는다.
- 소유 모임과 그 하위 데이터가 삭제된다.
- 다른 모임에 남긴 participant 및 availability는 유지된다.
- 유지된 participant의 `userId`는 `null`이다.
- 탈퇴한 사용자의 기존 JWT로 보호 API를 사용할 수 없다.
- 같은 이메일로 신규 가입할 수 있다.

---

## P2. 비밀번호 재설정

### 방향

임시 비밀번호를 이메일로 보내지 않는다. 만료 시간이 있는 일회용 링크로 새 비밀번호를
설정한다.

### 프론트 선행 구현 상태

다음 화면과 API 호출 경계는 구현되어 있다.

- `/forgot-password`: 이메일 입력, 형식 검증, 동일한 완료 안내
- `/reset-password?token=...`: 새 비밀번호·확인 입력 및 8~72자 검증
- 진입 직후 토큰을 메모리에 보관하고 주소창에서는 쿼리 파라미터 제거
- `PASSWORD_RESET_TOKEN_INVALID` 오류 안내
- 로그인 화면의 비밀번호 찾기 진입 링크

백엔드 구현 후 OpenAPI와 `@whenwe/types` 타입을 추가하고 실제 API 통합 테스트가
필요하다.

### 스키마 제안

```prisma
model PasswordResetToken {
  id        Int       @id @default(autoincrement())
  userId    Int       @map("user_id")
  tokenHash String    @unique @map("token_hash")
  expiresAt DateTime  @map("expires_at")
  usedAt    DateTime? @map("used_at")
  createdAt DateTime  @default(now()) @map("created_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([expiresAt])
  @@map("password_reset_tokens")
}
```

### 비밀번호 재설정 메일 요청

```http
POST /api/auth/password/forgot
```

요청:

```json
{
  "email": "user@example.com"
}
```

이메일 존재 여부와 관계없이 항상 같은 `200` 응답과 유사한 처리 시간을 유지한다.

```json
{}
```

실제 HTTP 응답은 프로젝트 공통 `ApiResponse` 봉투를 사용해야 한다.

```json
{
  "success": true,
  "data": {},
  "error": null
}
```

- 이메일 존재 여부·발송 성공 여부를 응답 코드나 메시지로 구분하지 않는다.
- 이메일 + IP 단위 요청 제한을 적용한다.
- 반복 요청으로 메일이 과도하게 발송되지 않도록 재발송 간격을 둔다.

메일 링크 예시:

```text
{WEB_BASE_URL}/reset-password?token={rawToken}
```

- DB에는 raw token이 아닌 hash만 저장
- 유효시간 권장: 30분
- 새 토큰 발급 시 기존 미사용 토큰 무효화

### 새 비밀번호 설정

```http
POST /api/auth/password/reset
```

요청:

```json
{
  "token": "메일 링크의 원본 토큰",
  "newPassword": "새 비밀번호"
}
```

검증:

- 토큰 hash 조회
- 만료·사용 여부 확인
- 비밀번호 8~72자 확인
- 비밀번호 변경과 token 사용 처리를 한 트랜잭션에서 수행
- 비밀번호 변경 성공 후 기존 JWT·refresh token을 무효화

권장 오류:

```yaml
status: 400
code: PASSWORD_RESET_TOKEN_INVALID
message: 유효하지 않거나 만료된 링크입니다.
```

### 운영 설정

- 이메일 발송 서비스 결정 필요
- API 환경변수 예:
  - `MAIL_FROM`
  - 메일 공급자 API key
  - `WEB_BASE_URL`
- 운영 로그에 reset token이나 새 비밀번호를 기록하지 않음
- 프록시·APM·분석 도구에서도 `token` 쿼리 값을 마스킹
- 프론트가 주소창에서 토큰을 제거하더라도 최초 HTTP 요청에는 포함되므로 서버 로그
  필터링이 반드시 필요

### 완료 조건

- 가입되지 않은 이메일 입력으로 계정 존재 여부를 확인할 수 없다.
- 링크는 한 번만 사용할 수 있고 만료된다.
- 재설정 후 새 비밀번호로 로그인할 수 있다.
- 사용·만료된 링크로는 비밀번호를 바꿀 수 없다.
- 재설정 전에 발급된 인증 토큰으로 보호 API를 사용할 수 없다.
- API·프록시·APM 로그에서 원본 재설정 토큰을 확인할 수 없다.
