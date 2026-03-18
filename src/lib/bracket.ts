import { Team } from "./types";
import { TEAMS } from "./teams";

// Standard NCAA bracket seed pairings for Round of 64 (within each region)
const R64_SEED_PAIRS: [number, number][] = [
  [1, 16], [8, 9], [5, 12], [4, 13],
  [6, 11], [3, 14], [7, 10], [2, 15],
];

// Final Four region pairings
const FF_PAIRINGS: [string, string][] = [
  ["East", "West"],
  ["South", "Midwest"],
];

export interface BracketTeam {
  name: string;
  seed: number;
  region: string;
  owner?: string;
  wins: number;
  eliminated: boolean;
}

export interface Matchup {
  id: string;
  round: number;
  region?: string;
  top: BracketTeam | null;
  bottom: BracketTeam | null;
  winner?: "top" | "bottom";
}

export const ROUNDS = [
  { num: 1, label: "Round of 64", short: "R64", games: 32 },
  { num: 2, label: "Round of 32", short: "R32", games: 16 },
  { num: 3, label: "Sweet 16", short: "S16", games: 8 },
  { num: 4, label: "Elite 8", short: "E8", games: 4 },
  { num: 5, label: "Final Four", short: "F4", games: 2 },
  { num: 6, label: "Championship", short: "Final", games: 1 },
];

export const REGION_NAMES = ["East", "South", "Midwest", "West"] as const;

function findTeam(region: string, seed: number): Team {
  return TEAMS.find((t) => t.region === region && t.seed === seed)!;
}

function toBracketTeam(
  team: Team,
  wins: Record<string, number>,
  eliminated: Set<string>,
  owners: Record<string, string>,
): BracketTeam {
  return {
    name: team.name,
    seed: team.seed,
    region: team.region,
    owner: owners[team.name],
    wins: wins[team.name] || 0,
    eliminated: eliminated.has(team.name),
  };
}

function resolveWinner(
  top: BracketTeam | null,
  bottom: BracketTeam | null,
  minWins: number,
): { winner?: "top" | "bottom"; advancing: BracketTeam | null } {
  if (!top || !bottom) return { advancing: null };
  if (top.wins >= minWins) return { winner: "top", advancing: top };
  if (bottom.wins >= minWins) return { winner: "bottom", advancing: bottom };
  return { advancing: null };
}

export function buildBracket(
  wins: Record<string, number>,
  eliminatedList: string[],
  owners: Record<string, string>,
): Matchup[] {
  const elim = new Set(eliminatedList);
  const all: Matchup[] = [];
  const regionChamps: Record<string, BracketTeam | null> = {};

  for (const region of REGION_NAMES) {
    // Round of 64
    const r64Adv: (BracketTeam | null)[] = [];
    for (let i = 0; i < R64_SEED_PAIRS.length; i++) {
      const [sA, sB] = R64_SEED_PAIRS[i];
      const top = toBracketTeam(findTeam(region, sA), wins, elim, owners);
      const bottom = toBracketTeam(findTeam(region, sB), wins, elim, owners);
      const { winner, advancing } = resolveWinner(top, bottom, 1);
      all.push({ id: `${region}-r1-${i}`, round: 1, region, top, bottom, winner });
      r64Adv.push(advancing);
    }

    // Round of 32
    const r32Adv: (BracketTeam | null)[] = [];
    for (let i = 0; i < 4; i++) {
      const top = r64Adv[i * 2];
      const bottom = r64Adv[i * 2 + 1];
      const { winner, advancing } = resolveWinner(top, bottom, 2);
      all.push({ id: `${region}-r2-${i}`, round: 2, region, top, bottom, winner });
      r32Adv.push(advancing);
    }

    // Sweet 16
    const s16Adv: (BracketTeam | null)[] = [];
    for (let i = 0; i < 2; i++) {
      const top = r32Adv[i * 2];
      const bottom = r32Adv[i * 2 + 1];
      const { winner, advancing } = resolveWinner(top, bottom, 3);
      all.push({ id: `${region}-r3-${i}`, round: 3, region, top, bottom, winner });
      s16Adv.push(advancing);
    }

    // Elite 8
    const { winner, advancing } = resolveWinner(s16Adv[0], s16Adv[1], 4);
    all.push({ id: `${region}-r4-0`, round: 4, region, top: s16Adv[0], bottom: s16Adv[1], winner });
    regionChamps[region] = advancing;
  }

  // Final Four
  const ffAdv: (BracketTeam | null)[] = [];
  for (let i = 0; i < FF_PAIRINGS.length; i++) {
    const [rA, rB] = FF_PAIRINGS[i];
    const top = regionChamps[rA];
    const bottom = regionChamps[rB];
    const { winner, advancing } = resolveWinner(top, bottom, 5);
    all.push({ id: `ff-${i}`, round: 5, top, bottom, winner });
    ffAdv.push(advancing);
  }

  // Championship
  const { winner } = resolveWinner(ffAdv[0], ffAdv[1], 6);
  all.push({ id: "champ-0", round: 6, top: ffAdv[0], bottom: ffAdv[1], winner });

  return all;
}
