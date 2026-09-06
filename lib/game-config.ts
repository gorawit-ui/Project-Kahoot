export const DEFAULT_GAME_CONFIG = {
  mode: "solo" as const,
  maxPlayers: 100,
  questionCount: 18,
  secondsPerQuestion: 15,
  leaderboardSize: 5,
  showAllLeaderboardToHost: true
};

export const QUESTION_TIME_OPTIONS = [5, 10, 15, 20, 30] as const;
export type GameMode = "solo" | "team";

export type GameConfig = {
  mode: GameMode;
  maxPlayers: number;
  questionCount: number;
  secondsPerQuestion: number;
  leaderboardSize: number;
  showAllLeaderboardToHost: boolean;
};