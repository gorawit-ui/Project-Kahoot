export type ScoreInput = {
  isCorrect: boolean;
  answeredAtMs: number | null;
  deadlineAtMs: number;
  questionDurationMs: number;
};

export function calculateScore({ isCorrect, answeredAtMs, deadlineAtMs, questionDurationMs }: ScoreInput) {
  if (!isCorrect || answeredAtMs === null) return 0;
  const remainingMs = Math.max(0, deadlineAtMs - answeredAtMs);
  const speedRatio = Math.min(1, remainingMs / questionDurationMs);
  const basePoints = 700;
  const speedPoints = Math.round(300 * speedRatio);
  return basePoints + speedPoints;
}

export function scoreLabel(score: number) {
  return score > 0 ? `+${score}` : "0";
}