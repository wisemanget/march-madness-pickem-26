// Points awarded per win based on tournament round
// Round of 64 win = 1pt, Round of 32 = 2pt, Sweet 16 = 4pt,
// Elite 8 = 8pt, Final Four = 16pt, Championship = 32pt
export const POINTS_PER_WIN = [1, 2, 4, 8, 16, 32];

export function calculateTeamPoints(wins: number): number {
  let total = 0;
  for (let i = 0; i < wins && i < POINTS_PER_WIN.length; i++) {
    total += POINTS_PER_WIN[i];
  }
  return total;
}

// Max possible points for a team that wins all 6 games: 1+2+4+8+16+32 = 63
