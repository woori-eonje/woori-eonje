# 우리 언제? — Claude Code Agent Rules

기간 기반 모임 시간 조율 서비스. 모임장이 조율 기간을 설정하면 참여자들이 가능한 시간을 제출하고, 시스템이 가장 많이 겹치는 시간 TOP 5를 추천한다.

## 브랜치 전략

```
main      → 배포 가능한 안정 버전
develop   → 통합 개발 브랜치 (기본 작업 브랜치)
feature/* → 기능 개발
fix/*     → 버그 수정
```

**작업 시작 전**: `develop` 기준으로 `feature/<기능명>` 브랜치를 만든다.  
예: `feature/time-select-api`, `feature/recommendations-ui`

**PR 대상**: `feature/*` → `develop`, `develop` → `main` (배포 준비 시)

---

## 서브에이전트 활용 가이드

### 언제 서브에이전트를 쓸 것인가

| 상황 | 에이전트 타입 | 이유 |
|---|---|---|
| 파일/심볼 위치 탐색 ("어디 있지?") | `Explore` | 빠른 read-only 탐색, 메인 컨텍스트 보호 |
| 구조 설계 / 접근법 비교 | `Plan` | 구현 전 전략 정리 |
| 독립적인 작업 두 개 동시에 | `general-purpose` × 2 병렬 | 서로 의존성이 없는 작업은 항상 병렬로 |

### 이 프로젝트에서 병렬로 처리하기 좋은 작업

- 여러 페이지 파일 동시 생성 (Invite + TimeSelect 등)
- 파일 읽기 + 의존성 분석 동시에
- 타입 체크 + 빌드 동시에

### 병렬 작업 시 주의
같은 파일을 두 에이전트가 동시에 쓰면 충돌한다. 편집 범위가 겹치면 순차 처리.

---

## 환경 제약 (중요)

- **Node.js 18.18.0** — 이 환경에서 실행됨
- **Next.js 15** (16 이상 불가 — Node 20+ 필요)
- **Tailwind CSS v3** (v4는 `@tailwindcss/oxide` 네이티브 바인딩 오류로 불가)
- **React 19**

패키지 설치 시 위 버전 범위를 벗어나지 않도록 주의한다.

## 개발 명령어

```bash
npm run dev       # 개발 서버 (기본 포트 3000)
npm run build     # 프로덕션 빌드
npm run lint      # ESLint
npx tsc --noEmit  # 타입 체크
```

## 프로젝트 구조

```
src/
  app/
    page.tsx                          # 랜딩 (롤링 카피 애니메이션)
    login/page.tsx                    # 로그인 / 회원가입
    meetings/
      page.tsx                        # 내 모임 목록 (모임장)
      new/page.tsx                    # 5단계 모임 생성 Wizard
      [id]/recommendations/page.tsx   # 추천 결과 TOP 5
      [id]/confirmed/page.tsx         # 최종 요약
    invite/
      [token]/page.tsx                # 초대 참여 (닉네임 입력)
      [token]/time-select/page.tsx    # 시간 선택 — 핵심 화면
      [token]/submitted/page.tsx      # 제출 완료
    globals.css                       # 디자인 토큰 + 전역 CSS 클래스
    layout.tsx
  components/
    icons.tsx    # Lucide 스타일 인라인 SVG 아이콘
    primitives.tsx  # Button, TopBar, Logo, StatusPill, BrandDecor
```

## 코딩 규칙

### Next.js 15 동적 라우트 params
Next.js 15부터 `params`는 **Promise**다. 클라이언트 컴포넌트에서는 반드시 `use(params)`로 언래핑한다.

```tsx
// ✅ 올바름
import { use } from "react";
export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
}

// ❌ 틀림 — 타입 에러 + 런타임 에러
export default function Page({ params }: { params: { id: string } }) {
  const { id } = params.id;
}
```

### 클라이언트 컴포넌트
`useState`, `useEffect`, `useRouter`, `use()` 등 훅을 쓰는 파일은 반드시 `"use client"`를 첫 줄에.

### 디자인 시스템 CSS 클래스
`globals.css`에 이미 정의된 클래스를 사용한다. Tailwind utility로 대체하지 않는다.

| 클래스 | 용도 |
|---|---|
| `.btn .primary/.secondary/.outline/.ghost/.danger` | 버튼 |
| `.card`, `.card.tight`, `.card.emphasis` | 카드 |
| `.slot`, `.s-available/.s-maybe/.s-unavail` | 시간 슬롯 |
| `.pill .ok/.maybe/.gray/.accent` | 상태 배지 |
| `.toggle` | 가능/애매/불가 모드 토글 |
| `.bottom-bar` | 하단 고정 CTA 영역 |
| `.topbar` | 상단 네비게이션 바 |
| `.h-scroll` | 가로 스크롤 (날짜 탭 등) |
| `.chip` | 빠른 선택 버튼 |
| `.t-h1/.t-h2/.t-h3/.t-body/.t-body2/.t-cap` | 타이포그래피 |
| `.skeleton` | 로딩 스켈레톤 |

### 컴포넌트 구조

```
src/
  components/
    ui/                   ← shadcn/ui 프리미티브 (Button, Input, Select, Badge, Separator)
    primitives.tsx         ← 앱 레이아웃 컴포넌트 (TopBar, Logo, StatusPill, BrandDecor)
    icons.tsx              ← Lucide 스타일 인라인 SVG 아이콘
    time-select/
      DateTab.tsx          ← 날짜 탭 버튼
      TimeSlot.tsx         ← 시간 슬롯 버튼 (가능/애매/불가 상태)
      ModeToggle.tsx       ← 가능/애매/불가 모드 선택 토글
    meeting/
      MeetingCard.tsx      ← 모임 목록 카드
      ParticipantRow.tsx   ← 참여자 행 (상태 배지 포함)
      StatRow.tsx          ← 가능/애매/불가 집계 행
  types/
    meeting.ts             ← 공유 도메인 타입 (Meeting, Participant, SlotState, Recommendation 등)
  lib/
    utils.ts               ← cn() 유틸 (tailwind-merge + clsx)
```

