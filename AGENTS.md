# 우리 언제? — Agent Rules (Claude Code · Codex 공용)

기간 기반 모임 시간 조율 서비스. 모임장이 조율 기간을 설정하면 참여자들이 가능한 시간을 제출하고, 시스템이 가장 많이 겹치는 시간 TOP 5를 추천한다.

> **이 파일은 Claude Code와 Codex가 함께 읽는 공통 기준 문서다.**
> Claude Code는 `CLAUDE.md → @AGENTS.md` 경유, Codex는 `AGENTS.md` 직접 읽음.
> 두 도구가 이 파일 하나를 source of truth로 사용한다.

---

## 멀티에이전트 협업 정책

**기본 작업 방식은 순차(릴레이)다.** 한 에이전트가 토큰을 소진하거나 작업 단위를 마치면 다른 에이전트가 이어받는다. 병렬 작업은 예외적인 경우에만 사용한다.

### 브랜치 분리 원칙 (병렬 작업 시에만 적용)

두 에이전트가 동시에 같은 브랜치에서 작업하면 충돌이 발생한다. 병렬 작업 시 반드시 브랜치를 분리한다.

```
feature/cc-*  → Claude Code 작업 브랜치 (예: feature/cc-time-select-api)
feature/cx-*  → Codex 작업 브랜치      (예: feature/cx-auth-setup)
```

단독 작업 시엔 `feature/*` 그대로 사용해도 된다.

### 공유 파일 단독 수정 원칙

아래 파일은 **한 번에 하나의 에이전트만 수정**한다. 수정 후 반드시 커밋 완료 후 다른 에이전트에게 전달한다.

| 파일 | 이유 |
|---|---|
| `AGENTS.md` / `CLAUDE.md` | 두 에이전트 모두의 동작에 영향 |
| `src/types/meeting.ts` | 공유 타입 — 한쪽이 바꾸면 다른 쪽 코드가 깨짐 |
| `src/app/globals.css` | 전역 CSS 토큰 — 공유 디자인 시스템 기반 |
| `tailwind.config.js` | Tailwind 테마 — 양쪽 컴포넌트에 영향 |
| `package.json` / `package-lock.json` | 의존성 충돌 방지 |

### 커밋 Attribution

커밋 로그에서 어느 에이전트가 작업했는지 식별할 수 있게 한다.

```
# Claude Code 커밋
Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>

# Codex 커밋
Co-Authored-By: OpenAI Codex <noreply@openai.com>
```

### 타입·API 구조 변경 시 상호 통보

한 에이전트가 아래 항목을 변경하면, **다음 에이전트가 작업을 시작하기 전에** 변경 내용을 `AGENTS.md` 또는 커밋 메시지에 명시한다.

- `src/types/meeting.ts` 타입 추가·변경·삭제
- `src/lib/api/` API 함수 시그니처 변경
- 새 라우트 추가 (`src/app/` 하위 새 폴더)
- 환경변수 추가 (`.env.local.example` 업데이트 필수)

### 충돌 발생 시 해결 기준

| 충돌 유형 | 해결 기준 |
|---|---|
| 타입 충돌 | `src/types/meeting.ts` 최신 버전 기준으로 통합 |
| 스타일 충돌 | `globals.css`의 CSS custom properties 기준 유지, Tailwind utility 혼용 금지 |
| 의존성 충돌 | 버전 높은 쪽 유지, 단 Node 18.18 환경 제약 확인 |
| `AGENTS.md` 충돌 | 두 에이전트 규칙을 모두 반영하되 모순되는 항목은 사용자에게 확인 |

---

## 순차 핸드오프 정책

Claude Code와 Codex는 **병렬이 아닌 릴레이 방식**으로 작업한다. 한 에이전트의 토큰이 소진되거나 작업 단위가 끝나면 다른 에이전트가 이어받는다. 이어받는 에이전트가 컨텍스트 없이도 현재 상태를 파악할 수 있도록 하는 것이 핵심이다.

### 작업 중 중간 커밋 (토큰 만료 대비)

토큰이 갑자기 소진되면 핸드오프 준비를 할 기회가 없다. **파일 하나 완성할 때마다, 또는 논리적 단위가 끝날 때마다 즉시 커밋**한다. 미완성이어도 커밋이 없는 것보다 낫다.

```bash
git add -A && git commit -m "wip: [작업 중인 것] — 미완성"
```

### 넘기기 전 필수 행동

작업을 중단하기 전(토큰 소진 포함) 반드시 아래를 완료한다:

```bash
npx tsc --noEmit   # 타입 에러 0개 확인
npm run lint       # lint 에러 0개 확인
npm run build      # 빌드 통과 확인 (기능 단위 완료 시)
git add -A && git commit  # 미완성이라도 커밋
```

> 타입 에러가 있으면 커밋 메시지에 반드시 명시.

### 핸드오프 커밋 메시지 포맷

```
chore: handoff — [완료한 것]

DONE: 구체적으로 완료된 것
NEXT: 다음 에이전트가 이어서 할 것
BLOCKED: 막힌 부분 또는 미결 사항 (없으면 생략)
```

예시:
```
chore: handoff — 시간 선택 UI 완성

DONE: TimeSlot, DateTab, ModeToggle 컴포넌트 구현. 모바일 레이아웃 완료.
NEXT: POST /api/meetings/{id}/availability API 연동 (src/lib/api/availability.ts 생성)
BLOCKED: 백엔드 응답 타입 미확정 — Recommendation 타입 확인 필요

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
```

### 이어받는 에이전트의 첫 번째 행동

새 에이전트는 작업 시작 전 반드시 아래 순서로 현재 상태를 파악한다:

```bash
git log --oneline -5          # 최근 커밋 흐름 파악
git show HEAD                 # 마지막 커밋 변경 내용 확인
npx tsc --noEmit              # 타입 에러 상태 확인
```

AGENTS.md를 읽고, 마지막 커밋 메시지의 `NEXT` 항목부터 작업을 시작한다.

### 같은 브랜치에서 이어받기

순차 작업이므로 브랜치를 굳이 나누지 않아도 된다. 단독 작업 시엔 동일 `feature/*` 브랜치에서 계속 이어가면 된다.

---

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

## 프로젝트 구조 (라우트)

```
src/app/
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

컴포넌트 구조 상세 → `docs/CODING.md`

## 레퍼런스 문서

구현 작업 시 필요한 경우에만 읽는다. 세션 시작 시 자동으로 로드하지 않는다.

| 파일 | 내용 |
|---|---|
| `docs/CODING.md` | Next.js 15 params, 컴포넌트 구조, 임포트 패턴, 디자인 토큰 |
| `docs/API.md` | 백엔드 API 엔드포인트, Mock 데이터 위치, API 클라이언트 구조 |

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
