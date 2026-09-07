# QA Release Gate — JIXGO Magical 24

## Purpose
No Preview is described as ready for UAT or Production until every applicable gate below has passed and the results are recorded in the pull request.

## Gate 1 — Engineering
- `npm run typecheck` passes.
- `npm run build` passes.
- The change does not expose correct answers to Players before the reveal phase.
- No database migration, room state, scoring, timer, or Host authorization change is included unless explicitly scoped and separately verified.

## Gate 2 — Functional QA
For any Host or room change, test this exact path in the target Preview environment:

Run `JIXGO_QA_BASE_URL=<exact-preview-url> JIXGO_QA_HOST_CONTROL_KEY=<qa-key> npm run qa:live-room` first. This is a real API smoke test; it creates one isolated six-digit QA room and verifies Host login, room setup, Host state, Player join, and Player state.

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
- Preview-only environment variables must be configured for the exact preview branch before Host/game QA.
- QA must report an exact Preview deployment URL and commit SHA; never report a guessed public alias.
