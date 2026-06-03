# API 레퍼런스

> 이 파일은 API 연동 작업 시에만 읽는다. AGENTS.md에는 포함되지 않는다.

---

## 환경변수

백엔드 연동 시 `.env.local.example`을 `.env.local`로 복사 후 URL 설정:

```
NEXT_PUBLIC_API_URL=http://localhost:8080
```

---

## 현재 상태 (Mock 데이터)

현재 모든 화면은 하드코딩된 mock 데이터로 동작한다.

| mock 데이터 | 위치 |
|---|---|
| 모임 목록 | `src/app/meetings/page.tsx` 상단 `MEETINGS` 배열 |
| 추천 결과 | `src/app/meetings/[id]/recommendations/page.tsx` 상단 `RECS` 배열 |
| 시간 슬롯 | `src/app/invite/[token]/time-select/page.tsx` 상단 `DATES`, `TIMES` |
| 참여자 | `src/app/meetings/[id]/confirmed/page.tsx` 상단 `PARTICIPANTS` 배열 |

---

## 예정된 백엔드 API 엔드포인트 (Spring Boot)

```
POST /api/meetings                       모임 생성
GET  /api/meetings/{id}                  모임 조회
GET  /api/invites/{token}                초대 링크 조회
POST /api/invites/{token}/participants   참여자 등록
GET  /api/meetings/{id}/slots            시간 슬롯 조회
POST /api/meetings/{id}/availability     가능 시간 제출
GET  /api/meetings/{id}/recommendations  추천 결과
POST /api/meetings/{id}/confirm          일정 확정
GET  /api/meetings/{id}/calendar.ics     ICS 다운로드
```

---

## API 클라이언트 구조 (연동 시 생성)

```
src/
  lib/
    api/
      client.ts       # fetch 기본 설정 (baseURL, 헤더, 에러 처리)
      meetings.ts     # 모임 관련 API 함수
      invites.ts      # 초대 링크 관련 API 함수
      availability.ts # 가능 시간 제출 API 함수
  hooks/
    useMeetings.ts         # TanStack Query 훅
    useRecommendations.ts
    useAvailability.ts
  types/
    api.ts            # 공통 응답 타입 (ApiResponse<T>)
    meeting.ts        # Meeting, Participant, Slot 타입
```
