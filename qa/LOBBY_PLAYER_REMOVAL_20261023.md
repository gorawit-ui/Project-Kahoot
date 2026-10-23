# Lobby departure and Host roster controls — release validation

Status: release authorized on 2026-10-23 after validation. Production smoke checks are recorded separately after deployment.

## Behavior

- Players explicitly confirm leaving while the room is still in its initial lobby. The button exists both on the lobby guest pass and on the play page's waiting screen after Ready.
- Closing a browser tab does not remove anyone automatically.
- Host sees a separate complete roster, including readiness, and confirms removal of a specific player UUID in a specific room. This action is not a permanent ban; the player can intentionally join again.
- Removal is refused after the game has started, even if the Host later returns the room to lobby. Existing answers or nonzero scores also block removal.
- A lost success response can be retried safely. The browser's shared player cookie is retained so its membership in another room is unaffected.
- A removed browser sees the existing missing-player recovery UI on its next poll. Merely polling never re-adds the player.

## Database and authorization

The new `remove_lobby_player` function is SECURITY INVOKER and executable only by service_role. Browser roles cannot invoke it directly. The player API supplies only its HttpOnly identity; the Host API validates its signed Host cookie and supplies its server-held room Host credential. No privileged credential is returned to a client.

The function locks the room row with FOR UPDATE before checking lifecycle and deleting a player. Host's room UPDATE serializes with that lock. If game start commits first, deletion must observe the started room and fail. If removal commits first, Host starts with the reduced roster. No existing gameplay/scoring function is modified.

## Validation

- `npm run build`: passed, including TypeScript.
- `node --test scripts/client-regression.test.mjs scripts/server-regression.test.mjs`: 38 cases.
- `npm run test:lobby`: 5 API cases and 24 local database checks.
- API checks cover invalid input, spoofed identities, session type separation, per-room Host authorization, lifecycle errors, and cookie preservation.
- Database checks cover self/Host removal, duplicate retries, wrong credentials, cross-room target isolation, readiness counts, rejoin, every active/end phase, historical answers, scores and denied public function execution.
- Existing full-game, refresh, Bonus, scoring presentation and Host room-switch regressions are retained.

### Native concurrency validation

Passed on an isolated Vercel Sandbox with native PostgreSQL 17.10 and separate connections. Both lock orders were observed with pg_stat_activity: Host start commits first and removal is rejected; removal commits first and Host starts with the reduced roster. The test reported `passed: true`, `raceOrdersVerified: 2`, `blockedOnRealRowLocks: true`. The disposable sandbox was stopped after the result.

## Release sequence

Apply the additive function/grants migration, deploy the matching application code, then verify the production UI/API in an isolated test room. Existing gameplay/scoring functions and existing room data are not changed by this migration.

Rollback: return to the prior app release and remove the unused function after confirming no callers remain. Deleted lobby memberships are intentional actions; do not treat rollback as a way to restore them.