### 컴포넌트 임포트
```tsx
// UI 프리미티브 (shadcn/ui 기반)
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

// 앱 공용 컴포넌트
import { TopBar, Logo, StatusPill } from "@/components/primitives";
import { Calendar, Check, ChevronRight } from "@/components/icons";

// 도메인 컴포넌트
import { DateTab } from "@/components/time-select/DateTab";
import { TimeSlot } from "@/components/time-select/TimeSlot";
import { ModeToggle } from "@/components/time-select/ModeToggle";
import { MeetingCard } from "@/components/meeting/MeetingCard";
import { ParticipantRow } from "@/components/meeting/ParticipantRow";
import { StatRow } from "@/components/meeting/StatRow";

// 타입
import type { Meeting, Participant, SlotState, Recommendation } from "@/types/meeting";
```

### Button variants
primitives.tsx의 Button은 기존 variant API를 유지하면서 shadcn/ui를 내부 엔진으로 사용한다.

| primitives.tsx variant | shadcn/ui variant |
|---|---|
| `primary` | `default` (Forest bg) |
| `secondary` | `secondary` (soft Forest bg) |
| `outline` | `outline` (Forest border) |
| `ghost` | `ghost` |
| `danger` | `destructive` |

새 컴포넌트에서는 `@/components/ui/button`을 직접 써도 되고, primitives의 Button을 써도 된다.

## 디자인 토큰 (CSS 커스텀 프로퍼티)

```css
--color-primary:      #1A9562   /* Forest Green — 주요 액션, 버튼, 가능 상태 */
--color-accent:       #FF6B6B   /* Poppy — 로고 물음표, 파비콘, 작은 포인트만 */
--color-maybe:        #F5AB54   /* Mango — 애매 상태 */
--color-bg:           #F6F8FA   /* 페이지 배경 (쿨톤 라이트그레이) */
--color-surface:      #FFFFFF   /* 카드, 패널 */
--color-line:         #E5E7EB   /* 구분선 */
--color-text:         #333333
--color-text-2:       #6B7280
--color-text-muted:   #9CA3AF
```

**Poppy(`#FF6B6B`)는 CTA 버튼이나 배경에 절대 사용하지 않는다.** 로고 물음표, 필수 참석자 표시, 작은 장식 포인트에만 제한.

베이지/크림 계열 배경 사용 금지. 배경은 항상 `#F6F8FA` 또는 `#FFFFFF`.

## 현재 상태 (Mock 데이터)

현재 모든 화면은 하드코딩된 mock 데이터로 동작한다. 실제 API 연동 전 작업 시 참고:

- **mock 모임 데이터**: `src/app/meetings/page.tsx` 상단 `MEETINGS` 배열
- **mock 추천 결과**: `src/app/meetings/[id]/recommendations/page.tsx` 상단 `RECS` 배열
- **mock 시간 슬롯**: `src/app/invite/[token]/time-select/page.tsx` 상단 `DATES`, `TIMES`
- **mock 참여자**: `src/app/meetings/[id]/confirmed/page.tsx` 상단 `PARTICIPANTS` 배열

API 연동 시 백엔드 API 명세는 `src/app/meetings/new/page.tsx` 주석 또는 기획서 참조.

### 환경변수

백엔드 연동 시 `.env.local.example`을 `.env.local`로 복사 후 URL 설정:
```
NEXT_PUBLIC_API_URL=http://localhost:8080
```

### API 클라이언트 구조 (연동 시 생성)

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

### 예정된 백엔드 API 엔드포인트 (Spring Boot)
```
POST /api/meetings               모임 생성
GET  /api/meetings/{id}          모임 조회
GET  /api/invites/{token}        초대 링크 조회
POST /api/invites/{token}/participants  참여자 등록
GET  /api/meetings/{id}/slots    시간 슬롯 조회
POST /api/meetings/{id}/availability   가능 시간 제출
GET  /api/meetings/{id}/recommendations  추천 결과
POST /api/meetings/{id}/confirm  일정 확정
GET  /api/meetings/{id}/calendar.ics    ICS 다운로드
```

---

## 서비스 용어 (한국어)

| 용어 | 설명 |
|---|---|
| 모임장 | 모임 생성자 (로그인 필요) |
| 참여자 | 초대 링크로 참여하는 비회원 |
| 가능 / 애매 / 불가 | 시간 슬롯 3가지 응답 상태 |
| 조율 기간 | 후보 날짜 범위 |
| 응답 마감일 | 참여자 제출 마감 |
| 추천 결과 | 가장 많이 겹치는 시간 TOP 5 |
| invite_token | 모임 초대 UUID |
| participant_edit_token | 비회원 응답 수정용 토큰 |

## 응답 언어

Claude는 이 프로젝트에서 항상 **한국어**로 응답한다. 코드 설명, 질문, 오류 분석 등 모든 텍스트 응답이 포함된다. 코드 자체(변수명, 주석 등)는 영어를 유지해도 무방하다.

## 문장 톤

- **좋음**: "가능한 시간을 골라주세요", "가장 잘 맞는 시간을 찾았어요", "닉네임만 입력하면 바로 참여할 수 있어요"
- **나쁨**: "최적의 일정을 산출했습니다", "스케줄 매칭을 시작합니다", "참여자 응답 데이터가 없습니다"

친근하되 과하게 감성적이지 않게. 기계적인 표현 금지.
