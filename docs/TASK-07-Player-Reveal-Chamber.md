# TASK-07 — Player Reveal Chamber

## Product intent

Retain the approved castle artwork as the shared visual world on every route. Improve the player reveal moment without changing game state, scoring, timers, answer privacy, or Supabase behaviour.

## Scope

- Keep the personal correct/wrong result, answer explanation, aggregate answer distribution, and personal scoreboard in one continuous Player reveal screen.
- Do not create a second page shell after the reveal card.
- Keep the aggregate view anonymous: counts only, no player names and no individual answer history.
- Reuse the global castle background and existing lightweight reveal motion.

## Acceptance checks

1. A normal question reveal has one page shell and one scroll flow on mobile.
2. The order is: personal result → anonymous room distribution → personal/live scoreboard.
3. Q20 keeps its separate aggregate chapter and server-side exact checking.
4. No Host API, room-state schema, answer scoring, timer, or database migration changes.
