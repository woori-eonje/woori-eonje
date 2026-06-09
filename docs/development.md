# 개발 가이드

## 명령어

pnpm workspace 모노레포. 모든 명령은 **루트에서** 실행한다.

```bash
pnpm install                          # 전체 워크스페이스 의존성 설치

# 개발 (공유 타입은 watch로 같이 띄워야 변경이 앱에 반영됨)
pnpm --filter @whenwe/types dev       # 공유 타입 watch (tsc -w)
pnpm --filter web dev                 # 프론트 개발 서버 (next dev, Turbopack)
pnpm --filter api start:dev           # 백엔드 개발 서버 (nest start --watch)

# 빌드
pnpm --filter @whenwe/types build     # 공유 타입 빌드 → dist (api/web가 런타임에 dist를 import)
pnpm build                            # 전체 빌드 (pnpm -r build)

# Lint / 테스트
pnpm --filter web lint                # 프론트 lint
pnpm --filter api lint                # 백엔드 lint
pnpm --filter api test                # 백엔드 전체 테스트 (jest)
pnpm --filter api test -- app.controller   # 단일 테스트 (정규식 패턴 매칭)
pnpm --filter api test:e2e            # e2e 테스트
```

## 환경 주의사항

- **공유 타입**: `@whenwe/types`는 `dist`(컴파일 산출물)를 export한다. 앱이 새 타입을 못 찾으면 `pnpm --filter @whenwe/types build`를 먼저 실행하거나 `dev`(watch)를 켜둘 것.
- **포트**: web=3000, api=3001(`main.ts`에서 `process.env.PORT ?? 3001`로 분리됨). 동시 구동 가능.
- **DB 연결**: `apps/api/.env`의 `DATABASE_URL` 사용. NestJS는 .env 자동 로드 안 하므로 `main.ts` 최상단에서 `import 'dotenv/config'`로 로드한다. 로컬은 brew PostgreSQL 17(`postgresql://sungjiwon@localhost:5432/whenwe`). `.env.example` 참고.
- **Prisma 7 주의**: `apps/api`에 Prisma 7 사용. v6 이전과 다른 점:
  - 연결 URL은 `schema.prisma`가 아니라 **`apps/api/prisma.config.ts`** 에서 관리. 스키마 datasource에 `url`을 다시 넣지 말 것.
  - 런타임 `PrismaClient`는 **드라이버 어댑터 필수**(Rust 엔진 제거됨). `@prisma/adapter-pg` + `pg`로 `PrismaService`(`src/prisma/`)에서 주입 완료. 전역 `PrismaModule`로 어디서나 주입 가능.
  - `prisma.config.ts`는 nest 빌드에서 제외(`tsconfig.build.json`)해야 `dist/main.js` 경로가 유지된다.
  - 명령(루트에서): `pnpm --filter api exec prisma validate | format | generate | migrate dev | studio`.
- **Next.js 버전 주의**: `apps/web`는 Next.js 16(Turbopack)이다. `apps/web/AGENTS.md` 경고대로 학습 데이터와 API/관례가 다를 수 있으니, 화면 코드 작성 전 `node_modules/next/dist/docs/`의 관련 가이드를 확인할 것.

## 협업 규칙

- 브랜치: `main`(배포) / `develop`(통합) / `feature/*` / `fix/*`. **1인 개발이면 `main` + `feature/*` 로 단순화 가능.**
- 기능 단위 PR, API 변경 시 FE/BE 양쪽 확인.
- 기술 의사결정은 `docs/decisions/`에 ADR로 기록(기획서 26장: 추천 전략, 토큰 정책, 상태 정책, 캘린더 내보내기 등).

## 개발 규칙

> 이 섹션은 사용자가 직접 채워 넣는다. (코딩 컨벤션, 네이밍, 커밋 규칙, 리뷰 기준 등)
> 여기에 적힌 규칙은 CLAUDE.md의 `@docs/development.md` import를 통해 항상 적용된다.

- **CRITICAL — 구현 후 독립 검증**: 각 작업(플랜)의 구현이 끝나면 **반드시 `code-reviewer` 서브에이전트로 검증**한다. **구현을 담당한 에이전트(또는 메인 세션)는 자신의 코드를 직접 리뷰하지 않는다** — 독립된 리뷰어가 검수한다.
  - 리뷰 기준: 정확성/버그, 프로젝트 표준(CLAUDE.md §1~4·docs), **API 계약 일치(`openapi/openapi.yaml`)**, 도메인 규칙(`docs/domain.md`).
  - 리뷰어가 지적한 사항은 구현 측이 반영하고, 필요 시 재검증한다.

<!-- 추가 개발 규칙(컨벤션·네이밍·커밋 등)을 여기에 적으세요 -->
