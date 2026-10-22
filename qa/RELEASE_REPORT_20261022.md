# Production stabilization — 22 October 2026, Asia/Bangkok

**LIVE:** https://jixgo-magical-24.vercel.app/ — production deployment dpl_JKQq5yu7SArL6vm1sULSw2azoKzM, READY, main commit 9fbb01c514e6c85227a14e89dd1199fc5e63c070, hnd1. PR21 is merged. Application source commit: 4aa476e2ff37328581f8d1273e07ecae65945778. Build duration: 27.57 seconds. Database performance optimization remains blocked/unapplied; universal event-device readiness is not certified.

The user explicitly requested fixing the known issues and releasing the website to production. This follow-up retains the gameplay fixes validated in PREVIEW_QA_REPORT_20261022.md and configures Vercel Functions in hnd1, close to the Tokyo Supabase database. No access-protection settings, secrets or scoring rules are changed.

## Release checks

- Client regression: 17/17 pass.
- Server gateway regression: 3/3 pass (bounded identical-credential retry; ordinary authorization failures remain failures; non-JSON/aborted requests do not retry).
- Typecheck and production build: pass (19 routes).
- API/schema/authentication smoke: 47/47 pass against the local production build.
- Isolated lookup proposal: legacy 45-player identity/hash preservation, wrong-fingerprint rejection, full backend flow and rollback pass. This is not a cloud capacity result.
- Prior actual full-game rehearsal: 20 questions, 1 browser + 44 protocol sessions, 2269/2269 expected outcomes.
- Preview region deployment: READY, hnd1; 45 players join/ready, answered and unanswered reveals, duplicate/stale rejection, recovery and bounded polling verified.
- Production post-deploy: 572/572 expected protocol outcomes, plus 13/13 malformed/unauthorized boundary requests. One real Chrome browser plays two questions alongside 44 HTTP sessions. This is not 45 real browser engines.
- Local Host session checks: 6/6 pass with a synthetic key (login/cookie flags, valid versus absent/forged session, logout). Real production Host credentials/control UI remain untested; the production Host-login page renders.

## Blocked database optimization

The automatic approval review rejected applying index_player_session_lookup, stating that the broad request did not explicitly approve this exact production schema/index and security-sensitive RPC rewrite. It adds a nullable lookup fingerprint column/index and changes only session lookup in join_room, mark_player_ready, player_room_summary and submit_answer. Existing bcrypt verification and scoring remain intact. The before/after RPC comparison and isolated rollback test pass, but the proposal remains unapplied and outside runnable migrations. No equivalent change was attempted through another execution path. Specific approval remains necessary for the exact proposal in qa/proposed-migrations/20261021153202_index_player_session_lookup.sql.

Consequently, the region change must not be described as resolving all 45-player latency risks. Original release checks on event phones/Wi-Fi and actual Host credentials remain unverified.

## Rollback

Previous main: 241c7a2deb3d4bea5f7a76e6aff521a2b8794c92. Previous production deployment: dpl_6swYTrwVAwncuTJ3rxNif94pgUtP. If post-deploy gameplay fails, restore that deployment. No new database migration is part of this release, so a website rollback requires no database rollback.

Both QA rooms 864209/864210 and cloned quiz 4902f6c9-998d-4c84-b621-943b8b3c3bcb (title QA_RELEASE_20261022_a6d5) were deleted with exact ID/title/room guards after testing. Original counts restored: quizzes 1, questions 20, rooms 26, players 17, answers 107. Lookup column/helper both remain absent. Real event rooms were not changed.

## Transient gateway rejection

The initial 44-player Join burst recorded 43 successes and one JWT issued at future error from the database gateway. A subsequent burst recovered all 44 with their original cookies, without duplicate players. The server fetch now retries this exact gateway clock rejection once after 250ms with unchanged credentials/body. It does not bypass JWT verification or retry ordinary authorization failures. The first failure is retained in raw evidence.

## Production scenarios and results

