# JIXGO Magical 24 — Product Blueprint

## Event
- Artist: Jixgo
- Date: 14 November 2026
- Venue: Thee & Thou
- Tagline: Join us for a magical celebration!
- Audience: up to 100 players
- Primary device: mobile; Host also supports desktop/tablet
- Visual direction: original magical/fairytale atmosphere, inspired by the supplied PR artwork

## MVP scope
- Solo Mode visible in the UI
- Team Mode supported in data model/code foundation but hidden from the UI
- 18 sample questions, configurable room timer with 5/10/15/20/30 second options
- Player flow: join → lobby → answer → score/leaderboard
- Host flow: create/start/pause/next/add-time/skip/void/show-all
- Top 5 leaderboard by default; Host can reveal all players
- Optional display route can be added after mobile flow is stable

## Scoring
- Correct answer: 700 base points
- Speed bonus: up to 300 points based on remaining time
- Wrong/timeout: 0 points; no negative scoring
- Deadline and score must be calculated server-side in production

## Acceptance gates
1. A player can enter a room code and nickname on a 360px-wide viewport.
2. A player can answer the sample question and see timer danger feedback below 10 seconds.
3. Host controls work on mobile and desktop in the demo flow.
4. Supabase schema supports solo and team records without exposing correct answers publicly.
5. Main remains untouched until Preview/UAT approval.
