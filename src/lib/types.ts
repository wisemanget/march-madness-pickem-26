export interface Team {
  name: string;
  seed: number;
  region: "East" | "South" | "Midwest" | "West";
}

export interface Pick {
  pickNumber: number;
  participantName: string;
  team: Team;
  timestamp: string;
}

export interface DraftState {
  status: "drafting" | "complete";
  picks: Pick[];
  currentPickIndex: number;
  version: number;
  updatedAt: string;
}

export interface TournamentResults {
  wins: Record<string, number>;
  eliminated: string[];  // teams that have lost
  updatedAt: string;
}

export interface AppSettings {
  participants: string[];
  year: number;
  draftOrderSeed: number[];
  participantPins: Record<string, string>;
  adminPin: string;
  updatedAt: string;
}

export interface HistoricalYear {
  year: number;
  participants: string[];
  picks: Pick[];
  results: TournamentResults;
  teams: Team[];
  champion?: string;
  updatedAt: string;
}

// Default participants - can be customized via admin
export const DEFAULT_PARTICIPANTS = [
  "Luke",
  "Alex H.",
  "Ryan",
  "Chris K.",
  "Steve",
  "Chris S.",
  "Nick S.",
  "Carlson",
];

export type ParticipantName = string;

// Live game data from ESPN
export interface LiveGame {
  id: string;
  status: "pre" | "in" | "post"; // pre-game, in-progress, final
  statusDetail: string; // e.g. "Final", "Halftime", "2nd Half 5:32"
  round: string; // e.g. "Round of 64", "Sweet 16", etc.
  startTime: string; // ISO date
  homeTeam: {
    name: string;       // Our mapped team name (or ESPN name if no match)
    espnName: string;   // Original ESPN display name
    seed: number;
    score: number;
    logo?: string;
    winner: boolean;
  };
  awayTeam: {
    name: string;
    espnName: string;
    seed: number;
    score: number;
    logo?: string;
    winner: boolean;
  };
  broadcast?: string;
}
