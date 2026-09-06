# TASK-04 — Host game monitor and safe player rejoin

## Outcome

The Host dashboard answers “what is happening in the room now?” at a glance, while a player who returns in the same browser can rejoin using the existing private session and retain their score.

## Scope

- Add a Host-only live monitor: game phase, question number, countdown, joined/ready/answered totals.
- Do not surface player responses or any answer key before reveal.
- Re-use the existing HTTP-only player token on rejoin; refresh `last_seen_at` instead of creating a duplicate player.
- Keep a player with a cleared/other browser session unable to impersonate an existing nickname.

## Acceptance checks

1. Host sees live `Lobby`, `Live`, `Reveal`, `Paused`, and `Finished` phases plus the current question.
2. During a question, Host sees only `answers received / players`, not selections.
3. A player opens Join again in the same browser using the same room and nickname, then returns to their existing score/rank.
4. A second browser using an occupied nickname remains rejected.
5. Typecheck and production build pass.
