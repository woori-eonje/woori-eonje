# 우리 언제? Design System

> A period‑based group scheduling service for casual meetups (10–30s
> demographic). The brand line: **흩어진 약속 답변을 정리해, 모두에게 가장 잘 맞는 시간을 찾아주는 모임 조율 서비스.**

Direction: **Cool Playful Utility · Clean Pop, Limited Color · Fresh Pastel Scheduling.**
Clean cool‑grey/white base, Forest Green as the single primary, Poppy as a tiny accent,
Baby Blue + Lavender as decorative pastels only. Pretendard throughout.

---

## Sources used

All material in this system was derived from the package the user uploaded:

| Source | Where it lives now |
| --- | --- |
| `logo.svg` (charcoal wordmark + Poppy "?") | `assets/logo.svg` |
| `favicon.svg` (Poppy speech bubble + "?") | `assets/favicon.svg` |
| `02_design_system/woori-eonje-design-system.md` (full system doc) | `design-package/02_design_system/woori-eonje-design-system.md` |
| `03_screen_design_brief/woori-eonje-screen-design-brief-final.md` | `design-package/03_screen_design_brief/woori-eonje-screen-design-brief-final.md` |
| `01_project/meetboard_project_plan.md` (product plan) | `design-package/01_project/meetboard_project_plan.md` |
| Reference brand board + icon guideline PNGs | `assets/brand-guide-board.png`, `assets/logo-icon-guidelines.png` |

There is **no codebase or Figma attached** — the source of truth is the
markdown brief + the two SVG assets. If a Figma is shared later, swap any
substitutions for the originals.

---

## Index — what's in this folder

```
README.md                       — this file
SKILL.md                        — Agent-Skills entry point (Claude Code-compatible)
colors_and_type.css             — single source of truth for color + type tokens

assets/                         — brand SVGs + reference boards
  logo.svg                      — wordmark
  favicon.svg                   — speech-bubble "?"
  brand-guide-board.png         — reference brand board (full mood)
  logo-icon-guidelines.png      — logo/favicon scaling guideline

preview/                        — Design System tab cards (700×… HTML specimens)
ui_kits/
  mobile/                       — mobile UI kit (participant + host flows)
    index.html                  — click-thru, toggle 참여자 ↔ 모임장 flow
    README.md                   — what each component is for
    styles.css                  — kit-local CSS
    Primitives.jsx              — Button, TopBar, Logo, StatusPill, Icons
    TimeSelect.jsx              — the participant time-select screen
    Recommendations.jsx         — recommendation results screen
    OtherScreens.jsx            — Landing, InviteJoin, Submitted, FinalSummary
    Wizard.jsx                  — 5-step host meeting-creation wizard
    MyMeetings.jsx              — host's meeting list (tabs + cards + empty)

  desktop/                      — desktop UI kit (host dashboard)
    index.html                  — header + page-tabs + view router
    README.md
    styles.css
    TimeAggregate.jsx           — heatmap of participant selections
    RecommendationsDesktop.jsx  — wide rec card + rank list + summary rail

fonts/                          — local Pretendard Variable woff2

design-package/                 — the original uploaded materials (unchanged)
```

---

## CONTENT FUNDAMENTALS

The voice is the soul of the product. The whole reason this design exists
is that "최적의 일정을 산출했습니다" sounds like a machine and
**"가장 잘 맞는 시간을 찾았어요"** sounds like a friend.

### Tone — friendly utility, never sentimental

- Talk to one user at a time, in plain conversational Korean (해요체).
- **Sentence-final endings:** mostly **-어요 / -아요** (가능한 시간을 골라**주세요**, 가장 잘 맞는 시간을 찾았**어요**). Imperatives stay soft (**~주세요**, never **~하시오 / ~하십시오**).
- Use **우리** for the brand voice — it's literally in the product name. Don't over-use **당신**; Korean prefers omitted subjects.
- Questions are part of the brand. The product name ends in **?**, and copy frequently asks back: **"이 시간으로 확정할까요?"**, **"언제 사이에서 고를까요?"**, **"어떤 모임인가요?"**.
- No emoji as decoration. The brand has its own visual language (pastel shapes, the Poppy `?`); leaning on emoji would muddy that.
- No exclamations stacked for hype. One `!` per screen, max, and only when celebrating ("**모두가 가능한 시간이에요!**").

### Casing & punctuation

- Mixed Korean + English: keep both natural. **Forest**, **Pretendard**, **TOP 5** can appear inline.
- Numbers stay Western (5명, 2시간, 6.8 토), not 한글 numerals.
- Date format: **6.8 (토)**, **2026.06.01**, **오후 2:00** — no `PM`, prefer **오전/오후**.
- Status/system labels in code may be `COLLECTING`/`CONFIRMED`; **never** show those raw to the user — surface "응답 수집 중", "확정됨".

### What "good" looks like (copy from the brief)

- 가능한 시간을 골라주세요
- 가장 잘 맞는 시간을 찾았어요
- 아직 응답한 사람이 없어요
- 이 시간으로 확정할까요?
- 닉네임만 입력하면 바로 참여할 수 있어요
- 응답 마감일까지 함께해주세요
- 모두가 가능한 시간이에요
- 초대 링크가 만료되었어요

