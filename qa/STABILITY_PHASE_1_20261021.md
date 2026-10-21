# Stability phase 1 — 21 October 2026

Historical checkpoint: the Supabase blocker below was resolved later the same day. See [phase 2](STABILITY_PHASE_2_20261021.md) for current verification and release status.

Base: `main` at `241c7a2deb3d4bea5f7a76e6aff521a2b8794c92`.
Target rehearsal: Friday, 23 October 2026.
This is a retest addendum; the original 79-case QA baseline remains unchanged.

## Changes and release status

| Baseline issue | Change | Current status |
| --- | --- | --- |
| BUG-01: public credential hash access | Add migration revoking direct SELECT on rooms/players from PUBLIC, anon and authenticated; remove permissive read policies. Preserve service_role and existing game RPCs. | Prepared, NOT applied. Supabase apply_migration returned `Invalid or expired requestState`. Follow-up read confirmed both client roles can still read both hash columns. |
| BUG-02: malformed JSON produces 500 | All seven POST routes with JSON input reject malformed/empty/invalid bodies with 400. Host and player authentication remain required for valid requests. | Local production-build API regression passed; not yet released. |
| BUG-03: unavailable Lobby presented as demo | Show loading, room-not-found, unconfigured and connection failure messages; retry sequentially, cancel on unmount and stop each request after 7 seconds. Disable Ready while disconnected. | Implemented; real browser retest pending. |
| BUG-04: whitespace nickname silently ignored | Validate trimmed name and six-digit room before joining. Show feedback, restore button after network failure/10-second timeout; tolerate blocked local storage. | Implemented; real browser retest pending. |

Ready requests also have a 10-second timeout. Q20 scoring, game rules and the separate visual PR #20 are unchanged.

## Executed retest

| ID | Scenario and test case | Expected | Actual | Result |
| --- | --- | --- | --- | --- |
| ST-01 | TypeScript validation: `npm run typecheck` | No type errors | Passed | PASS |
| ST-02 | Clean production build: `npm run build` | All routes compile | Passed, 18 pages generated | PASS |
| ST-03 | Malformed JSON on join, answer, ready, host/login, host, reset, setup | 400 JSON error; no cookie | 7/7 passed | PASS |
| ST-04 | Empty body on those seven routes | 400 JSON error; no cookie | 7/7 passed | PASS |
| ST-05 | JSON null, array and empty object on those seven routes | 400 JSON error; no cookie | 21/21 passed | PASS |
| ST-06 | Wrong host key; host command/reset without host session; Ready/Answer without player session | Existing 403/401/400 authentication responses; no session cookie | 5/5 passed | PASS |
| ST-07 | Supabase migration application | Hash columns inaccessible to both client roles | Connector request-state error; privileges unchanged | BLOCKED |
| ST-08 | Server/RPC compatibility before migration | service_role SELECT allowed; all eight RPCs SECURITY DEFINER; initialization not executable by client roles | Confirmed via catalog queries | PASS, preflight only |

API total: **40 assertions passed, 0 failed**, against a local production build with no real backend credentials and no game-data writes.
Reproduce: `npm run build`, start with `npm run start -- --hostname 127.0.0.1 --port 3101`, then `node scripts/smoke-invalid-requests.mjs`.
The first build hit a local Turbopack cache error; a fresh cache build passed. No application change was required for that cache error.

## Browser and backend cases still required

| ID | Scenario / steps | Expected result | Status |
| --- | --- | --- | --- |
| ST-09 | Enter a six-digit code and a spaces-only nickname, submit | Thai validation message; Join remains usable | NOT RUN in browser |
| ST-10 | Join while network is unavailable, then restore it and retry | Error within 10s, button enabled, later valid join succeeds | NOT RUN in browser |
| ST-11 | Open Lobby with an absent room | Room-not-found message; Ready disabled; no demo message | NOT RUN in browser |
| ST-12 | Lose Lobby connection, restore it, leave route during pending request | Reconnect automatically, no overlapping polls, no updates after unmount | NOT RUN in browser |
| ST-13 | Valid host setup → two players join → Ready → answer → reveal → Q20 → results | Correct state, one accepted answer each, authoritative timing and score | BLOCKED pending a protected QA environment/host session |
| ST-14 | Refresh after answering; double click; answer at deadline; concurrent players at expected event size | No duplicate scoring, correct recovery and transitions | NOT RUN |
| ST-15 | After applying migration, run `qa/check-game-read-privileges.sql` | All four client hash_select values false; all server_select true | BLOCKED by migration application |
| ST-16 | After migration, repeat ST-13 via the deployed API | Normal game flow with direct table reads denied | BLOCKED by migration and deployed QA access |

## Release order

1. Review this additive migration and application diff on the stability branch.
2. Restore working Supabase migration access; apply only `restrict_game_table_reads`. Do not rerun historical migrations against the populated database.
3. Verify ST-15 and the protected host/player flow before marking BUG-01 fixed.
4. Test the application changes on a QA deployment, complete ST-09 through ST-14, and record commit/deployment plus results.
5. Promote the tested commit, then repeat a short Host + two-player smoke test before Friday's rehearsal.

No production application deployment or main-branch merge was performed in this phase. Production still requires the database permission fix. This report does not certify full end-to-end readiness.
