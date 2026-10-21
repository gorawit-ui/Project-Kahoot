# Stability phase 2 — 21 October 2026

Later checkpoint: the user confirmed 40–45 attendees. See [45-player rehearsal](LOAD45_REPORT_20261021.md) for the actual production API burst results and the still-pending lookup optimization.

**Release decision: not ready to certify for the live event.** Backend regression and local tests pass. Deployment, real browser/device QA and event-size concurrency testing remain required.
This addendum supersedes the deployment-blocker status in phase 1; it preserves the original QA baseline.

## Fixes

| Finding | Fix | Verified scope |
| --- | --- | --- |
| Public host/player hash access (BUG-01) | Revoke direct client SELECT on rooms/players and remove permissive read policies | Applied to Supabase; all four anon/authenticated hash privileges false; service_role reads retained |
| Delayed submission could target the next question | Require a question UUID in the HTTP request. New server-only RPC validates the active UUID under a shared room lock before submitting | Migration applied; stale UUID rejected in real PostgreSQL. HTTP/client code awaits deployment |
| Refresh could re-enable an answered question | Restore accepted response, selection, input values and answer lock from player summary | React component integration test, including StrictMode |
| Old HTTP result could lock a new question | Ignore answer results when their captured question UUID no longer matches | React component integration test |
| Lost response after server acceptance | Recover answer state through polling; treat ALREADY_ANSWERED as accepted instead of inviting duplicate scoring | Backend duplicate rejection plus component recovery test |
| Player clock drift | Return serverNow and calculate the player countdown with a server clock offset | Component test with the device clock 60 seconds ahead |
| Host login/commands/room setup could hang after a network failure | Add timeouts, error handling and finally cleanup; retry Host polling sequentially | Login and command failure component tests; setup failure handling reviewed |
| Host lost selected room after reload | Preserve room in URL and optional local storage | Component integration test |
| Dependency drift between installs | Pin existing package versions and added test dependencies; retain lockfile | TypeScript and production build pass |

Q20 rules, accuracy tiers and exact answer matching are unchanged. This is separate from visual PR #20.

## Executed tests

| Layer | Method | Result |
| --- | --- | --- |
| Backend flow | `qa/backend-transaction-regression.sql` on the actual Supabase database, using the application service_role, a synthetic quiz and rolled-back transaction | PASS: 20 questions, two players, 40 accepted answers, 20 duplicate rejections |
| Backend boundaries | Same regression | PASS: rejoin, nickname conflict, readiness, invalid Host/player, expired answer, automatic reveal, stale question UUID, answer recovery, distributions, Q20 summary gate and final scores/rank |
| Permission compatibility | anon public_room_state call against the synthetic finished room, with direct hash SELECT attempted | PASS: public RPC still functions; direct table reads rejected |
| Fixture cleanup | Separate query after rollback | PASS: quizzes/questions/rooms/players/answers remain 1/20/26/17/107; zero QA rollback quizzes |
| New RPC access | Catalog privilege checks | PASS: service_role can execute; anon/authenticated cannot execute the new wrapper |
| Local API | Production build plus `npm run test:api` | PASS: 45/45 invalid-input and authentication cases (including question UUID and answer-shape validation), no real backend credentials or game writes |
| Client behavior | `npm run test:client` using jsdom, Testing Library and mocked HTTP | PASS: 12/12 tests; these are not real browser/device tests |
| Compilation | `npm run typecheck` and `npm run build` | PASS |

The database regression runs sequentially inside a transaction. It does **not** establish throughput or concurrent-user capacity. Full scoring checks preserve the current formula; they do not resolve the separate Q20 business-rule review.

Security advisors were reviewed after the permission migration. The remaining intentional findings are no direct RLS policies on private game tables and existing SECURITY DEFINER game RPCs callable with validated game tokens. The new wrapper is SECURITY INVOKER and restricted to service_role. Advisor background: [private-table policies](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy) and [public RPC execution](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable).

## Deployment checkpoint

Supabase migrations applied and verified:

- `20261021150659_restrict_game_table_reads`
- `20261021151202_bind_answers_to_question`

Local filenames are aligned with the migration versions returned by the remote history. Do not reapply historical bootstrap migrations to the populated project.

Application changes remain on `codex/stability-phase-1-20261021`, Draft PR #21. No main merge or production application release was performed.

Creating a Vercel QA deployment returned 403: this connection lacks access to team `gorawitjs-projects` (`team_UyFTb7ur3cU1qjUZAYxEBh9O`). There is no authenticated Vercel CLI available as a fallback. The user must grant this Vercel connection access to that team. Existing production metadata remains READY, but it still runs the old application commit.

## Remaining release gates

| Gate | Acceptance criterion | Status |
| --- | --- | --- |
| Deployed end-to-end | Host setup → at least two independent player sessions → Ready → all 20 questions → reveals/Q20 summary → matching final scores | BLOCKED: Vercel team access and Host authentication |
| Devices | iPhone Safari and Android Chrome; question media, all Q20 inputs, keyboard, timers and result layout usable | NOT RUN |
| Recovery | Refresh/rejoin, lost response, network interruption and retry on the deployed build | NOT RUN in real browser |
| Capacity | Expected peak users concurrently join, poll and answer within a documented latency/error budget | NOT RUN: peak user count needed |
| Content/rules | All event questions, media and Q20 scoring accepted by the event owner; review the existing 9-fast vs 10-slow scoring case | Pending business review |
| Release rehearsal | Stage the production build, smoke-test it, retain rollback target, then release and verify Host + players again | Pending preceding gates |

Do not label the site 100% bug-free or event-ready while any required gate is blocked or untested.
