# 프론트엔드 / 디자인 가이드

PC·모바일 화면을 `design-system/` 기준으로 구현한다. **이 문서는 "프로젝트에 어떻게 붙이는가"(통합)만** 다루고, 실제 디자인 규칙(색·타입·아이콘·카피·UI킷)은 중복하지 않고 아래 SSOT를 가리킨다.

## 디자인 SSOT (단일 출처)

- **`design-system/project/SKILL.md`** — 에이전트용 진입점 + 절대 규칙(Hard rules). **화면 작업 전 필독.**
- **`design-system/project/README.md`** — 브랜드 브리프, 콘텐츠 톤(해요체), 비주얼 파운데이션, 아이코노그래피 전문.
- **`design-system/project/colors_and_type.css`** — 색·타입 토큰 단일 출처(`--color-primary` 등).
- **`design-system/project/ui_kits/`** — `mobile/`, `desktop/` JSX 프로토타입. 픽셀 기준이지 복붙 대상은 아님.
- **`design-system/project/assets/` · `fonts/`** — logo.svg, favicon.svg, Pretendard woff2.
- 출처: claude.ai/design 핸드오프 번들. Figma 없음 → 마크다운 브리프 + SVG가 진실.

> 프로토타입을 그대로 복사하지 말 것. 시각 결과를 **Next.js + Tailwind로 픽셀 충실하게 재구현**한다(내부 구조는 우리 스택에 맞게).

## 절대 규칙 요약 (전체는 SKILL.md)

- **Primary는 화면당 1개**, 항상 Forest `#1A9562`. **Poppy `#FF6B6B`는 로고 "?"·파비콘·필수표시·작은 인라인 강조에만** — CTA/배경 금지.
- 배경은 쿨그레이 `#F6F8FA` 또는 흰색. **베이지/크림 금지.**
- 카드: 흰색 · `1px #E5E7EB` 보더 · `border-radius 20px` · 그림자 거의 없음.
- 시간 슬롯 상태(가능/애매/불가)는 **색 + 라벨 + 아이콘** 항상 함께(색만으로 구분 금지).
- 톤은 해요체. "최적의 일정을 산출했습니다" 같은 SaaS 말투 금지.
- 3D·그라데이션·가짜 대시보드·이모지 장식 금지.

## 프로젝트 통합 방법 (apps/web)

> 화면 구현 시작할 때 채워나간다. 현재는 계획만.

- **폰트**: `design-system/project/fonts/PretendardVariable.woff2` → `apps/web`로 복사 후 `@font-face`(또는 `next/font/local`)로 등록. 외부 CDN 안 씀.
- **토큰**: `colors_and_type.css`의 토큰을 **Tailwind v4 `@theme`** + CSS 변수로 이식 (`globals.css`). 색/라운드/타입 스케일을 디자인 토큰과 일치.
- **아이콘**: Lucide(`lucide-react`). 스트로크 1.75–2px, 라운드 캡, 20/24px.
- **에셋**: `logo.svg`/`favicon.svg` → `apps/web/public`(또는 컴포넌트).
- **렌더링**(docs/architecture.md): 랜딩·초대 = SSR / 시간선택·추천결과 = CSR.
- **참여자 플로우는 데스크톱에서도 모바일 폭(420–480px 중앙 컬럼)** 으로 유지.

## 구현 순서 (권장)

1. 파운데이션 — 폰트·토큰·에셋·Lucide·기본 레이아웃
2. 프리미티브 — Button, TopBar, StatusPill, Card (`ui_kits/mobile/Primitives.jsx` 참고)
3. 우선 화면(브리프 우선순위) — 모바일 **시간선택 + 추천결과**
4. 참여자 플로우 나머지 — 랜딩·초대·제출완료·확정
5. 모임장 — 마이미팅·5단계 위저드 → 데스크톱 대시보드(응답 히트맵·추천)