### What to never write

- 최적의 일정을 산출했습니다
- 참여자 응답 데이터가 없습니다
- 스케줄 매칭을 시작합니다
- 시스템이 분석을 완료했습니다
- 일정을 확정 처리합니다
- "10,000+ users", "AI가 분석한…", or any fake metric / SaaS-marketing flavor

### Microcopy patterns

| Slot | Pattern | Example |
| --- | --- | --- |
| Primary CTA | Verb-first, short | **모임 만들기**, **이 시간으로 확정**, **참여 시작** |
| Secondary CTA | Soft / reversible | **응답 수정**, **링크 다시 보기** |
| Empty state | "아직 ~ 없어요" + next action | "아직 응답한 사람이 없어요 — 초대 링크를 한 번 더 보내볼까요?" |
| Error state | "~할 수 없어요" / "~었어요" + recovery | "초대 링크가 만료되었어요. 모임장에게 새 링크를 요청해주세요." |
| Loading | One verb, present continuous | "추천 시간을 계산하고 있어요" |
| Success | "찾았어요 / 됐어요" | "응답을 보냈어요 · 결과는 마감일에 알려드릴게요" |
| Helper text | Tells *why* without lecturing | "응답 마감일까지 수정할 수 있어요" |

---

## VISUAL FOUNDATIONS

### The whole feel in one paragraph

A **cool-grey-on-white** product UI with **one** primary action color
(Forest Green) and a single tiny accent (Poppy, mostly inside the logo).
Cards are white with a hairline border and a large radius; shadows are
near-zero. Type is Pretendard, with **tight tracking on headings** so
titles feel fat & sturdy and **generous line-height on body** so phones
are readable. Decorative rhythm comes from a small kit of soft pastel
shapes — half-domes, scalloped clouds, dots, a Poppy "?" — used like
seasoning, never like wallpaper. Nothing 3D, nothing gradient, no fake
SaaS dashboards.

### Color

| Role | Token | Hex | Usage rule |
| --- | --- | --- | --- |
| Primary | `--color-primary` | `#1A9562` | Single CTA per screen, "가능" state, active toggles, focus rings |
| Primary Hover | `--color-primary-hover` | `#14784F` | Hover only |
| Primary Soft | `--color-primary-soft` | `#EAF7F1` | Secondary button bg, "가능" slot bg |
| Accent (Poppy) | `--color-accent` | `#FF6B6B` | The "?" in the logo, favicon, ≤16px badges, required-mark |
| Baby Blue | `--color-baby-blue` | `#D6E7FF` | Decorative shapes only |
| Lavender | `--color-lavender` | `#E6DBF7` | Decorative shapes only |
| Maybe | `--color-maybe` | `#F5AB54` | "애매" state |
| Background | `--color-bg` | `#F6F8FA` | Page background (NOT cream/beige) |
| Surface | `--color-surface` | `#FFFFFF` | Cards, sheets, panels |
| Line | `--color-line` | `#E5E7EB` | Hairline borders |

Color **mix** on any given screen: roughly **White/Grey 80% · Forest 10% ·
Poppy 5% · Baby Blue + Lavender 5%**. If a screen needs more color than
that, the screen is wrong.

### Type

Pretendard Variable (self-hosted woff2 in `fonts/`). Headings use **negative tracking**
(`-0.04em` to `-0.075em` on display). Body sits at `line-height: 1.65`
minimum. Buttons are 15–16px / 700 / `letter-spacing: -0.015em`. See
`colors_and_type.css` for the full table.

### Backgrounds

- Default page bg: `#F6F8FA` cool-grey. Never beige or cream.
- No full-bleed photos. No hero gradients. No texture/grain.
- Decoration is **flat pastel shapes** at low density (1–3 per area max),
  parked at the edges of the composition, not behind text.
- Hero compositions use real product fragments (a recommendation card, a
  speech bubble, an avatar row) as the imagery — not abstract floaters.

### Animation

- **Subtle, fast, easing out.** `cubic-bezier(0.22, 1, 0.36, 1)`, 160–220ms.
- Tap feedback: `transform: scale(0.97)` on press, 90ms, eased.
- Hover on web: bg color shift (darker primary), never a glow.
- No bouncy/spring/wobble. No looped page-load animations.
- A landing wordmark can have **rolling copy** (우리 언제 만날까? → 떠나지? → 회의해?) — that's the one exception and it lives in the brand.

### Hover / press / focus / disabled

| State | Looks like |
| --- | --- |
| Hover (web) | Background steps one shade darker; text/icon unchanged |
| Press / active | `scale(0.97)`, 90ms; or 1 shade darker still |
| Focus | 4px `rgba(26,149,98,0.12)` outer ring (`--shadow-focus-primary`) — never default blue ring |
| Disabled | bg → `--color-bg-2` or `--color-unavail-bg`; text → `--color-text-muted`; cursor not-allowed; opacity NOT used |

### Borders, shadows, elevation

