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
  updatedAt: string;
}

export interface TournamentResults {
  wins: Record<string, number>;
  updatedAt: string;
}

export const PARTICIPANTS = [
  "Luke",
  "Alex H.",
  "Ryan",
  "Chris K.",
  "Steve",
  "Chris S.",
  "Nick S.",
  "Carlson",
] as const;

export type ParticipantName = (typeof PARTICIPANTS)[number];