| ID | Scenario | Result |
| --- | --- | --- |
| PROD-01 | 45 joins/readiness (1 Chrome + 44 HTTP clients) | PASS: all ready |
| PROD-02 | First question submission and reveal | PASS: 45 answers; browser correct reveal, 140 points/rank 1; no Player screen error |
| PROD-03 | Duplicate request while accepting answers | PASS: 44/44 ALREADY_ANSWERED; zero duplicate database pairs |
| PROD-04 | Refresh after first reveal | PASS: same player, accepted answer and 140 points |
| PROD-05 | Restore saved answer through new requests | PASS: 44/44 recovery reads |
| PROD-06 | Continue polling | PASS: bounded 176/176 reads; not a continuous 45-device/1Hz soak |
| PROD-07 | Rejoin with original cookies | PASS: 44/44 rejoined=true |
| PROD-08 | Play next question after first reveal | PASS: another 45 answers; browser correct reveal, total 276 points/rank 1 |
| PROD-09 | Submit stale question ID | PASS: 44/44 QUESTION_CHANGED |
| PROD-10 | Score/answer integrity | PASS: 90 answer rows, zero duplicate pairs, sum of player scores = sum of answer scores = 276 |
| PROD-11 | Malformed JSON and unauthorized commands | PASS: 13/13 production boundary requests; no data mutation |
| PROD-12 | Production Host page | PASS: login page renders; successful login/control with the real key is not certified |
| PROD-13 | Event phones/Wi-Fi and response-time budget | OPEN: protocol RTT exceeds browser timeouts; real event network not tested |

Only the cloned QA quiz used 120-second deadlines for controlled load verification. Original event questions/deadlines are unchanged. The earlier Preview rehearsal separately tested an original 15-second first question and all 20 questions. This production run verifies two questions, not another complete 20-question game.

## Measurements and raw-test interpretation

Production protocol outcomes: Join 44, Ready 44, State 44, Answer Q1 44, Duplicate 44, Recovery 44, Monitor 176, Rejoin 44, Answer Q2 44, Stale 44 = 572/572 expected outcomes. Rejection cases count as passes only for the specified expected error. Browser actions and 13 boundary checks are separate.

Production state in-function p95: 3654.6ms (state burst), 3730.7ms (recovery), 3729.4ms (monitor). Overall request p95: state 11.318s, answers 10.169s/9.939s, monitor 11.404s, rejoin 16.786s. Client timeouts are 7s for state and 10s for answers; protocol timeout is 25s. Therefore these passing outcomes do not certify the browser response-time budget. Prior no-database control was also slow from this environment, so the overhead cannot be attributed solely to application/database work. The region change is deployed, but all latency risk is not resolved.

The release-preview raw file retains 659 requests, 614 marked successful and 45 marked failed. One was the initial transient JWT-clock rejection before the fetch mitigation. The other 44 are an operator test-order mistake: the duplicate harness was run after reveal and expected ALREADY_ANSWERED, while the application correctly returned ANSWER_LOCKED. Those rows remain unchanged. Duplicate rejection was subsequently tested during Q2 (44/44 ALREADY_ANSWERED), and the explicit locked phase verified post-reveal rejection (44/44 ANSWER_LOCKED). These categories must not be conflated with production failures or removed to inflate the pass rate.

## Post-deploy observability

The bounded PostgreSQL error-log scan from 12:10 UTC returned only expected negative-test categories: ANSWER_LOCKED 44, QUESTION_CHANGED 44, ALREADY_ANSWERED 44. No OTHER category appeared in that scan. Vercel runtime-log access returned HTTP 403; the CLI is unavailable locally. This gap is not represented as a clean Vercel error scan. Browser Player-screen error logs were empty for the observed production transitions. Browser extension metadata errors were separate from application errors.

## Evidence

- production-verification-20261022.json: exact deployed commit/region, browser observations, database reconciliation, cleanup and limitations.
- production-load-20261022.json: all 572 production protocol rows.
- production-boundaries-20261022.json: 13 production rejection checks.
- release-load-20261022.json: raw preview follow-up including the initial provider error and test-order mistake.
- host-session-local-20261022.json: six local synthetic-credential checks.
- lookup-release-local-validation-20261022.json: isolated proposal/rollback results; proposal is NOT applied.
- release-before-session-lookup-20261022.sql: inspected live RPC definitions before the rejected proposal.

Post-release evidence/harness updates are saved on the QA branch and do not alter the live production application commit above.
