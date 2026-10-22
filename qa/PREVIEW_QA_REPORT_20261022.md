# JIXGO Preview QA — 22 October 2026 (Asia/Bangkok)

Latest production status: released at main 9fbb01c514e6c85227a14e89dd1199fc5e63c070. See [RELEASE_REPORT_20261022.md](RELEASE_REPORT_20261022.md) for live-site checks and remaining blocked database optimization. The Preview findings below are the earlier dated snapshot.

## Result and scope

The original first-reveal crash is fixed and reproduced successfully on the deployed preview. A fresh full-game rehearsal completed with 45 participants: one actual Chrome browser plus 44 independent HTTP sessions. These are not 45 real phones/browsers. Host transitions were exercised through the existing public Supabase RPC with a synthetic, room-specific Host token; the application's Host-login UI was not exercised in this cloud run.

Full-game application commit: 35f8379ee291762aea67ffb1154b7bb57366d931. Configured preview deployment: dpl_1T9cfWm6XTLr12QA3dD5ca5FEr6Y. Targeted follow-up commit: 79d7f2a5121554f7303ecced45d4d1d7f9742bfe; deployment dpl_6TPDdGeceJoLyUR9eL1oy4ni2QLH is READY. Follow-up changes add missing-session recovery, scoreboard spacing and timing instrumentation. Production remains at the existing main build; no main merge or production deployment has been performed.

## Environment correction

The preview initially returned GAME_NOT_CONFIGURED. Inspection without decrypting secrets found all four required Preview variables scoped to the old codex/scaffold-jixgo-magical-24 branch. Their existing Preview scope was moved to codex/stability-phase-1-20261021. Production values/targets were not edited. Redeployment of the exact reviewed commit succeeded. The share link supplied by the user enabled browser and protocol access. Share parameters/cookies are excluded from all reports.

## Scenarios and test cases

| ID | Scenario / expected result | Actual evidence | Result |
| --- | --- | --- | --- |
| QA-01 | First question with original 15-second deadline accepts 45 players and reveals without crashing | Room 962754: 45 stored answers from 45 players; browser reveal displayed; no Player screen error | PASS |
| QA-02 | Refresh restores an accepted answer rather than treating it as unanswered | Q1 reload retains wrong-answer heading and leaderboard | PASS |
| QA-03 | Next question remains playable | First round Q2: 45 stored answers; second full round all 20 questions reached | PASS |
| QA-04 | Fresh 45-player join/readiness | Full room 768791: 44/44 protocol joins and readiness, plus browser player | PASS |
| QA-05 | Complete all 19 choice questions, bonus, room summary, final ranking | Actual browser observed 20 reveals, Q20 summary and finished screen; no player error-boundary log | PASS |
| QA-06 | Missing an answer must not crash reveal or block later questions | Browser intentionally skipped Q3, saw unanswered reveal, then answered Q4 | PASS |
| QA-07 | Accept one answer per player/question | 880/880 protocol answer requests accepted across 20 questions | PASS |
| QA-08 | Duplicate clicks/requests cannot add points | 44/44 duplicate requests rejected with ALREADY_ANSWERED; DB duplicate pairs = 0 | PASS |
| QA-09 | An answer for the previous question cannot score against the current question | 44/44 stale question UUID requests rejected with QUESTION_CHANGED | PASS |
| QA-10 | Read accepted answers through new HTTP connections | 44/44 saved-answer recovery reads succeed | PASS |
| QA-11 | Original browser identity can rejoin during the game | 44/44 rejoin requests return rejoined=true in the fresh run | PASS |
| QA-12 | Continuous polling under the QA load | 157/157 reads pass during the bounded monitor; browser continues to respond | PASS |
| QA-13 | Browser reload preserves player/answer/score | After Q13 submission, reload displays the same nickname, answer result and 149 points | PASS |
| QA-14 | Submit ten bonus inputs and render both bonus screens | 45 ten-item bonus submissions stored; browser bonus reveal and room summary pass | PASS |
| QA-15 | Scores reconcile and final rank renders | 899 answer rows (one intentional non-answer), 45 positive-score players; player score sum = answer score sum = 12839; browser final score 298/rank 1 | PASS |
| QA-16 | A missing/reset session cannot show endless score loading | Missing-cookie HTTP returns PLAYER_SESSION_REQUIRED; actual browser with deleted own QA player shows recovery heading, follows link to Join with room 962754 prefilled; 8 phase/reason combinations pass locally | PASS |
| QA-17 | Long nicknames cannot touch/overlap the score | Actual deployed final leaderboard screenshot and DOM measurements confirm every visible name/score pair has at least 12px separation; final score remains 298/rank 1 | PASS |
| QA-18 | State/answer response time stays below the application timeout on representative event devices/network | Protocol RTT exceeds 7s state / 10s answer thresholds; cloud browser completes, but event mobile/Wi-Fi remains untested | OPEN — release gate |

