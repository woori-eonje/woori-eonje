# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 프로젝트 개요

**우리 언제?** — 기간 기반 모임 시간 조율 서비스. 모임장이 조율 *기간*과 *예상 소요 시간*만 설정하면, 참여자들이 가능한 시간대를 제출하고 시스템이 가장 많이 겹치는 시간대를 TOP 5로 추천한다. (When2meet/Doodle류의 "후보 날짜 투표"가 아니라 "기간 내 겹치는 구간 계산"이 핵심 차별점.)

기획 전체의 단일 출처(source of truth)는 **`plan/whenwe_plan_v0.3.pdf`** 이다. 도메인 규칙·정책·에러코드·API 명세 초안이 모두 여기에 있으니, 도메인 판단이 필요할 때 이 문서를 우선 참조한다. UI 레퍼런스는 `wireframes/whenwe_wireframes.html`.

> **현재 상태: 코드 미생성(그린필드).** 아래 구조/명령어는 합의된 목표 아키텍처이며, 스캐폴딩 시 이 구조를 따른다.

## 아키텍처 (확정)

**모노레포 기반 Next.js + NestJS 분리 구조.** 백엔드를 분리하되 모노레포로 묶어 타입 공유·단일 PR 협업을 얻는다.

```
whenwe/
├─ apps/
│  ├─ web/      ← Next.js (App Router): 화면 렌더링, SSR/CSR
│  └─ api/      ← NestJS: 도메인 로직, 스케줄러, 인증
│       └─ Prisma → PostgreSQL
└─ packages/
   └─ types/    ← FE·BE 공유 DTO / Zod 스키마 (API 계약)
```

데이터 흐름: `브라우저 → web(Next.js) → API 호출 → api(NestJS) → PostgreSQL`

### 왜 이 구조인가 (의사결정 배경 — 바꾸기 전 반드시 인지)
- **백엔드 분리(NestJS)**: 추천 계산·상태머신·토큰 체계·스케줄러 등 "묵직한 도메인 로직"이 있어 화면 코드와 섞이면 안 됨.
- **상시 가동 서버 필요**: 응답 마감 자동 전환 **스케줄러(5~10분 주기)** 때문에 24시간 살아있는 호스트가 필요 → 서버리스(Vercel)에 백엔드를 두지 않고 NestJS를 상시 가동 호스트에 둔다.
- **모노레포 + `packages/types`**: 분리의 유일한 단점(타입 불일치/관리 분산)을 제거. API DTO를 FE·BE가 공유해 계약 위반이 컴파일 단계에서 잡히게 한다.
- **의도적으로 제외(오버엔지니어링 방지)**: Redis, 메시지 큐, MSA, DDD/헥사고날/CQRS, 초기 Docker/K8s. 전부 참여자·트래픽이 실제로 커지는 2차 항목. 백엔드 내부는 NestJS 기본 **Controller → Service → Repository(Prisma)** 3단 레이어까지만.

### 렌더링 전략 (Next.js)
- **SSR**: 랜딩/스플래시, 초대 참여 페이지 — 첫 로딩 속도, SEO, 카톡/SNS 공유 미리보기가 중요한 화면.
- **CSR**: 시간 슬롯 선택 UI, 추천 결과/내 모임 목록 — 인터랙션·실시간 갱신이 많은 화면.

## 기술 스택

- **web**: Next.js (App Router), TypeScript, Tailwind CSS, shadcn/ui, TanStack Query, React Hook Form, Zod, date-fns
- **api**: NestJS, Prisma, PostgreSQL, JWT 인증, `@nestjs/schedule`(`@Cron`), Swagger
- **배포**: web → Vercel / api → Railway·Render(상시 가동) / db → Neon
- **캐싱**: `recommendation_results` 테이블 기반 **DB 캐싱**. Redis는 쓰지 않는다(2차).

## 핵심 도메인 로직 (구현 시 정확히 따를 것 — 출처: 기획서)

### 추천 계산
- 시간 슬롯 단위는 **1시간**, 조율 기간 **최대 14일**.
- 응답 점수: **가능=2, 애매=1, 불가=0**.
- 예상 소요 시간이 N시간이면 **연속된 N개 슬롯**을 묶어 후보 구간 생성.
- **추천 우선순위(8단계 안정 정렬)**: ①필수참석자 전원 가능 → ②연속 구간 내 최소 가능 인원 多 → ③평균 점수 高 → ④불가 인원 少 → ⑤애매 인원 少 → ⑥미응답자 少 → ⑦빠른 날짜 → ⑧생성 순서(id/start_at 오름차순). 8단계까지 동일하면 항상 같은 결과를 반환(결정론적).
- **필수 참석자**: 모임 생성이 아니라 *응답 수집 후 추천 결과 화면*에서 모임장이 지정. 불가능 시간은 "제외"가 아니라 **"낮은 순위 처리"**(결과가 완전히 비는 상황 방지).
- **계산 시점**: 응답 제출 시 재계산 → `recommendation_results` 갱신. 조회 API는 계산하지 않고 저장된 결과만 반환.

