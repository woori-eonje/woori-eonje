# 배포 가이드 — Vercel + Railway + Neon

## 구성
```
web (apps/web, Next 16)  → Vercel        (SSR/정적)
api (apps/api, NestJS)   → Railway       (상시 가동 컨테이너)
db  (PostgreSQL)         → Neon          (클라우드 Postgres, 무료 티어)
```
**왜 Railway(상시 가동)인가**: `@nestjs/schedule`로 마감 자동 전환(COLLECTING→READY_TO_CONFIRM) cron이 도므로 persistent 프로세스가 필요. 서버리스(Vercel Functions)나 sleep 되는 무료 호스트로는 cron이 불안정.

> DB는 종류가 바뀌는 게 아니라 **같은 PostgreSQL을 Neon이 호스팅**할 뿐. 코드/Prisma 무변경, `DATABASE_URL`만 교체.

---

## 환경변수

### api (Railway)
| 키 | 예시 | 비고 |
|---|---|---|
| `DATABASE_URL` | `postgresql://U:P@ep-xxx.aws.neon.tech/whenwe?sslmode=require` | Neon **직접(direct)** 연결, `sslmode=require` 필수 |
| `JWT_SECRET` | (랜덤 64자+) | 미설정 시 부팅 실패 |
| `WEB_BASE_URL` | `https://woori-eonje.vercel.app` | inviteUrl · 비밀번호 재설정 링크 생성용 |
| `CORS_ORIGIN` | `https://woori-eonje.vercel.app` | 쉼표로 여러 개 가능 |
| `PORT` | (Railway 자동 주입) | 코드가 `process.env.PORT` 사용 |
| `RESEND_API_KEY` | `re_xxxxxxxx` | **미설정 시 부팅 실패** — `MailService` 생성자가 예외를 던져 앱 전체가 안 뜬다 |
| `MAIL_FROM` | `noreply@woori-eonje.app` | 비밀번호 재설정 발신 주소. Resend 에서 SPF/DKIM 인증이 끝난 도메인이어야 실제 발송됨. 미설정 시 이 값으로 폴백 |

### web (Vercel)
| 키 | 예시 |
|---|---|
| `NEXT_PUBLIC_API_URL` | `https://woori-eonje-api.up.railway.app` |

---

## 절차

### 1. Neon (DB)
1. neon.tech 프로젝트 생성 → DB(`whenwe`) 생성.
2. **Connection string** 복사 — 상시 가동 서버이므로 *pooled*가 아니라 **direct** 엔드포인트 권장, `sslmode=require` 포함.
3. (마이그레이션은 아래 Railway 배포 시 `prisma migrate deploy`가 자동 적용 — 수동으로 미리 할 필요 없음.)

### 2. Railway (api)
1. New Project → Deploy from GitHub repo (이 레포, 브랜치 `develop-fetch` 또는 `main`).
2. **Settings**:
   - **Build Command**:
     ```
     pnpm install --frozen-lockfile && pnpm --filter @whenwe/types build && pnpm --filter api build
     ```
     (install 시 `postinstall: prisma generate`로 Prisma 클라이언트 생성됨)
   - **Start Command**:
     ```
     pnpm --filter api db:deploy && pnpm --filter api start:prod
     ```
     (`db:deploy` = `prisma migrate deploy` → 운영 DB에 마이그레이션 적용, 그 후 `node dist/main`)
3. **Variables**: 위 api 환경변수 입력 (`DATABASE_URL`은 Neon 문자열).
4. 배포 후 공개 도메인 확인(예: `https://...up.railway.app`). 헬스 체크: `GET /api/invites/<없는토큰>` → 404 봉투면 정상 기동.

### 3. Vercel (web)
1. Import Git Repository → 이 레포 선택.
2. **Root Directory**: `apps/web`.
3. **Build Command** (override): `pnpm --filter @whenwe/types build && pnpm run build`
   - (`@whenwe/types` dist를 먼저 빌드해야 web이 타입을 찾음. pnpm `--filter`는 워크스페이스 어디서든 해소됨.)
4. Install Command: 기본(pnpm). Output: 기본(`.next`).
5. **Environment Variables**: `NEXT_PUBLIC_API_URL` = Railway api 도메인.

### 4. 마무리 (양쪽 도메인 확정 후)
- Railway `CORS_ORIGIN`·`WEB_BASE_URL`을 **실제 Vercel 도메인**으로 설정 → api 재배포.
- Vercel `NEXT_PUBLIC_API_URL`을 실제 Railway 도메인으로 → web 재배포.
- 전체 플로우 점검: 회원가입→로그인→모임생성→초대링크→비회원 참여→제출→추천→확정→.ics.

---

## 흔한 함정
- **CORS**: api `CORS_ORIGIN`이 Vercel 도메인과 정확히 일치해야 함(프로토콜·서브도메인 포함). Vercel preview 도메인까지 허용하려면 쉼표로 추가.
- **Neon SSL**: `DATABASE_URL`에 `sslmode=require` 빠지면 연결 실패. 런타임은 `pg` 드라이버 어댑터가 이 문자열을 그대로 사용.
- **마이그레이션**: 운영은 `prisma migrate dev`가 아니라 **`prisma migrate deploy`**(Start Command에 포함됨). 새 마이그레이션을 만들면 커밋→재배포 시 자동 적용.
- **빌드 순서**: 항상 `@whenwe/types`를 먼저 빌드(양쪽 다). 안 하면 타입 못 찾음.
- **시드**: `prisma/seed.ts`는 데모용. 운영에선 실행하지 않음(데모 모임/유저가 필요하면 별도 판단).