## Protocol counts for the fresh full-game run

2269 expected outcomes out of 2269 requests; zero unexpected errors. Breakdown: Join 44, Ready 44, accepted answers 880, state reads 968, duplicate rejection 44, saved-response recovery 44, monitor reads 157, rejoin 44, stale-question rejection 44. Expected 409 responses in rejection tests count as passes. Browser actions are additional to these protocol counts.

Full-game fixture deadlines were 120 seconds and Host transitions advanced early after confirmations. The separate original 15-second Q1 case passed before this run. All participants used the first public choice option or synthetic bonus strings; the local/transactional database regressions separately cover correct/incorrect scoring tiers.

## Overnight session case

A roughly 15-hour interruption exceeded the app's eight-hour player-cookie lifetime. On resumption the browser and protocol clients did not send the old player cookie. Old-name rejoin attempts returned NICKNAME_TAKEN (44/44), and 176 public-state reads lacked a player summary. These failures remain in raw measurements for room 962754; they are not silently discarded or represented as fresh-run successes. Browser-runtime reset versus cookie expiry was not independently isolated, but an absent-cookie state was directly observed. An expired/cleared browser cookie does not establish ownership of an old nickname, so the change supplies a clear rejoin route instead of claiming someone else's score. The full run used a new scoped QA room and fresh sessions.

## Performance and remaining verification

Fresh-run answer p95 peaked at 11.634 seconds; state-read p95 peaked at 19.893 seconds from the protocol test environment. No application errors occurred, but these round trips exceed the client's 7/10-second timeout thresholds and cannot certify mobile-network responsiveness. The real cloud browser completed the game successfully. The follow-up adds Server-Timing app duration measured from route-handler entry through database calls. At 44 simultaneous state reads: first batch 44/44 pass, RTT p50/p95/max 15.875/17.015/17.289 seconds, in-function p95/max 3417.5/3630.1ms. A later paired control returns ROOM_REQUIRED without database access in 44/44 requests (RTT p50/p95/max 8.506/8.609/8.848 seconds); the following 44/44 authenticated state reads pass with RTT p50/p95/max 10.636/11.931/12.023 seconds and in-function p95/max 4413.7/4501.3ms. The no-database control itself is slow in this environment. This supports substantial overhead outside the measured handler, but does not isolate Vercel scheduling/cold starts from transport/proxy delay or prove all latency is networking. The protocol harness uses a 25-second timeout, so its success rate must not be equated with passing the shorter browser deadlines.

Targeted follow-up checks pass: missing-session API and actual recovery/link UI, long-name layout and timing header. Additional protocol checks after the full rehearsal: 132/132 expected outcomes (two 44-player state bursts and the 44-player no-database control); these are separate from the 2269-request full-game tally. Remaining release checks: representative iPhone Safari/Android Chrome on the event network with simultaneous polling/submission and actual Host login/control UI. Release readiness remains OPEN because latency and the remaining device/Host checks are unresolved. This report does not certify zero bugs or universal 45-device/network capacity.

## Change safety and regression checks

Client regression: 17/17 pass, including full-game component transitions and absent/reset sessions across question/reveal/summary/finished. API/schema/authentication smoke: 47/47 against a local production build. Typecheck and build pass. The pending lookup proposal is moved out of supabase/migrations into qa/proposed-migrations so a routine migration push cannot apply the unapproved core-RPC changes. Its isolated PGlite/pgcrypto regression and rollback still pass; it remains unapplied on Supabase.

Local execution notes: a generated Turbopack persistence cache needed regeneration; an unbound Next start hit a sandbox network-interface error, resolved by binding loopback and running smoke/server within one execution. These were test-environment issues, not cloud application failures.

## Evidence

- preview-rehearsal-20261022.json: all request rows, including the separate expired/absent-cookie run.
- full-game-controller-20261022.json: scoped Host transition/browser confirmation sequence.
- browser-observations-20261022.json: actual browser observations.
- preview-followup-20261022.json: targeted UI/layout checks, clean-up counts and timing summary.
- missing-session-http-20261022.json: absent-cookie HTTP result.
- lookup-local-validation-20261022.json: isolated proposal/rollback result.
- FIRST_ANSWER_REPORT_20261021.md: original production failure, stack diagnosis and red/green regression.

Both isolated rooms (962754 and 768791) were deleted using the exact cloned quiz UUID and title guards, followed by that cloned quiz. Original data counts were restored and verified after cleanup: quizzes 1, questions 20, rooms 26, players 17, answers 107. The unused QA_RESUME player was first removed with exact fixture/nickname/UUID and no-answer guards to exercise PLAYER_NOT_FOUND. No real room, player or answer was removed. Test-room links are consequently no longer playable.
