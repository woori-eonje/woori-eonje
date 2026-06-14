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

## 우선순위 제안

```
1번 (MeetingSummary 필드) — 가장 눈에 띄는 버그성 이슈, 변경 범위 작음
2번 (참여자 목록)         — 필수 참석자 UI 전체 블로커
3번 (aggregate)           — 히트맵 실데이터화, 신규 엔드포인트
4+5번 (계정 연동)         — 기능 확장, 도메인 모델 변경 수반
```
