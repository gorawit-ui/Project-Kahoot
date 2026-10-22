# Production stabilization — 22 October 2026, Asia/Bangkok

The user explicitly requested fixing the known issues and releasing the website to production. This follow-up retains the gameplay fixes validated in PREVIEW_QA_REPORT_20261022.md and configures Vercel Functions in hnd1, close to the Tokyo Supabase database. No access-protection settings, secrets or scoring rules are changed.

## Release checks

- Client regression: 17/17 pass.
- Typecheck and production build: pass (19 routes).
- Isolated lookup proposal: legacy 45-player identity/hash preservation, wrong-fingerprint rejection, full backend flow and rollback pass. This is not a cloud capacity result.
- Prior actual full-game rehearsal: 20 questions, 1 browser + 44 protocol sessions, 2269/2269 expected outcomes.
- Preview with the region configuration and production post-deploy checks: pending at this commit.

## Blocked database optimization

The automatic approval review rejected applying index_player_session_lookup, stating that the broad request did not explicitly approve this exact production schema/index and security-sensitive RPC rewrite. It adds a nullable lookup fingerprint column/index and changes only session lookup in join_room, mark_player_ready, player_room_summary and submit_answer. Existing bcrypt verification and scoring remain intact. The before/after RPC comparison and isolated rollback test pass, but the proposal remains unapplied and outside runnable migrations. No equivalent change was attempted through another execution path. Specific approval remains necessary for the exact proposal in qa/proposed-migrations/20261021153202_index_player_session_lookup.sql.

Consequently, the region change must not be described as resolving all 45-player latency risks. Original release checks on event phones/Wi-Fi and actual Host credentials remain unverified.

## Rollback

Previous main: 241c7a2deb3d4bea5f7a76e6aff521a2b8794c92. Previous production deployment: dpl_6swYTrwVAwncuTJ3rxNif94pgUtP. If post-deploy gameplay fails, restore that deployment. No new database migration is part of this release, so a website rollback requires no database rollback.

QA fixture for release verification only: room 864209, cloned quiz 4902f6c9-998d-4c84-b621-943b8b3c3bcb, title QA_RELEASE_20261022_a6d5. Delete this exact fixture after testing; never change the event room.
