---
name: woori-eonje-design
description: Use this skill to generate well-branded interfaces and assets for 우리 언제? (Whenly), the period-based group scheduling service for casual meetups. Contains essential design guidelines, colors, type, fonts, assets, and UI kit components for prototyping.
user-invocable: true
---

# 우리 언제? · Design Skill

Read `README.md` first — it covers the brand, content rules, visual
foundations, and iconography. Then explore the rest of this folder.

## Quick map

- `README.md` — brand brief, content fundamentals, visual foundations, iconography
- `colors_and_type.css` — drop into any HTML to inherit tokens (`--color-primary`, `--type-h1-*`, `--radius-lg`, …) and Pretendard via CDN
- `assets/` — `logo.svg`, `favicon.svg`, brand-guide / icon reference boards
- `preview/` — small specimen cards (single source of truth for visual rules)
- `ui_kits/mobile/` — click-thru of both participant and host flows (Landing → Invite → Time select → Submitted → Recommendations → Confirmed; My Meetings → Wizard → …)
- `ui_kits/desktop/` — host dashboard (응답 현황 heatmap + 추천 결과)

## When the user invokes this skill

If they just say "use this skill" with no other guidance, ask them:

1. What are you building? (mock / prototype / production code / slide / asset)
2. Which user is it for? (participant — mobile-first / host — mobile + desktop)
3. Which surface? (landing, invite, time select, recommendations, confirmed, my-meetings, wizard)
4. Mobile, desktop, or both?

Then act as an expert designer. Copy assets out of `assets/`, import
`colors_and_type.css`, and follow the rules. Output HTML for visual
artifacts; output production-friendly code (JSX, CSS-vars, Tailwind
tokens) when working in a codebase.

## Hard rules — never break

- One Primary action per screen. Always Forest (`#1A9562`), never Poppy.
- Poppy (`#FF6B6B`) only appears as the logo "?" / favicon / required mark / tiny inline accents. Never on CTAs or backgrounds.
- Background is cool-grey `#F6F8FA` or white. **Never** beige / cream.
- Cards: white, 1px `#E5E7EB` border, `border-radius: 20px`, near-zero shadow.
- Time slot status (가능 / 애매 / 불가) is **always** color + label + icon — never color alone.
- Tone is conversational `-요`. Never "최적의 일정을 산출했습니다" SaaS-speak.
- No 3D, no gradients, no fake dashboards, no enterprise-logo rows, no pricing sections, no emoji decoration.

## What "good" output looks like

- The participant flow is recognizable at a glance — invite link, slot grid, rec card.
- A first-time viewer can tell `가능`, `애매`, `불가` apart with the page printed in black-and-white.
- Mobile touch targets ≥ 44px; time slots ≥ 56px.
- Headings feel chunky and friendly (tight tracking on Pretendard 700–900); body breathes (line-height ≥ 1.6).

Build, then double-check the output against the brand board in `assets/brand-guide-board.png`.
