# Mobile UI Kit · 우리 언제?

Click-thru recreation of **both** flows at mobile fidelity.
Open `index.html`, toggle the **참여자 / 모임장** switch in the header,
then step through each flow via the tabs or the in-screen CTAs.

## Participant flow

```
Landing  →  Invite / Join  →  Time select  →  Submitted  →  Recommendations  →  Confirmed
   0             1                 2              3                 4                  5
```

- **Landing** — wordmark + a slot-roll hero that cycles 만날까 / 떠나지 / 회의해 / 모일까 and **resolves on the brand 우리 언제?** for a longer beat. Below the hero, a real "flow preview" card (invite link, three mini slots, a 1순위 mini card) — no fake dashboard.
- **Invite / Join** — meeting info card + nickname input. CTA disabled until ≥ 2 chars. No login.
- **Time select** — the hero screen. Mode toggle (가능 / 애매 / 불가) at top, date tabs with per-day count dots, **responsive slot grid** (2-col default, auto-collapses to 1-col when each slot would be < 150px), quick-select chips, sticky bottom CTA with selection summary.
- **Submitted** — Forest half-dome with smile + sentence + summary.
- **Recommendations** — 1순위 emphasized card with participant rows; 2~5순위 list with same vocabulary at lower visual weight. **No sparkle / no celebratory effects** — emphasis comes from a filled Forest rank pill and a stronger count typography.
- **Confirmed** — final summary, participant pills, calendar-add row.

## Host flow

```
My Meetings  →  Create Wizard  →  Recommendations  →  Confirmed
     0              1                    2                 3
```

- **My Meetings** — tabs (진행 중 / 확정 필요 / 확정됨 / 지난 모임) + meeting cards with status pill, response progress, and a special "확정 필요" hint when all responses are in. Empty state with pastel-shape illustration.
- **Wizard** — 5 steps, **one decision per step**, question-form titles. Step indicator at top is small (5-dot). Each step has its own validation; Primary CTA only enables when valid.
  - Step 1: 모임 정보 (이름 / 설명 / 성격)
  - Step 2: 기간 (시작일 / 종료일 / 응답 마감일)
  - Step 3: 소요 시간 + 선택 가능한 시간대
  - Step 4: 초대 링크 공유
  - Step 5: 응답 대기 + 참여자 상태 (모임장의 "Step 5" landing)

## Files

| File | Role |
| --- | --- |
| `index.html` | Stage + phone bezel + flow switcher + tab nav + router |
| `styles.css` | Kit-local CSS (imports `../../colors_and_type.css`) |
| `Primitives.jsx` | `Button`, `TopBar`, `Logo`, `StatusPill`, `Icons`, `BrandDecor` |
| `TimeSelect.jsx` | Time-select screen + `TimeSlot`, `ModeToggle`, `DateTab` |
| `Recommendations.jsx` | Recommendations screen + `RankBadge`, `StatRow`, `ParticipantRow` |
| `OtherScreens.jsx` | `Landing`, `InviteJoin`, `Submitted`, `FinalSummary` |
| `Wizard.jsx` | 5-step host wizard + `Step1…Step5`, `StepBar`, `OptionCard` |
| `MyMeetings.jsx` | Host meeting list + `MeetingCard`, `EmptyMeetings` |

All Babel-transpiled in the browser — the React script tags are pinned
to 18.3.1 with integrity hashes. To turn this into production code,
re-implement these JSX files as ESM components against the same DOM/CSS.

## What's intentionally NOT here

- Login / 회원가입 screens — the brief says these stay minimal / deprioritized.
- Host-specific recommendations differences (e.g. only the host sees the confirm CTA). Right now the same `Recommendations` is shared; gate the CTA behind a `role` prop when wiring to real auth.

Ask me to extend any of the above and I'll add it to this kit.
