# JIXGO Magical 24 — Interactive Fan Meet Quiz

Mobile-first real-time fan meet quiz platform for Jixgo.

## Current scaffold

- Next.js + TypeScript App Router
- Magical mobile-first Homepage with lightweight canvas starfield/fireworks
- Join Room, Lobby, Player Question, and Host Dashboard demo routes
- Timer danger state below 10 seconds
- Configurable game defaults and scoring utility
- Authoritative Supabase scoring; Player reads public state only and submits answers to server
- Host-only room controls and a live Top 5 / all-player leaderboard
- Q20 answer strings are exact-match checked in Postgres

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Live room setup (required for the event)

1. Create a new Supabase project, then open **SQL Editor** and run the complete file [`supabase/migrations/20260906_authoritative_game.sql`](supabase/migrations/20260906_authoritative_game.sql).
2. In Vercel → Project → Settings → Environment Variables, add these values for **Preview** and **Production**:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
JIXGO_HOST_CONTROL_KEY=... # a long private host password; never use NEXT_PUBLIC_ here
```

3. Redeploy the connected branch. Open `/host`, enter room code `142426` and the same `JIXGO_HOST_CONTROL_KEY`, then select **เตรียมห้อง / seed คำถาม** exactly once. This writes questions 1–20 and their answer key directly to Supabase. The answer key is not returned by any player endpoint.

The Host key is verified on the server and is never bundled as a browser environment variable. The `SUPABASE_SERVICE_ROLE_KEY` is server-only; do not prefix it with `NEXT_PUBLIC_`.

## Routes

- `/` Homepage
- `/join` Player join
- `/lobby` Lobby
- `/play` Sample player question
- `/host` Host dashboard

## Product notes

The MVP keeps Solo Mode visible and Team Mode hidden in the UI while preserving its data-model foundation. Main branch is kept separate until Preview/UAT approval.
