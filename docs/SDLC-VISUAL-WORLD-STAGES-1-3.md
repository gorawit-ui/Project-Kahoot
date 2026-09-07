# Jixgo Magical 24 — Visual World SDLC (Stages 1–3)

## Stage 1 — Audit findings

### Stop-ship / design-gate items

1. `public/assets/background-00.jpg` is used by the Home hero and contains Disney-style castle and Mickey-head banner motifs. It must be removed/replaced unless the client supplies recorded rights/approval.
2. `public/assets/logo-jixgo-full.png` also includes Mickey-head motifs. Keep it unchanged only if it is an approved client-owned event logo and its usage is confirmed; otherwise replace it with a cleared asset.
3. `components/magical-world.tsx` renders a jagged geometric SVG skyline and `app/globals.css` adds polygon banners. These are prototype-grade and must be retired.

### Surface assessment

| Surface | Retain | Replace / improve |
|---|---|---|
| Home | Clear ticket/join hierarchy | Unapproved background; align world with other screens |
| Join | Good form usability | Add the shared arrival-world system |
| Lobby | Guest-pass and readiness hierarchy | Retire geometric skyline; reduce logo competition |
| Question | Clear focus/timer/choices | Build a calm question chamber and illustrated frame system |
| Reveal | Result and encouragement clarity | Combine personal result + distribution into one reveal chamber |
| Q20 | Compact data grid | Dedicated final-chapter archive background |
| Results | Score/rank information | Dedicated finale scene and finite entrance transition |
| Host | Operational monitor | Keep restrained; do not add spectacle |

## Stage 2 — Locked requirements

- Original **Starlit Magical Celebration** world: elegant fan-event atmosphere, not a generic fantasy template or a copyrighted fairytale franchise.
- Base layers: midnight-to-royal-blue gradient, low-contrast organic illustrated skyline/haze, one approved logo watermark at 3–8% opacity outside content, sparse CSS/SVG sparkle layer.
- No geometric castle placeholders, repeated logo texture, continuous fireworks, crowns, franchise-like symbols, or busy decoration beneath reading areas.
- Champagne gold = reward/emphasis; ruby = wrong/urgent only; mint = success; ivory = reading panel; legible Thai sans = UI/data; display serif = title/milestone only.
- Motion: entrance 200–350 ms, chart 450 ms once, finale ≤900 ms, background drift 16–30 sec. All decorative animation pauses/reduces when hidden and respects `prefers-reduced-motion`.
- Accessibility: AA contrast for data/control surfaces; symbols plus colour; decoration is non-interactive and cannot overlap timer, choices, inputs or score rows at 360px.

## Stage 3 — Design gate mockups

Two concept boards were generated for PO review:

1. Lobby + Question: warm arrival world versus quiet focus chamber.
2. Reveal + Results: gold result chamber, aggregate answer board, and medal-based final celebration.

They establish hierarchy and atmosphere only. Exact logo, Thai copy, real question media, and final asset rights are applied only after PO sign-off.

## Required PO decisions before Stage 4

1. Confirm whether `logo-jixgo-full.png` is an approved client-owned/cleared event logo despite its motifs.
2. Approve the original starlit-kingdom direction and retire `background-00.jpg` plus the geometric skyline.
3. Approve the two mockup directions as the visual baseline.
