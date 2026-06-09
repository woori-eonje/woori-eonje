# 아키텍처

## 구조: 모노레포 기반 Next.js + NestJS 분리

백엔드를 분리하되 모노레포로 묶어 타입 공유·단일 PR 협업을 얻는다.

```
whenwe/
├─ apps/
│  ├─ web/      ← Next.js (App Router): 화면 렌더링, SSR/CSR
│  └─ api/      ← NestJS: 도메인 로직, 스케줄러, 인증
│       └─ Prisma → PostgreSQL
└─ packages/
   └─ types/    ← FE·BE 공유 타입 / DTO (API 계약)
```

데이터 흐름: `브라우저 → web(Next.js) → API 호출 → api(NestJS) → PostgreSQL`

## 왜 이 구조인가 (의사결정 배경 — 바꾸기 전 반드시 인지)

- **백엔드 분리(NestJS)**: 추천 계산·상태머신·토큰 체계·스케줄러 등 "묵직한 도메인 로직"이 있어 화면 코드와 섞이면 안 됨.
- **상시 가동 서버 필요**: 응답 마감 자동 전환 **스케줄러(5~10분 주기)** 때문에 24시간 살아있는 호스트가 필요 → 서버리스(Vercel)에 백엔드를 두지 않고 NestJS를 상시 가동 호스트에 둔다.
- **모노레포 + `packages/types`**: 분리의 유일한 단점(타입 불일치/관리 분산)을 제거. API DTO를 FE·BE가 공유해 계약 위반이 컴파일 단계에서 잡히게 한다.
- **의도적으로 제외(오버엔지니어링 방지)**: Redis, 메시지 큐, MSA, DDD/헥사고날/CQRS, 초기 Docker/K8s. 전부 참여자·트래픽이 실제로 커지는 2차 항목. 백엔드 내부는 NestJS 기본 **Controller → Service → Repository(Prisma)** 3단 레이어까지만.

## 렌더링 전략 (Next.js)

- **SSR**: 랜딩/스플래시, 초대 참여 페이지 — 첫 로딩 속도, SEO, 카톡/SNS 공유 미리보기가 중요한 화면.
- **CSR**: 시간 슬롯 선택 UI, 추천 결과/내 모임 목록 — 인터랙션·실시간 갱신이 많은 화면.

## 기술 스택

- **web**: Next.js 16 (App Router), TypeScript, Tailwind CSS, shadcn/ui, TanStack Query, React Hook Form, Zod, date-fns
- **api**: NestJS 11, Prisma, PostgreSQL, JWT 인증, `@nestjs/schedule`(`@Cron`), Swagger
- **공유**: `@whenwe/types` (워크스페이스 패키지)
- **배포**: web → Vercel / api → Railway·Render(상시 가동) / db → Neon
- **캐싱**: `recommendation_results` 테이블 기반 **DB 캐싱**. Redis는 쓰지 않는다(2차).
