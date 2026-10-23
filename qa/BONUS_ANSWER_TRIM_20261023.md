# Bonus answer edge whitespace — local fix

Status: combined release authorized on 2026-10-23 with lobby departure and Host player removal. Production verification follows deployment.

## Behavior and impact

New Bonus submissions have leading/trailing ECMAScript whitespace removed by PostgreSQL before both scoring and storing the answer. `Cheat ` and ` Cheat` therefore become `Cheat`. The exact comparison used by the reveal and room summary sees the same stored value used for scoring.

Internal spaces, case and spelling remain significant. Choice answers, score tiers, speed bonus, deadlines, question binding and authentication are unchanged. Historical responses and scores are not rewritten or reinterpreted by the UI. Correct answer keys remain canonical and unchanged.

This prevents a display-only correction from showing a historical answer as right while leaving its score wrong. Retrospective score correction is a separate action and is not included.

## Validation

- `npm run test:bonus`: 48 assertions in an isolated local PostgreSQL engine, including Unicode edge whitespace, empty answers, wrong spelling/case/internal spaces, stored answer versus correctCount, speed bonus, historical data and privileges, duplicate/late/wrong-question rejection, room summary and existing backend gameplay regression.
- `npm run build`: passed, including TypeScript.
- `node --test scripts/client-regression.test.mjs scripts/server-regression.test.mjs`: 39 combined cases passed, including full game and normalized new responses versus unchanged historical verdicts.

## Release requirements

Apply `20261023085333_trim_bonus_answer_edges.sql` with the matching player rule text after release authorization. The migration replaces only `submit_answer`, retains its existing authority and privileges, and performs no backfill or schema/table changes. Verify a padded Bonus answer in a dedicated test room after release.
