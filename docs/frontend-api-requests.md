# 프론트엔드 API 요청 사항

프론트 작업 중 백엔드 API 미지원으로 구현이 블록된 항목들.
각 항목에 영향 받는 화면과 현재 임시 처리 상태를 명시한다.

---

## 즉시 필요 (현재 UI가 목데이터로 동작 중)

### 1. `GET /api/meetings` — `MeetingSummary` 필드 추가

```yaml
MeetingSummary:
  + respondedCount: integer   # 응답 완료 참여자 수
  + category: MeetingCategory # FRIEND | STUDY | BUSINESS
```

**영향 화면:** 내 모임 목록(`/meetings`)
**현재 상태:** 응답인원 항상 `0/0명`, 카테고리 항상 "친구" 하드코딩

---

### 2. `GET /api/meetings/{meetingId}/participants` 신규

```yaml
응답:
  participants:
    - participantId: integer
      guestName: string
      participantType: MEMBER | GUEST
      isRequired: boolean
      hasResponded: boolean
```

**영향 화면:** 필수 참석자 지정 UI (대시보드 추천 탭, `/status`)
**현재 상태:** 필수 참석자 지정 UI 자체가 구현 불가 상태

---

### 3. `GET /api/meetings/{meetingId}/aggregate` 신규

```yaml
응답:
  slots:
    - slotId: integer
      startAt: date-time
      availableCount: integer
      maybeCount: integer
      unavailableCount: integer
```

**영향 화면:** 대시보드 "응답 현황" 탭 히트맵
**현재 상태:** 2026년 6월 기준 하드코딩된 목데이터로 렌더링 중

---

## 참여자-계정 연동 플로우

로그인한 모임장이 다른 사람 초대 링크로 참여할 때 계정과 연동되어야 함.
현재 프론트는 로그인 상태 감지 + 닉네임 자동 입력까지 구현 완료.
계정 연동은 아래 두 API 수정 후 연결 예정.

### 4. `POST /api/invites/{token}/participants` 수정

```yaml
변경: Bearer 토큰 포함 시 participantType을 MEMBER로 생성, 계정 연동
      토큰 없으면 기존 GUEST 방식 유지 (하위 호환)
```

**영향 화면:** 초대 참여 화면(`/invite/[token]`)
**현재 상태:** 항상 GUEST로만 생성됨

---

### 5. `GET /api/meetings` — 참여한 모임 포함

```yaml
변경:
  - 내가 참여자로 등록된 모임도 응답에 포함
  - role: "ORGANIZER" | "PARTICIPANT" 필드 추가
```

**영향 화면:** 내 모임 목록 — "내가 참여한 모임" 탭
**현재 상태:** 내가 만든 모임만 표시. 참여한 모임 탭 구현 불가

---

## 위자드 입력 방식 개선

### 6. `POST /api/meetings` — 특정 날짜 배열 지원

현재 API는 `startDate`/`endDate` 범위만 받음. 주말만, 또는 특정 날짜들만 후보로 두고 싶은 경우 지원 불가.

```yaml
변경 방향 (안):
  dates 배열 추가 (optional):
    - dates가 있으면 해당 날짜들만 슬롯 생성
    - dates가 없으면 기존 startDate~endDate 전체 범위 사용

예시:
  dates: ["2026-07-05", "2026-07-06", "2026-07-12", "2026-07-13"]  # 주말만
```

**영향 화면:** 모임 생성 위자드 Step 2 — 특정 날짜 선택 기능 (현재 범위 선택만 가능)

---

### 7. 참여자 가능 시간 슬롯 — 소요시간 단위 블록으로 변경

현재 `GET /api/meetings/{id}/slots`가 1시간 단위 슬롯을 반환함. 모임 소요시간이 2시간이면 참여자는 "18:00–20:00", "19:00–21:00" 같은 블록 단위로 선택해야 UX가 명확함.

```yaml
변경 방향:
  - 슬롯 생성 시 1시간 단위 대신 durationHours 길이의 슬롯으로 생성
  - 또는 slots 응답에 windowSlots 배열 추가 (연속 슬롯 묶음)

예시 (2시간 소요, 18:00~23:00):
  슬롯 목록:
    - { slotId: 1, startAt: "18:00", endAt: "20:00" }
    - { slotId: 2, startAt: "19:00", endAt: "21:00" }
    - { slotId: 3, startAt: "20:00", endAt: "22:00" }
    - { slotId: 4, startAt: "21:00", endAt: "23:00" }
```

**영향 화면:** 참여자 시간 선택 화면 — 현재 1시간 단위 슬롯을 나열 중

---

## 모임 수정 / 삭제

### 8. `PATCH /api/meetings/{meetingId}` 신규 — 모임 수정

```yaml
조건: respondedCount === 0 일 때만 허용 (1번 MeetingSummary 필드 추가 선행 필요)
수정 가능 필드:
  - title, description, category
  - startDate, endDate, availableStartTime, availableEndTime, durationHours, responseDeadline
에러:
  - 409 RESPONSE_ALREADY_EXISTS: 이미 응답자가 있을 경우 거부
```

**영향 화면:** 대시보드 / status 페이지에 "모임 수정" 버튼 추가 예정
**현재 상태:** 모임 수정 불가

---

### 9. `DELETE /api/meetings/{meetingId}` 신규 — 모임 삭제

```yaml
조건: 언제든 삭제 가능 (모임장만)
동작: 모임 + 참여자 + 가능시간 + 추천결과 cascade 삭제
에러:
  - 403 FORBIDDEN_MEETING_OWNER_ONLY
```

**영향 화면:** 대시보드 / status 페이지에 "모임 삭제" 버튼 추가 예정
**현재 상태:** 모임 삭제 불가

---

## 우선순위 제안

```
1번 (MeetingSummary 필드) — 가장 눈에 띄는 버그성 이슈, 변경 범위 작음
2번 (참여자 목록)         — 필수 참석자 UI 전체 블로커
3번 (aggregate)           — 히트맵 실데이터화, 신규 엔드포인트
7번 (슬롯 블록화)         — 참여자 UX 핵심 개선, 슬롯 생성 로직 변경
8+9번 (수정/삭제)         — 모임 관리 기본 기능, 1번 선행 필요
4+5번 (계정 연동)         — 기능 확장, 도메인 모델 변경 수반
6번 (특정 날짜 선택)      — 위자드 UX 개선, API 확장
```
