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
  status: "waiting" | "drafting" | "complete";
  picks: Pick[];
  currentPickIndex: number;
  version: number;
  pickTimerSeconds: number;
  pickDeadline: string | null;
  readyParticipants: string[];
  updatedAt: string;
}

export interface TournamentResults {
  wins: Record<string, number>;
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
