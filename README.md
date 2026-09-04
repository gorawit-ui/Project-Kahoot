# JIXGO Magical 24 — Interactive Fan Meet Quiz

Mobile-first real-time fan meet quiz platform for Jixgo.

## Current scaffold

- Next.js + TypeScript App Router
- Magical mobile-first Homepage with lightweight canvas starfield/fireworks
- Join Room, Lobby, Player Question, and Host Dashboard demo routes
- Timer danger state below 10 seconds
- Configurable game defaults and scoring utility
- Supabase-ready schema for solo mode and future team mode
- Host leaderboard preview: Top 5 / all players

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Optional live room connection

The Host–Player broadcast adapter activates when these public Supabase variables are set in Vercel/local environment:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

Run `supabase/schema.sql` before adding persisted rooms. Never expose a Supabase `service_role` key in browser variables. Without these variables, the Solo/demo flow remains available.

## Routes

- `/` Homepage
- `/join` Player join
- `/lobby` Lobby
- `/play` Sample player question
- `/host` Host dashboard

## Product notes

The MVP keeps Solo Mode visible and Team Mode hidden in the UI while preserving its data-model foundation. Main branch is kept separate until Preview/UAT approval.
