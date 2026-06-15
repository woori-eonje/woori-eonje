# 백엔드 작업 — 프론트 요청 triage (v1.5)

프론트 요청 원본: `docs/frontend-api-requests.md` (9건).
이 문서는 그걸 **백엔드 관점**에서 분류한다 — 난이도 · 계약/스키마 영향 · 도메인 결정 필요 여부 · 의존성 · 권장 순서.

> 범례: 🟢 작음(반나절) · 🟡 보통(1일) · 🔴 큼(설계 결정 동반)

---

## A. 바로 가능 (계약 소폭 확장, 도메인 결정 불필요)

### #1 🟢 `MeetingSummary` + `respondedCount`·`category`
- **무엇**: 내 모임 목록 카드의 "0/0명·친구" 하드코딩 해소.
- **백엔드**: `respondedCount` = 그 모임에서 **availability 행이 1개 이상인 participant 수**(`distinct participantId` from `participant_availability`). `category`는 컬럼 그대로.
- **계약**: `MeetingSummary`에 2필드 추가(openapi+types). listMyMeetings 매핑.
- **주의**: "0/0명"의 분모(전체 참여자 수)도 필요하면 `participantCount`도 같이. (FE 요청은 respondedCount만이지만 화면이 `n/m`이면 m도 필요 — FE와 확인)

### #3.5 🟢 `InvitePublic` + `confirmedStartAt`·`confirmedEndAt`
- **무엇**: CONFIRMED 모임 초대 링크에서 확정 시간 표시(현재 "준비 중" 임시 문구).
- **백엔드**: status==='CONFIRMED'일 때만 채움(아니면 null). meeting의 confirmed* 그대로.
- **계약**: `InvitePublic`에 nullable 2필드. **공개 엔드포인트라 확정시간이 공개됨** — 의도된 동작(링크 가진 사람이 확정시간 봄). OK.

### #2 🟡 `GET /api/meetings/{id}/participants` 신규
- **무엇**: 필수참석자 지정 UI(블로커). 참여자 목록 + 응답 여부.
- **백엔드**: 신규 엔드포인트(owner 가드). `{ participantId, guestName, participantType, isRequired, hasResponded }[]`. hasResponded = availability 행 존재.
- **계약**: 신규 path + `ParticipantWithStatus`(또는 기존 `Participant`+hasResponded) 타입.

### #3 🟡 `GET /api/meetings/{id}/aggregate` 신규 (히트맵)
- **무엇**: 대시보드 "응답 현황" 히트맵 실데이터.
- **백엔드**: 슬롯별 가능/애매/불가 카운트. **추천 엔진이 내부에서 하는 per-slot 집계와 동일** — 그 로직 일부를 노출/재사용 가능. owner 가드.
- **계약**: 신규 path + `SlotAggregate[]`.

### #9 🟢 `DELETE /api/meetings/{id}` 신규
- **무엇**: 모임 삭제(모임장, 언제든).
- **백엔드**: owner 가드 → `meeting.delete`. **스키마가 이미 `onDelete: Cascade`**(participants·slots·availability·recommendations·state_logs) → 연쇄 삭제 자동.
- **계약**: 신규 path. 204 or 200 Empty.

---

## B. 보통 — 계약/로직 확장

### #8 🟡 `PATCH /api/meetings/{id}` 모임 수정
- **무엇**: 응답자 없을 때만 수정 허용.
- **백엔드**: owner 가드 + `respondedCount === 0` 검증(아니면 409). 날짜/시간/소요 바뀌면 **슬롯 재생성**(기존 삭제 후 generateSlots) — create 로직 상당 부분 재사용. 새 ErrorCode `RESPONSE_ALREADY_EXISTS`(FE가 제안한 이름).
- **의존성**: #1(respondedCount 계산) 로직 공유.
- **계약**: 신규 PATCH path + ErrorCode 추가.

### #6 🟡 `POST /api/meetings` 에 `dates[]` (특정 날짜)
- **무엇**: 범위 대신 특정 날짜들만 후보로.
- **백엔드**: `dates` optional 배열. 있으면 그 날짜들로만 슬롯 생성, 없으면 기존 범위. `generateSlots` 를 "날짜 목록 받는" 형태로 일반화(범위→날짜목록으로 변환해 한 경로로). 14일 상한·검증 조정.
- **계약**: `CreateMeetingRequest`에 `dates?: string[]`.

