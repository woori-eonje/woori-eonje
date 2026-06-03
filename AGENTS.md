# 우리 언제? — Claude Code Agent Rules

기간 기반 모임 시간 조율 서비스. 모임장이 조율 기간을 설정하면 참여자들이 가능한 시간을 제출하고, 시스템이 가장 많이 겹치는 시간 TOP 5를 추천한다.

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

### 컴포넌트 임포트
```tsx
import { Button, TopBar, Logo, StatusPill } from "@/components/primitives";
import { Calendar, Check, ChevronRight, ... } from "@/components/icons";
```

`Button`에는 `variant="primary"` 또는 boolean shorthand(`primary`, `outline` 등) 모두 가능.

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
