# 백엔드 완료 후 프론트엔드 작업 목록

> 갱신일: 2026-07-30
>
> 백엔드 요청 원본: `docs/frontend-api-requests.md`

백엔드 API가 구현된 뒤 프론트엔드에서 연결해야 할 작업을 우선순위와 의존성에 따라
정리한다. 각 작업은 OpenAPI와 `@whenwe/types`가 백엔드 구현 내용에 맞게 갱신된 것을
전제로 한다.

---

## 작업 시작 전 공통 확인

- [ ] `develop-fetch`의 최신 백엔드 변경을 `develop-front`에 반영
- [ ] `packages/types/src/index.ts`에 신규 요청·응답 타입 확인
- [ ] `openapi/openapi.yaml`의 실제 경로와 오류 코드 확인
- [ ] API 서버 `3001`, 프론트 서버 `3000` 실행
- [ ] `pnpm --filter web exec tsc --noEmit`
- [ ] `pnpm --filter web lint`

백엔드 응답이 요청 문서와 다르면 프론트에서 임의로 추측하지 않고 실제 OpenAPI와 공유
타입을 기준으로 구현한다.

---

## P0. 빈 응답 제출 오류 처리

### 백엔드 선행 조건

- `POST /api/meetings/{meetingId}/availability`
- 빈 `items`에 `400 AVAILABILITY_REQUIRED` 반환

### 프론트 작업

- [ ] 현재 `summary.total === 0` 제출 버튼 비활성화 유지
- [ ] 선택하지 않은 상태에서 안내 문구 표시
- [ ] API가 `AVAILABILITY_REQUIRED`를 반환하면 사용자 메시지 표시
- [ ] 기존 응답 수정 중 전체 선택을 지웠을 때 제출할 수 없음을 안내

권장 문구:

```text
시간을 하나 이상 선택해 주세요.
```

관련 파일:

```text
apps/web/app/invite/[token]/time-select/page.tsx
apps/web/lib/availability.ts
```

완료 기준:

- [ ] 신규 참여자가 아무 시간도 선택하지 않고 제출할 수 없음
- [ ] 기존 응답자가 모든 선택을 지운 뒤 제출할 수 없음
- [ ] 서버 오류 메시지가 화면에 자연스럽게 표시됨

---

## P1. 참여자별 투표 상세 연결

### 백엔드 선행 조건

- `GET /api/meetings/{meetingId}/vote-details`
- `VoteDetailsResponse`
- 추천 구간별 `AVAILABLE | MAYBE | UNAVAILABLE | NO_RESPONSE`

### 1단계: API 클라이언트

- [ ] `getVoteDetails(meetingId)` 추가
- [ ] 인증이 필요한 모임장 전용 요청으로 연결
- [ ] 로딩·403·404·일반 오류 처리

관련 파일:

```text
apps/web/lib/meetings.ts
```

### 2단계: 응답 현황 상세

- [ ] 히트맵 슬롯을 클릭 가능하게 변경
- [ ] 선택한 슬롯의 가능·애매·불가 참여자 명단 표시
- [ ] 응답이 없는 상태의 빈 화면 처리
- [ ] 모바일에서는 바텀시트 또는 카드 확장 방식 사용

표시 예시:

```text
7월 30일 오후 2시

가능 2명
민수 · 지수

애매 1명
서연

불가 1명
현우
```

### 3단계: 추천 우선순위 상세

- [ ] 추천 카드에 `참여자 보기` 동작 추가
- [ ] 가능·애매·불가·미응답으로 참여자를 분류
- [ ] 필수 참여자 표시
- [ ] 기존 인원수와 상세 명단 수가 일치하는지 확인

### 4단계: 확정 일정 상세

- [ ] 확정된 시작·종료 시각에 해당하는 추천 상세 찾기
- [ ] 확정 일정 기준 가능·애매·불가·미응답 명단 표시
- [ ] 현재 전체 참여자 칩을 상태별 명단으로 확장
- [ ] 전체 참여자 수와 상태별 합계 확인

관련 파일:

```text
apps/web/app/meetings/[id]/dashboard/page.tsx
apps/web/app/meetings/[id]/confirmed/page.tsx
apps/web/lib/meetings.ts
```

