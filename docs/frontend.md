# 프론트엔드 가이드

새 화면 추가 시 **코드베이스 자체가 SSOT**다.

## 디자인 SSOT (현재 기준)

| 필요한 것 | 위치 |
|---|---|
| 색·타입 토큰 (`--color-primary` 등) | `apps/web/app/globals.css` |
| Button, TopBar, StatusPill 등 프리미티브 | `apps/web/components/primitives.tsx` |
| 카드·슬롯·배지 등 CSS 클래스 | `apps/web/app/globals.css` |
| 아이콘 | `apps/web/components/icons.tsx` (Lucide 래퍼) |
| 도메인 컴포넌트 | `apps/web/components/meeting/`, `time-select/` |
| 에셋 (logo.svg, favicon.svg, 폰트) | `apps/web/public/` |
| 화면 패턴 레퍼런스 | 기존 `apps/web/app/` 페이지들 |

## 절대 규칙

- **Primary CTA**: Forest `#1A9562` (`.btn.primary`). 화면당 1개.
- **Poppy `#FF6B6B`**: 로고 `?`, 필수 표시 dot, 소형 장식에만. CTA·배경 절대 금지.
- 배경: `#F6F8FA` 또는 `#FFFFFF`. 베이지·크림 금지.
- 카드: 흰색 · `1px #E5E7EB` 보더 · `border-radius 20px`.
- 시간 슬롯 상태: 색 + 라벨 + 아이콘 항상 함께 (색만으로 구분 금지).
- 톤: 해요체. "최적의 일정을 산출했습니다" 같은 SaaS 말투 금지.

## 구조 규칙

- **렌더링**: 랜딩·초대 = SSR / 시간선택·추천결과 = CSR (`docs/architecture.md` 참고)
- **참여자 플로우**: 데스크톱에서도 모바일 폭(420–480px 중앙 컬럼) 유지
- **동적 라우트**: `use(params)` 필수 (Next.js 15)
- **Tailwind utility와 globals.css 클래스 혼용 금지** — globals.css 클래스 우선
