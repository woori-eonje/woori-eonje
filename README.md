# 우리 언제?

> 모임 시간 조율, 복잡하게 하지 말고 — 우리 언제?로 간단하게

기간 기반 모임 시간 조율 서비스입니다. 모임장이 후보 날짜 범위를 설정하면 참여자들이 가능한 시간대를 선택하고, 가장 많이 겹치는 시간 **TOP 5**를 자동으로 추천해드립니다.

---

## 주요 기능

- **모임 생성** — 후보 날짜 범위, 시간대, 응답 마감일을 5단계 Wizard로 설정
- **간편 참여** — 초대 링크 접속 후 닉네임만 입력하면 바로 참여 (회원가입 불필요)
- **3단계 응답** — 가능 / 애매 / 불가로 시간대별 선택
- **자동 추천** — 가장 많이 겹치는 시간 TOP 5 산출
- **일정 확정** — 최종 시간 확정 후 캘린더(.ics) 다운로드

---

## 화면 구성

```
랜딩              →  로그인 / 회원가입
                  →  모임 생성 (5단계 Wizard)
                       ↓
                     초대 링크 공유
                       ↓
참여자: 닉네임 입력  →  시간 선택  →  제출 완료
                       ↓
모임장: 추천 결과 확인  →  일정 확정  →  최종 요약
```

---

## 기술 스택

| 분류 | 기술 |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| UI | React 19, Tailwind CSS v3, shadcn/ui |
| Backend | Spring Boot (별도 레포) |
| Runtime | Node.js 18.18.0 |

---

## 시작하기

```bash
# 의존성 설치
npm install

# 환경변수 설정
cp .env.local.example .env.local
# NEXT_PUBLIC_API_URL 설정

# 개발 서버 실행
npm run dev
```

[http://localhost:3000](http://localhost:3000) 에서 확인할 수 있습니다.

---

## 개발 명령어

```bash
npm run dev       # 개발 서버
npm run build     # 프로덕션 빌드
npm run lint      # ESLint
npx tsc --noEmit  # 타입 체크
```

---

## 프로젝트 구조

```
src/
  app/                      # Next.js App Router 페이지
    meetings/               # 모임 관련 (생성, 추천, 확정)
    invite/[token]/         # 참여자 플로우 (닉네임 입력 → 시간 선택 → 완료)
  components/
    ui/                     # shadcn/ui 기반 프리미티브
    time-select/            # 시간 선택 UI 컴포넌트
    meeting/                # 모임 관련 컴포넌트
  types/
    meeting.ts              # 공유 도메인 타입
```

---

## 용어 정리

| 용어 | 설명 |
|---|---|
| 모임장 | 모임 생성자 (로그인 필요) |
| 참여자 | 초대 링크로 접속하는 비회원 |
| 조율 기간 | 후보 날짜 범위 |
| 응답 마감일 | 참여자 제출 마감 |
| 추천 결과 | 가장 많이 겹치는 시간 TOP 5 |