완료 기준:

- [ ] 슬롯 집계 숫자와 상세 참여자 수가 일치
- [ ] 추천 결과 숫자와 상세 참여자 수가 일치
- [ ] 미응답자가 별도 상태로 표시됨
- [ ] 다른 모임 데이터가 섞이지 않음

---

## P1. 모임장의 투표자 삭제 연결

### 백엔드 선행 조건

- `DELETE /api/meetings/{meetingId}/participants/{participantId}`
- 성공 후 추천 결과 재계산
- `PARTICIPANT_NOT_FOUND`, `MEETING_NOT_EDITABLE` 오류

### 프론트 작업

- [ ] API 클라이언트에 `deleteParticipant()` 추가
- [ ] 참여자 관리 목록에 삭제 버튼 추가
- [ ] 삭제 확인 모달 추가
- [ ] 삭제 중 버튼 중복 실행 방지
- [ ] 성공 후 참여자 목록·집계·추천 결과 다시 조회
- [ ] 확정된 모임에서는 삭제 버튼 숨김 또는 비활성화
- [ ] 실패 오류 메시지 표시

확인 문구:

```text
‘민수’ 참여자를 삭제할까요?
작성한 응답도 함께 삭제되며 되돌릴 수 없어요.
```

관련 파일:

```text
apps/web/app/meetings/[id]/dashboard/page.tsx
apps/web/lib/meetings.ts
```

완료 기준:

- [ ] 확인 없이 바로 삭제되지 않음
- [ ] 삭제 후 참여자 수와 추천 결과가 갱신됨
- [ ] 확정된 모임에서는 삭제할 수 없음

---

## P1. 비회원 참여 PIN 연결

### 백엔드 선행 조건

- 비회원 등록 요청에 숫자 4자리 `pin`
- 같은 모임의 닉네임 중복 방지
- `POST /api/invites/{inviteToken}/participants/session`
- `PARTICIPANT_NICKNAME_TAKEN`
- `INVALID_PARTICIPANT_CREDENTIALS`
- `PARTICIPANT_LOGIN_RATE_LIMITED`

### 1단계: 초대 진입 화면 분기

- [ ] `처음 참여해요`와 `기존 응답을 수정할게요` 선택지 추가
- [ ] 로그인 회원 참여 흐름은 기존 방식 유지
- [ ] 비회원에게만 참여 PIN 입력 노출

### 2단계: 신규 비회원 등록

- [ ] 닉네임 입력
- [ ] 숫자 4자리 PIN 입력
- [ ] PIN 확인 입력
- [ ] 숫자 키패드가 뜨도록 `inputMode="numeric"` 사용
- [ ] 4자리·확인 일치 검증
- [ ] 닉네임 중복 오류 표시
- [ ] 성공 시 기존 `participantEditToken` 저장 후 시간 선택 화면 이동

### 3단계: 기존 응답 재접속

- [ ] 닉네임+PIN 입력 폼 추가
- [ ] 세션 API 호출
- [ ] 성공 시 받은 participant 정보를 기존 저장 구조에 기록
- [ ] 시간 선택 화면에서 기존 응답 조회
- [ ] 인증 실패와 잠금 오류를 구분해 안내

권장 문구:

```text
닉네임 또는 참여 PIN을 확인해 주세요.
잠시 후 다시 시도해 주세요.
```

관련 파일:

```text
apps/web/app/invite/[token]/InviteJoinView.tsx
apps/web/app/invite/[token]/page.tsx
apps/web/lib/participant.ts
apps/web/lib/invite.ts
```

완료 기준:

- [ ] 같은 모임에서 중복 닉네임 등록이 거부됨
- [ ] 다른 브라우저에서 닉네임+PIN으로 기존 응답을 불러옴
- [ ] 회원 참여 흐름에는 PIN이 필요하지 않음
- [ ] PIN 값이 localStorage나 로그에 저장되지 않음
- [ ] 기존 edit token 참여자는 계속 접근 가능

---

## P2. 회원 탈퇴 연결

### 백엔드 선행 조건

- `DELETE /api/auth/me`
- 현재 비밀번호 재확인
- 소유 모임 삭제
- 다른 모임에 남긴 투표 유지

