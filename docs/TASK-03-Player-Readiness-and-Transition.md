# TASK-03 — Player readiness and reliable question transition

## Outcome

Players can see how many people have pressed **ฉันพร้อมแล้ว**, and the Player screen keeps moving from reveal to the Host-selected next question without a stale or failed polling request leaving the page stuck.

## Scope

- Store readiness server-side per player session and expose only the aggregate count.
- Mark readiness once, immediately before the Player enters `/play`.
- Harden Player state polling against overlapping, stale, failed, and indefinitely hanging requests.
- Keep room joining, scoring, answer validation, timers, reveal logic, and Host controls unchanged.

## Design and privacy gate

- The Lobby shows a count only; never player names or a readiness list.
- The authoritative database remains the sole source for ready state.
- An unavailable network shows a recoverable status rather than silently redirecting.

## Verification gate

1. Two joined players press **ฉันพร้อมแล้ว** and both Lobby pages show `2 คนพร้อมแล้ว`.
2. Host starts Q1, lets reveal happen, then selects Q2; a Player remains on `/play` and receives Q2 without reload.
3. Simulate a failed state request: the page remains usable and retries on the next poll.
4. Run typecheck and production build before merge.