### 비회원 참여 & 토큰 (두 토큰을 혼동하지 말 것)
- `invite_token`: 모임 **접근**용. UUID/랜덤. 기본 만료 = 응답 마감일. 재발급 시 기존 토큰 비활성화.
- `participant_edit_token`: 비회원 참여자의 **내 응답 수정**용. 클라이언트(localStorage)에 저장.
- 식별은 닉네임이 아니라 `participant_id + edit_token` 기준. **동일 닉네임 허용**, 닉네임으로 덮어쓰지 않음. edit token 없으면 새 참여자로 등록.

### 모임 상태머신
`DRAFT → COLLECTING → READY_TO_CONFIRM → CONFIRMED → CLOSED`
- 상태별로 가능한 액션을 **서버에서 강제 제한**한다 (예: READY_TO_CONFIRM 이후 참여자 응답 수정 불가).
- `response_deadline` 경과 시 **스케줄러가 COLLECTING → READY_TO_CONFIRM 자동 전환**. **자동 확정은 하지 않음**(모임장이 수동 확정).
- 중복 확정 방지: 상태 조건부 UPDATE — `UPDATE meetings SET status='CONFIRMED' WHERE id=? AND status IN ('COLLECTING','READY_TO_CONFIRM')`.

### 동시성
- `participant_availability` 는 `(participant_id, slot_id)` **unique**. 같은 슬롯 재제출은 insert가 아니라 **update**.
- 응답 저장과 추천 재계산은 한 트랜잭션으로 처리하거나, 재계산 실패 시 상태를 PENDING으로 남긴다.

## 데이터 모델 (7개 테이블)

`users` · `meetings` · `participants` · `availability_slots` · `participant_availability` · `recommendation_results` · `meeting_state_logs`

스키마 컬럼 정의는 기획서 23장 참조. 주요 인덱스 후보: `meetings.invite_token`, `meetings(status, response_deadline)`, `participants.meeting_id`, `participant_availability(participant_id, slot_id)`, `recommendation_results(meeting_id, rank)`.

## API 규약

- **공통 응답**: `{ "success": true, "data": {...}, "error": null }`
- **공통 에러**: `{ "success": false, "data": null, "error": { "code": "...", "message": "..." } }`
- 에러코드는 기획서 24장의 정의를 사용(`INVITE_TOKEN_EXPIRED`, `MEETING_ALREADY_CONFIRMED`, `FORBIDDEN_MEETING_OWNER_ONLY` 등). 새 에러는 같은 컨벤션으로 추가.
- API DTO/스키마는 `packages/types`에 정의하고 FE·BE가 공유한다. **API 변경 시 타입과 양쪽 사용처를 같은 PR에서 함께 수정.**
- 엔드포인트 초안 및 인증 필요 여부는 기획서 24장 참조(`/api/auth/*`, `/api/meetings`, `/api/invites/{inviteToken}/*`, `/api/meetings/{id}/availability|recommendations|confirm|calendar.ics`).

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

> **공유 타입 주의**: `@whenwe/types`는 `dist`(컴파일 산출물)를 export한다. 앱이 새 타입을 못 찾으면 `pnpm --filter @whenwe/types build`를 먼저 실행하거나 `dev`(watch)를 켜둘 것.

> **Prisma(아직 미설정)**: api에 Prisma 도입 후 `pnpm --filter api exec prisma migrate dev`, `... prisma studio` 사용. 도입 시 이 섹션 갱신.

> **Next.js 버전 주의**: `apps/web`는 Next.js 16(Turbopack)이다. `apps/web/AGENTS.md` 경고대로 학습 데이터와 API/관례가 다를 수 있으니, 화면 코드 작성 전 `node_modules/next/dist/docs/`의 관련 가이드를 확인할 것.

## 협업 규칙 (기획서 25장)

- 브랜치: `main`(배포) / `develop`(통합) / `feature/*` / `fix/*`. **1인 개발이면 `main` + `feature/*` 로 단순화 가능.**
- 기능 단위 PR, API 변경 시 FE/BE 양쪽 확인.
- 기술 의사결정은 `docs/decisions/`에 ADR로 기록(기획서 26장: 추천 전략, 토큰 정책, 상태 정책, 캘린더 내보내기 등).

## MVP 범위 경계

- **포함**: 인증, 모임 생성, 비회원 참여, 가능시간 제출, 추천 계산, 일정 확정, `.ics` 내보내기, 상태 전환 스케줄러.
- **제외(2차)**: 정기 모임, 장소 투표, 정산/채팅/댓글, 카카오 알림톡, PWA 푸시, Google Calendar OAuth, 지도 API, 복잡한 반복 일정. — 이 기능들을 MVP에 끌어들이지 않는다.
