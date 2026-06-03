# 코딩 레퍼런스

> 이 파일은 구현 작업 시에만 읽는다. AGENTS.md에는 포함되지 않는다.

---

## Next.js 15 동적 라우트 params

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

## 클라이언트 컴포넌트

`useState`, `useEffect`, `useRouter`, `use()` 등 훅을 쓰는 파일은 반드시 `"use client"`를 첫 줄에.

---

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

---

## 컴포넌트 임포트 패턴

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

> 임포트 패턴은 기존 파일에서 먼저 파악한다. 이 목록은 참고용.

---

## Button variants

primitives.tsx의 Button은 기존 variant API를 유지하면서 shadcn/ui를 내부 엔진으로 사용한다.

| primitives.tsx variant | shadcn/ui variant |
|---|---|
| `primary` | `default` (Forest bg) |
| `secondary` | `secondary` (soft Forest bg) |
| `outline` | `outline` (Forest border) |
| `ghost` | `ghost` |
| `danger` | `destructive` |

새 컴포넌트에서는 `@/components/ui/button`을 직접 써도 되고, primitives의 Button을 써도 된다.

---

## 디자인 시스템 CSS 클래스

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

---

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
