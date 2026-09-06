# TASK-05 — Reveal conversation board and Q20 finale

## Product outcome

Make the untimed reveal a shared conversation moment: players and Host see aggregate answer patterns without names or individual selections; Q20 has a separate room-wide ten-song summary before final results.

## State flow

1. `question` ends automatically after the existing timer and three-second beat.
2. `reveal` shows the Player’s personal result. Normal questions also show the A–D aggregate board.
3. At Q20, Host selects **แสดงสรุป Q20** → `q20_summary`.
4. Everyone sees the room summary (10 rows; correct/wrong/unanswered aggregates only).
5. Host selects **แสดงผลรวมเกม ✦** → `finished`.

## Privacy and authority gate

- Aggregate counts are calculated in Postgres from authoritative `answers` only after reveal.
- Never return names, individual choices, or raw answer data to the public state.
- Never return distributions while a question timer is live.
- Scoring, exact Q20 matching, deadlines, answer submission, and existing player summary are unchanged.

## Visual gate

- Original starlit-kingdom visual system: navy/indigo, gold, castle silhouette, CSS/SVG sparkles only.
- Normal board: four columns, number and percentage plus color/symbol; correct answer receives the gold/green treatment.
- Q20 room summary: 2 columns × 5 rows with `✓ / ✕ / —` counts; top summary cards.
- Motion is brief (450–900 ms), reduced-motion aware, and does not block Host control.

## Verification gate

1. No response counts appear before reveal.
2. Normal question counts + unanswered equal player count; no names appear.
3. Q20 row counts sum to player count, including partial and blank answers.
4. At Q20, Host sees `แสดงสรุป Q20`, then `แสดงผลรวมเกม ✦`; no next-question control.
5. Test zero answers, one answer, all same option, partial Q20, refresh on all stages, and mobile 320px.
