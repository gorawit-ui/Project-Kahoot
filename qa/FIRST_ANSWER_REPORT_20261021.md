# First-answer crash: original diagnosis and follow-ups

Latest status: the corrected preview completed a 45-participant, 20-question rehearsal. See [PREVIEW_QA_REPORT_20261022.md](PREVIEW_QA_REPORT_20261022.md) for current evidence and remaining release gates. The dated sections below preserve the investigation history.

Date: 22 October 2026, Asia/Bangkok (UTC reproduction: 21 October 17:01–17:06).
Production: jixgo-magical-24.vercel.app, main 241c7a2.
Severity: Critical / release blocker. Production remains affected; the fix is deployed and tested on Preview only.

## Observed scenarios

| Case | Steps | Result |
| --- | --- | --- |
| FA-01 | Join isolated fixture through browser UI, Ready, start question 1, click answer A, wait for automatic reveal | FAIL: error boundary “หน้าจอสะดุดชั่วคราว”; TypeError: i is not a function at React effect cleanup iS, chunk 2aidd8va0o__d.js:1:118846 |
| FA-02 | Click retry on the same play page | PASS: reveal and player leaderboard load without rejoining; database confirms one player and one stored answer |
| FA-03 | Start question 2, let timer expire without answering | FAIL: same effect-cleanup crash at reveal; submitting an answer is not required to trigger it |

Two observed production transitions failed out of two. This small targeted sample does not establish a population failure percentage. A single browser/player is sufficient to reproduce the crash; it does not require 45-player load.

## Diagnosis and correction

QuestionProgress used an expression-bodied useEffect that returned scrollIntoView’s result. React interprets any returned value as an effect cleanup. A non-function result can crash when the question rail unmounts for reveal. The production stack location was verified to call the stored effect destructor. The correction uses a block-bodied effect, so no scroll result escapes as a cleanup.

A focused component regression simulates scrollIntoView returning a Promise and performs question → answer → reveal. Before correction: 13 pass, 1 fail with “destroy is not a function”. After correction: 14/14 pass. This reproduces the cleanup mechanism; browser-specific scrolling return values were not independently instrumented.

Typecheck passes. Production build passes after moving a corrupt generated .next persistence cache aside and rebuilding. The first build attempt failed with a local persistence-directory error, unrelated to the application fix.

## Remaining release checks

Deploy corrected branch to an accessible QA preview, then repeat actual browser transitions for answered/unanswered questions, refresh recovery, host screen, full game and 45-player rehearsal. Vercel project listing/runtime logs still return 403 after user reconnect; deployment metadata alone is readable. No production deployment or main merge was performed.

The separate pending session-lookup migration remains unapplied and is not needed for this UI cleanup correction.

## Fixture cleanup

Only isolated fixture room 835734 / quiz a3301cb2-ee0e-49c5-87de-dc0ea7fc08c9 was used. It was deleted with matching quiz ID and title guards. Restored counts verified: 1 quiz, 20 questions, 26 rooms, 17 players, 107 answers. Existing game data was unchanged.


## Follow-up: 22 October 2026, Asia/Bangkok

GitHub/Vercel automatic deployment was verified: deployment dpl_D1Xpcp5XdiTjPzd6mofUEAehCm6g is READY, preview target (not production), exact commit 1ff47a9d844777bd5b33436a00cd0a73328581b0. Previous statements that the fix had not been deployed were incomplete: it had reached a protected preview, but not production. The connector can read specific project/deployment metadata without a team selector. Team-scoped listings/logs still fail.

With explicit user authorization, the connector attempted temporary protected-preview access. Vercel returned actual HTTP 403 at read_protection_bypass, on GET /v2/deployments/dpl_D1Xpcp5XdiTjPzd6mofUEAehCm6g/aliases. No share link was created and no protection setting was changed. Browser sign-in was separately attempted using the user's selected GitHub → Google flow. Google displayed “Too many failed attempts”; automated sign-in stopped. No credentials or OAuth state are recorded in this report. These are provider authorization/authentication blockers, not a failed gameplay test.

The same expression-bodied scrolling effect was found in the Host-only question preview component. A new regression failed before correction when changing questions with a Promise-returning scrollIntoView. It now uses a block-bodied effect to discard the scrolling return value, matching the player correction. This change does not alter Host access control.

Added full-game component coverage: 19 choice question → answer → reveal cycles, unlocking each next question, ten bonus inputs and submission, bonus reveal, room Q20 summary and final ranking. Scrolling returns a Promise throughout, exercising repeated cleanup. The test verifies exactly 20 submissions bound to the visible question IDs and no error-boundary crashes. HTTP responses/scoring are synthetic; this does not validate real cloud scoring, actual browsers, or 45-player concurrency.

Release gate remains NOT APPROVED until the candidate can be tested through an authenticated/shareable preview. No production release, merge to main, pending session-lookup migration, or real game-data changes were made in this follow-up.

Validation of follow-up: 16/16 component tests pass; typecheck and clean production build pass (19 routes). The local generated Turbopack cache again required regeneration after a persistence-directory parse error.
