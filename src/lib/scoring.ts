// Scoring: 1 point per tournament win
// A team can win 0-6 games (Round of 64 through Championship)
export const POINTS_PER_WIN = 1;
export const MAX_WINS = 6;

export function calculateTeamPoints(wins: number): number {
  return wins * POINTS_PER_WIN;
}

/**
 * Calculate the maximum remaining points a team can still earn.
 * A team that has been eliminated gets 0 remaining.
 * A surviving team can earn (MAX_WINS - currentWins) more points.
 */
export function remainingPossiblePoints(
  currentWins: number,
  eliminated: boolean
): number {
  if (eliminated) return 0;
  return Math.max(0, MAX_WINS - currentWins) * POINTS_PER_WIN;
}

/**
 * Calculate the maximum possible total score for a participant.
 * This is their current score + the sum of remaining possible points
 * for each of their surviving teams.
 */
export function maxPossibleScore(
  teams: { wins: number; eliminated: boolean }[]
): number {
  return teams.reduce(
    (total, team) =>
      total +
      calculateTeamPoints(team.wins) +
      remainingPossiblePoints(team.wins, team.eliminated),
    0
  );
}