- Borders are **1px solid #E5E7EB** almost always. The "elevation system" is borders, not shadows.
- One soft shadow is allowed: `0 8px 24px rgba(17,24,39,0.06)` for the bottom-fixed mobile CTA and dropdowns. That's it.
- No inner shadows.
- No glass/blur/translucency. The aesthetic is **opaque white on cool grey**.

### Radii

`8 / 12 / 14 / 20 / 28 / 999`. Time slots `14`. Buttons `14–16`. Cards `20`.
Big panels `28`. Pills/badges full pill. Avoid any radius < 8 — keeps the
"chunky / friendly" feel of the wordmark.

### Cards

White, `1px solid #E5E7EB`, `border-radius: 20px`, `padding: 20–24px`,
no shadow. The "1순위 추천" card is the only emphasized card: same shape
but `2px solid rgba(26,149,98,0.3)` and a small Forest pill at the top.

### Layout rules

- Mobile-first. Mobile padding `20px`. Touch targets `min-height: 44px`,
  time slots `min-height: 56px`.
- Desktop max width `1200px`. Header height `68px`.
- Section gap on desktop `80–120px`; card gap `16–24px`.
- The participant flow (invite → time pick → submit) is **mobile-only-shaped** even on desktop — center a 420–480px column.
- Bottom-fixed CTA on mobile is allowed (and recommended for the time-select screen). Add `padding-bottom: env(safe-area-inset-bottom)`.

### Transparency / blur

Don't. Opaque surfaces. The only translucency we use is the **30% Forest
border on the 1순위 card** (`rgba(26,149,98,0.3)`) and the focus ring.

### Imagery

- No photography.
- No human illustrations / characters.
- The "imagery library" is: **pastel half-domes, scalloped clouds with a
  tiny smile, rounded arches, Baby-Blue rainbows, Poppy spark, Lavender
  cloud, dot grids.** All flat, single-color, geometric.
- These shapes appear as quiet decoration around hero copy and on
  empty-state cards. Never as background fill.

### Iconography

See **ICONOGRAPHY** below.

---

## ICONOGRAPHY

### System

We use **Lucide** (`lucide-react` / `lucide` web fonts) — a line-icon set
that matches the brief's spec exactly (line, rounded caps, 1.75–2px
stroke, 20/24px sizes). Lucide is loadable from a CDN and ships every
icon the screens need (`Calendar`, `Clock`, `Users`, `Check`, `Copy`,
`Link`, `Share`, `Bell`, `Star`, `MoreHorizontal`, `ChevronRight`, …).

> **Substitution flag:** the brief recommends `lucide-react` and the
> uploaded package did not include a custom icon set, so Lucide is the
> intended choice rather than a substitution. If a custom icon kit is
> added later, swap it in and keep the same sizing rules.

### Usage rules

- **Stroke:** 1.75–2px. **Cap:** round. **Join:** round.
- **Size:** 20px in dense rows; 24px in card headers; 32–40px only inside large empty-state shapes.
- **Color:** default `--color-text` (`#333`). Active / selected `--color-primary`. Disabled `--color-text-muted`. Never Poppy on a generic icon — Poppy is reserved for the literal "?" mark.
- **Pair icon + text label** on status (가능 / 애매 / 불가). Never rely on color alone.
- **No filled / 3D / multi-color icons.** No emoji-style icons.

### The Poppy "?" — special case

The exclamation point of the system. It only appears:
1. inside the wordmark logo (already baked into `assets/logo.svg`),
2. inside the favicon speech-bubble,
3. as a tiny inline accent on copy like *"우리 언제?"* in body text.
Never as a regular icon, never on a CTA, never larger than the surrounding heading.

### Unicode / emoji

- No emoji in product copy.
- Unicode allowed only for **punctuation rhythm** — middle-dot `·` to
  separate metadata ("가능 5명 · 애매 1명 · 불가 0명"), em-dash `—`,
  arrow `→` in tight microcopy.

### Brand graphic shapes

These live as **inline SVG** (or in `assets/`). The full kit is on the
reference board. The shapes you may use:

- Forest **half-dome** with smile (mascot-ish)
- Forest **arch**
- Lavender **scalloped cloud** with smile
- Baby Blue **rainbow** / arch
- Baby Blue **kidney bean**
- Poppy **spark / starburst** (tiny)
- Lavender **cloud**
- Forest / Baby Blue / Lavender **dots**

Use 1–3 per composition, low contrast, parked at the edges.

---

## CAVEATS

- **Fonts:** Pretendard Variable is bundled as a local woff2 in `fonts/PretendardVariable.woff2` and wired up via `@font-face` in `colors_and_type.css`. No external font CDN.
- **Icons:** Lucide via CDN, wrapped as `Icons.*` in `ui_kits/mobile/Primitives.jsx`. If you want a bespoke icon set, replace the references there and document here.
- **No Figma / no codebase** was attached, so component layouts are derived from the markdown brief and the brand board PNG — they're faithful to the rules, but please point me at the Figma if you have one and I'll align pixel-for-pixel.

---

See `SKILL.md` for the agent-invocable entry point.
