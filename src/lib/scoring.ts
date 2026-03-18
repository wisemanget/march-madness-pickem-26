// Scoring: 1 point per tournament win
// A team can win 0-6 games (Round of 64 through Championship)
export const POINTS_PER_WIN = 1;

export function calculateTeamPoints(wins: number): number {
  return wins * POINTS_PER_WIN;
}

// Max possible points for a team that wins all 6 games: 6
