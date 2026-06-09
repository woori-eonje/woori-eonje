# Desktop UI Kit · 우리 언제? (host dashboard)

Host-side desktop view for managing a meeting. Two views inside the same shell:

- **응답 현황 (Aggregate)** — read-only heatmap. Rows are 30-min hour slots, columns are days. **Baby Blue cells (1–2명)** = early signal, **Forest cells (3명+)** = real recommendation territory. Dashed border = 애매 included. Click a cell to see participant-level breakdown in the right rail.
- **추천 결과 (Recommendations)** — 1순위 hero card with conversational hierarchy ("이 시간엔 5명이 가능, 1명은 애매예요.") and a full participant grid. Other ranks render as **selectable cards** (chevron, hover lift, soft Forest active state) — not bare list rows. Side rail has Lavender / Baby Blue accents to differentiate the three info cards.

## Files

| File | Role |
| --- | --- |
| `index.html` | App shell + header + page-tab switcher |
| `styles.css` | Desktop-only CSS (imports `../../colors_and_type.css`) |
| `TimeAggregate.jsx` | Heatmap view + cell detail rail |
| `RecommendationsDesktop.jsx` | Hero rec card + rank list + meeting summary rail |

It reuses **`Icons` from `../mobile/Primitives.jsx`** so we don't duplicate the inline-SVG kit. Anything else mobile-specific (`Button`, `TopBar`, etc.) is intentionally not used — desktop has its own `.btn` rules.

## What's intentionally NOT here

- A desktop participant time-select. The brief is explicit: participant is mobile-first. The desktop view shown is the host's **aggregate** of participants' selections — i.e. the read-only counterpart of the mobile slot grid.
- A 모임 목록 (My Meetings) desktop page. Easy follow-up if you want it.

## Layout grid

| Breakpoint | Layout |
| --- | --- |
| ≥ 1024px | `1fr + 340px` two-pane split |
| < 1024px | single column stack (still readable on tablet) |

Cards: `border: 1px solid #E5E7EB`, `border-radius: 20px`, `padding: 24px`. The 1순위 hero card gets the 30%-Forest emphasis border — same vocabulary as on mobile.
