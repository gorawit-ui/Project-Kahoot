# TASK-06 — Visual World Stage 4 implementation

## Approved decision

`logo-jixgo-full.png` is the client-approved, activity-owned Jixgo Magical 24 Fanmeet logo. It may remain as the primary brand asset, used proportionally as a hero/header or one low-opacity watermark—not tiled or used behind critical data.

## Build scope

- Remove the unapproved `background-00.jpg` Home treatment from all rendered UI.
- Retire the geometric SVG/CSS castle and polygon banners from `MagicalBackground`.
- Introduce reusable original Starlit Magical Celebration background layers: deep gradient, organic illustrated skyline/haze, one subtle approved logo watermark, sparse CSS/SVG sparkle, reduced-motion support.
- Apply intensity variants: arrival (Home/Join/Lobby), focus (Question), reveal/finale (Reveal/Q20/Results), and restrained Host.
- Do not alter joining, room state, answer scoring, timers, Supabase, or Host authorization.

## Acceptance gate

1. No Disney/Mickey-like background remains in rendered pages.
2. No geometric castle or polygon-banner placeholder remains.
3. Logo is crisp and proportionally correct; it never reduces critical text/data readability.
4. Lobby, Question, Reveal/Q20, and Results visibly share one world but retain appropriate information hierarchy.
5. Mobile 360px and reduced-motion checks pass before merge.
