# Event readiness — 23 October 2026

Developer, independent QA and player/organizer agent reviews found and corrected stale Host room controls, lost unsubmitted Bonus drafts, a stale Bonus poll overwriting accepted input, and missing Lobby-session recovery. Independent regressions reproduced three failures before correction; all25client cases now pass. Server3/3, local API/schema/auth47/47, typecheck and production build pass.

The explicitly approved session-lookup migration is applied. Existing player identities, bcrypt verification and scores are preserved. The helper remains private; scoring rules are unchanged. A live transactional20-question regression passes40accepted answers and20duplicate rejections, rolling back its fixtures. Concurrent legacy-session, duplicate-click and Host-transition cases pass.

A bounded regional test with45independent HTTP sessions completes1041expected outcomes with zero unexpected outcomes. All45answers are accepted within the original15-second first-question budget (RTT p95about1.02seconds), duplicates are rejected, and automatic reveal/saved-answer recovery succeeds. The30-second polling block completes771requests, p95about2.61seconds, maxabout3.97seconds; one request stays in flight per client. The measured rate is25.7requests/sec, not45requests/sec.

A separate scratch/proxy run recorded35transport failures. These are retained in private evidence; later passing regional checks do not erase them. The scratch no-database control is also slow, so results from different test networks must not be conflated.

This is not a45-real-phone or event-Wi-Fi certification. Real operator Host credentials/control and event iPhone/Android rehearsal remain unverified. Deployed UI browser follow-up and final fixture cleanup are pending at this source commit. No zero-bug guarantee is claimed.
