# QA Release Gate — JIXGO Magical 24

## Purpose
No Preview is described as ready for UAT or Production until every applicable gate below has passed and the results are recorded in the pull request.

## QA Environment Bootstrap (one-time)
Use a separate Supabase **QA** project. Do not point automated room tests at the Production database because every smoke run creates an isolated room and Player record.

1. Create the QA project and apply the same migrations as Production.
2. In Vercel, set these values for **Preview** deployments to QA-only values:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `JIXGO_HOST_CONTROL_KEY`
3. In GitHub repository settings, create the Actions secret `JIXGO_QA_HOST_CONTROL_KEY` with the QA Host key.
4. In GitHub repository settings, create Actions variable `QA_LIVE_SMOKE_ENABLED` with value `true`.

The workflow `.github/workflows/live-room-smoke.yml` then runs after a successful non-Production deployment. It receives only the Preview URL and QA Host key; no Production secret is read or printed.

## Gate 1 — Engineering
- `npm run typecheck` passes.
- `npm run build` passes.
- The change does not expose correct answers to Players before the reveal phase.
- No database migration, room state, scoring, timer, or Host authorization change is included unless explicitly scoped and separately verified.

## Gate 2 — Functional QA
For any Host or room change, first run the live smoke in the target Preview environment:

`JIXGO_QA_BASE_URL=<exact-preview-url> JIXGO_QA_HOST_CONTROL_KEY=<qa-key> npm run qa:live-room`

It verifies Host login, room setup/20-question seeding, Host state, Player join, and Player state. The GitHub Actions workflow runs the same script automatically after QA bootstrap is complete.

Then manually confirm:
1. Open `/host` without a Host session: the dashboard is unavailable.
2. Sign in using the configured Preview Host control key.
3. Select **Create new room** once: a six-digit code is generated, seeded, and connected without an intermediate “room not found” message.
4. Join from a separate Player session and confirm the lobby shows the room.
5. Start Question 1, submit an answer, wait for automatic reveal, and proceed to Question 2.
6. Refresh/rejoin the Player session and confirm the player can resume the room.
7. Check Question 20, Q20 summary, and final leaderboard.

## Gate 3 — Visual and Mobile QA
- Check `/` at 360px, 390px, and desktop width: the approved castle artwork (`background-00.jpg`) is visibly present and content remains readable.
- Check the question card, answer reveal, Q20 inputs, and result screen at 360px and 390px.
- Check reduced motion does not conceal controls or content.
- A reviewer must compare the rendered Preview against the PO-approved visual direction before UAT is requested.

## Release Rules
- A failed or unrun gate blocks a Production merge.
- Preview-only environment variables must be configured for the target Preview deployment before Host/game QA.
- QA must report an exact Preview deployment URL and commit SHA; never report a guessed public alias.
