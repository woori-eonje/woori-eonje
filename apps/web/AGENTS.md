# 우리 언제? — 프론트엔드 Agent Rules (Claude Code · Codex 공용)

기간 기반 모임 시간 조율 서비스. 모임장이 조율 기간을 설정하면 참여자들이 가능한 시간을 제출하고, 시스템이 가장 많이 겹치는 시간 TOP 5를 추천한다.

> **이 파일은 Claude Code와 Codex가 함께 읽는 공통 기준 문서다.**
> Claude Code는 `CLAUDE.md → @AGENTS.md` 경유, Codex는 `AGENTS.md` 직접 읽음.
> 루트 `CLAUDE.md`의 공통 코딩 지침과 함께 사용한다.

---

## 멀티에이전트 협업 정책

**기본 작업 방식은 순차(릴레이)다.** 한 에이전트가 토큰을 소진하거나 작업 단위를 마치면 다른 에이전트가 이어받는다. 병렬 작업은 예외적인 경우에만 사용한다.

### 브랜치 분리 원칙 (병렬 작업 시에만 적용)

```
feature/cc-*  → Claude Code 작업 브랜치
feature/cx-*  → Codex 작업 브랜치
```

단독 작업 시엔 `feature/*` 그대로 사용해도 된다.

### 공유 파일 단독 수정 원칙

아래 파일은 **한 번에 하나의 에이전트만 수정**한다.

| 파일 | 이유 |
|---|---|
| `apps/web/AGENTS.md` / `apps/web/CLAUDE.md` | 두 에이전트 모두의 동작에 영향 |
| `packages/types/` | 공유 타입 — 한쪽이 바꾸면 다른 쪽 코드가 깨짐 |
| `apps/web/app/globals.css` | 전역 CSS 토큰 — 공유 디자인 시스템 기반 |
| `apps/web/tailwind.config.*` | Tailwind 테마 |
| `package.json` / `pnpm-lock.yaml` | 의존성 충돌 방지 |

### 커밋 Attribution

```
# Claude Code 커밋
Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>

# Codex 커밋
Co-Authored-By: OpenAI Codex <noreply@openai.com>
```

### 타입·API 구조 변경 시 상호 통보

한 에이전트가 아래 항목을 변경하면 커밋 메시지에 명시한다.

- `packages/types/` 타입 추가·변경·삭제
- `openapi/openapi.yaml` API 계약 변경
- 새 라우트 추가 (`apps/web/app/` 하위 새 폴더)
- 환경변수 추가 (`.env.example` 업데이트 필수)

### 충돌 발생 시 해결 기준

| 충돌 유형 | 해결 기준 |
|---|---|
| 타입 충돌 | `packages/types/` 최신 버전 기준으로 통합 |
| 스타일 충돌 | `globals.css`의 CSS custom properties 기준 유지 |
| 의존성 충돌 | 버전 높은 쪽 유지, Node 버전 제약 확인 |

---

## 순차 핸드오프 정책

### 작업 중 중간 커밋 (토큰 만료 대비)

토큰이 갑자기 소진되면 핸드오프 준비를 할 기회가 없다. **파일 하나 완성할 때마다, 또는 논리적 단위가 끝날 때마다 즉시 커밋**한다. 미완성이어도 커밋이 없는 것보다 낫다.

```bash
git add -A && git commit -m "wip: [작업 중인 것] — 미완성"
```

### 넘기기 전 필수 행동

```bash
pnpm --filter web tsc   # 타입 에러 0개 확인
pnpm --filter web lint  # lint 에러 0개 확인
pnpm --filter web build # 빌드 통과 확인 (기능 단위 완료 시)
git add -A && git commit
```

> 타입 에러가 있으면 커밋 메시지에 반드시 명시.

### 핸드오프 커밋 메시지 포맷

```
chore: handoff — [완료한 것]

DONE: 구체적으로 완료된 것
NEXT: 다음 에이전트가 이어서 할 것
BLOCKED: 막힌 부분 또는 미결 사항 (없으면 생략)

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
```

### 이어받는 에이전트의 첫 번째 행동

```bash
git log --oneline -5    # 최근 커밋 흐름 파악
git show HEAD           # 마지막 커밋 변경 내용 확인
pnpm --filter web tsc   # 타입 에러 상태 확인
```

AGENTS.md를 읽고, 마지막 커밋 메시지의 `NEXT` 항목부터 작업을 시작한다.

---

## 브랜치 전략

```
main              → 배포 가능한 안정 버전
develop-fetch     → 통합 브랜치 (프론트 + 백엔드 병합 기준점)
  ├── develop-front    ← 프론트엔드 작업 브랜치 (여기서 작업)
  └── develop-backend  ← 백엔드 작업 브랜치
```

- **작업 시작 전**: `develop-fetch` 기준으로 `develop-front` pull
- **작업 완료 후**: `develop-front` → `develop-fetch` PR
- **백엔드 변경사항 받을 때**: `develop-fetch` pull 후 `develop-front`에 merge

---

## 서브에이전트 활용 가이드

| 상황 | 에이전트 타입 |
|---|---|
| 파일/심볼 위치 탐색 | `Explore` |
| 구조 설계 / 접근법 비교 | `Plan` |
| 독립적인 작업 두 개 동시에 | `general-purpose` × 2 병렬 |

---

## 개발 명령어

```bash
# apps/web 루트에서
pnpm dev          # 개발 서버
pnpm build        # 프로덕션 빌드
pnpm lint         # ESLint

# 모노레포 루트에서
pnpm --filter web dev
```

## 프로젝트 구조 (라우트)

```
apps/web/app/
  page.tsx                          # 랜딩
  login/page.tsx                    # 로그인 / 회원가입
  meetings/page.tsx                 # 내 모임 목록
  meetings/new/page.tsx             # 모임 생성 Wizard
  meetings/[id]/recommendations/    # 추천 결과 TOP 5
  meetings/[id]/confirmed/          # 최종 요약
  invite/[token]/page.tsx           # 초대 참여
  invite/[token]/time-select/       # 시간 선택 (핵심 화면)
  invite/[token]/submitted/         # 제출 완료
```

## 레퍼런스 문서

구현 작업 시 필요한 경우에만 읽는다.

| 파일 | 내용 |
|---|---|
| `docs/frontend.md` | 프론트엔드 구조, 컴포넌트 패턴, 디자인 시스템 연동 |
| `docs/domain.md` | 도메인 규칙, 데이터 모델, API 규약 |
| `docs/architecture.md` | 아키텍처, 기술 스택, 렌더링 전략 |
| `openapi/openapi.yaml` | 백엔드 API 계약 (API 연동 시 필독) |
| `design-system/` | 디자인 토큰, 컴포넌트 스펙 |

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

Claude는 이 프로젝트에서 항상 **한국어**로 응답한다. 코드 자체(변수명, 주석 등)는 영어를 유지해도 무방하다.

## 문장 톤

- **좋음**: "가능한 시간을 골라주세요", "가장 잘 맞는 시간을 찾았어요", "닉네임만 입력하면 바로 참여할 수 있어요"
- **나쁨**: "최적의 일정을 산출했습니다", "스케줄 매칭을 시작합니다", "참여자 응답 데이터가 없습니다"

친근하되 과하게 감성적이지 않게. 기계적인 표현 금지.