---

## C. 🔴 도메인 결정 필요 (착수 전 합의)

### #7 🔴 슬롯을 1시간 → "소요시간 길이 블록"으로 — **추천 엔진과 충돌**
- **무엇(FE)**: 참여자가 "18:00–20:00, 19:00–21:00" 같은 **소요시간 블록**으로 선택하길 원함(UX 명확).
- **충돌 지점**: 우리 도메인은 **"1시간 슬롯 저장 + 추천 엔진이 연속 N개를 묶어 후보 생성"**. FE가 원하는 건 그 *후보 구간*을 선택 단위로 노출하는 것. 그런데:
  - 슬롯 자체를 N시간 블록으로 만들면 **블록이 겹침**(18-20, 19-21…) → 한 시각이 여러 슬롯에 속해 저장·집계·추천이 꼬임.
  - 추천 엔진의 "1시간 슬롯에서 연속 N개 묶기"가 무의미해짐(이미 묶인 걸 또 묶음).
- **결정 옵션**:
  - **(a)** DB는 1시간 슬롯 유지(엔진·집계 그대로) + **GET slots 응답에 `windows`(후보 구간) 배열을 추가 제공** → FE는 window로 표시. 단 **제출은 여전히 1시간 슬롯 단위**(window 선택 시 그 안의 1h 슬롯들을 같은 상태로 전송). 가장 적은 변경, 엔진 무손상. **추천(권장)**.
  - **(b)** 슬롯을 N시간 겹침 블록으로 전면 변경 → 저장/집계/엔진 전부 재설계. 큼.
- **참고**: 추천엔진 만들 때 사용자(나)가 "묶어서 하나의 선택지로 보는 게 맞다"고 했던 방향과 (a)가 부합. **이 결정부터 하고 진행.**

### #4 🔴 Bearer 있으면 participant를 `MEMBER`로 생성 (계정 연동)
- **무엇**: 로그인 사용자가 초대 참여 시 GUEST가 아니라 계정 연동된 MEMBER로.
- **백엔드**: `POST participants` 가 Authorization 있으면 토큰 검증 → `userId` 채우고 `participantType=MEMBER`. 없으면 기존 GUEST(하위호환).
- **도메인 영향**: 현재 "식별 = participant_id + edit_token, 동일 닉네임 허용" 규칙에 **"같은 user가 같은 모임 중복 참여 방지"**(userId+meetingId unique?) 추가 필요. edit_token vs userId 식별 이원화.
- **계약/스키마**: 큰 변경 없음(userId 컬럼 이미 있음). 식별 규칙 정리 필요.

### #5 🔴 `GET /meetings` 에 "참여한 모임" + `role`
- **무엇**: 내가 만든 모임뿐 아니라 **참여자로 등록된 모임**도 목록에.
- **의존성**: **#4 선행**(MEMBER로 userId 연동돼 있어야 "내가 참여한 모임"을 조회 가능).
- **백엔드**: owned(ownerId=me) + participated(participants.userId=me) 합집합, `role: ORGANIZER|PARTICIPANT`.
- **계약**: `MeetingSummary`에 `role` 추가, 쿼리 분기.

---

## 권장 순서

```
1차 (작은 것 + 블로커 해소):  #1 → #3.5 → #9 → #2 → #3
2차 (보통):                  #8(→#1 의존) → #6
3차 (도메인 결정 후):         #7 결정 → 구현,  그다음 #4 → #5(계정 연동 묶음)
```

- **#7·#4·#5는 코딩 전에 결정/합의 먼저.** 특히 #7은 추천 엔진을 건드릴 수 있어 옵션 (a)/(b) 택일이 선행.
- 나머지(#1·#2·#3·#3.5·#8·#9·#6)는 기존 패턴(owner 가드·봉투·계약 SSOT·슬라이스+리뷰) 위에 그대로 얹으면 됨.

> 이 목록은 FE 요청 기준의 **v1.5 백로그**. 별도의 운영/배포/테스트 항목은 `docs/backend-roadmap-v2.md` 참조.