### 프론트 작업

- [ ] 계정 설정 화면 또는 모달 추가
- [ ] 회원 탈퇴 진입 버튼 추가
- [ ] 삭제 범위 안내
- [ ] 현재 비밀번호 입력
- [ ] 최종 확인 체크 또는 확인 문구 입력
- [ ] 탈퇴 API 호출
- [ ] 성공 시 JWT와 사용자 로컬 정보 삭제
- [ ] 홈 화면으로 이동
- [ ] 비밀번호 오류와 일반 오류 처리

필수 안내 문구:

```text
회원 탈퇴 시 내가 만든 모임과 해당 모임의 모든 응답이 삭제됩니다.
다른 모임에 제출한 응답은 유지되며 더 이상 수정할 수 없어요.
```

관련 파일 후보:

```text
apps/web/app/meetings/page.tsx
apps/web/app/settings/page.tsx          # 신규 라우트가 필요할 경우
apps/web/lib/auth.ts
apps/web/lib/api.ts
```

완료 기준:

- [ ] 비밀번호 재확인 없이 탈퇴할 수 없음
- [ ] 탈퇴 성공 후 보호 페이지에 접근할 수 없음
- [ ] 로컬 인증 정보가 남지 않음
- [ ] 뒤로 가기로 인증 화면이 다시 노출되지 않음

---

## P2. 비밀번호 재설정 연결

### 백엔드 선행 조건

- `POST /api/auth/password/forgot`
- `POST /api/auth/password/reset`
- `PASSWORD_RESET_TOKEN_INVALID`
- 실제 이메일에 재설정 링크 발송

### 1단계: 로그인 화면

- [ ] 로그인 폼 아래 `비밀번호를 잊으셨나요?` 링크 추가

### 2단계: 이메일 요청 화면

- [ ] `/forgot-password` 페이지 추가
- [ ] 이메일 입력 및 형식 검증
- [ ] 성공 시 계정 존재 여부와 무관하게 같은 완료 화면 표시

완료 문구:

```text
입력한 이메일로 비밀번호 재설정 링크를 보냈어요.
메일이 보이지 않으면 스팸함도 확인해 주세요.
```

### 3단계: 새 비밀번호 화면

- [ ] `/reset-password?token=...` 페이지 추가
- [ ] URL token 누락 처리
- [ ] 새 비밀번호와 확인 입력
- [ ] 8~72자 및 일치 검증
- [ ] 성공 후 로그인 화면으로 이동
- [ ] 만료·사용된 링크 오류 화면 제공

관련 파일:

```text
apps/web/app/login/page.tsx
apps/web/app/forgot-password/page.tsx   # 신규
apps/web/app/reset-password/page.tsx    # 신규
apps/web/lib/auth.ts
```

완료 기준:

- [ ] 가입되지 않은 이메일에도 동일한 완료 UI 표시
- [ ] 유효한 링크로 비밀번호 변경 가능
- [ ] 만료·재사용 링크에서 명확한 오류 표시
- [ ] 새 비밀번호로 로그인 가능

---

## 프론트 단독 작업 현황

백엔드와 무관하게 먼저 진행한 작업:

- [x] PC 시간 선택 드래그에 포인터 캡처·종료 처리 추가
- [x] 날짜 탭에 가능·애매·불가 색상과 개수 표시
- [x] 선택한 시간이 0개일 때 제출 버튼 비활성화
- [ ] 실제 PC 브라우저에서 드래그 동작 수동 검증

---

## 기능별 검증 명령

각 기능 완료 후:

```bash
pnpm --filter web exec tsc --noEmit
pnpm --filter web lint
pnpm --filter web build
```

최종 통합 확인:

- [ ] 신규 참여 → 투표 제출
- [ ] 다른 브라우저에서 PIN 재접속 → 기존 응답 수정
- [ ] 모임장 현황에서 투표 상세 확인
- [ ] 참여자 삭제 → 추천 결과 갱신
- [ ] 일정 확정 → 확정 시간 기준 참여자 상태 확인
- [ ] 비밀번호 재설정 → 새 비밀번호 로그인
- [ ] 회원 탈퇴 → 소유 모임 삭제 및 로그아웃
