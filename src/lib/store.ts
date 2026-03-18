import { DraftState, TournamentResults, AppSettings, HistoricalYear, DEFAULT_PARTICIPANTS } from "./types";

const DRAFT_KEY = "draft:state";
const RESULTS_KEY = "draft:results";
const SETTINGS_KEY = "app:settings";
const HISTORY_PREFIX = "history:";
const HISTORY_INDEX_KEY = "history:years";

// In-memory fallback for local dev (works with `next dev` since it's a persistent process)
const memoryStore: Record<string, string> = {};

async function getKV<T>(key: string): Promise<T | null> {
  if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
    const { kv } = await import("@vercel/kv");
    return kv.get<T>(key);
  }
  const val = memoryStore[key];
  return val ? JSON.parse(val) : null;
}

async function setKV<T>(key: string, value: T): Promise<void> {
  if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
    const { kv } = await import("@vercel/kv");
    await kv.set(key, value);
  } else {
    memoryStore[key] = JSON.stringify(value);
  }
}

export function getDefaultDraftState(): DraftState {
  return {
    status: "drafting",
    picks: [],
    currentPickIndex: 0,
    updatedAt: new Date().toISOString(),
  };
}

export function getDefaultSettings(): AppSettings {
  return {
    participants: [...DEFAULT_PARTICIPANTS],
    year: new Date().getFullYear(),
    draftOrderSeed: DEFAULT_PARTICIPANTS.map((_, i) => i),
    updatedAt: new Date().toISOString(),
  };
}

export const store = {
  getDraftState: () => getKV<DraftState>(DRAFT_KEY),
  setDraftState: (state: DraftState) => setKV(DRAFT_KEY, state),
  getResults: () => getKV<TournamentResults>(RESULTS_KEY),
  setResults: (results: TournamentResults) => setKV(RESULTS_KEY, results),

  // Settings
  getSettings: () => getKV<AppSettings>(SETTINGS_KEY),
  setSettings: (settings: AppSettings) => setKV(SETTINGS_KEY, settings),

  // History
  getHistoryIndex: () => getKV<number[]>(HISTORY_INDEX_KEY),
  setHistoryIndex: (years: number[]) => setKV(HISTORY_INDEX_KEY, years),
  getHistoricalYear: (year: number) => getKV<HistoricalYear>(`${HISTORY_PREFIX}${year}`),
  setHistoricalYear: (year: number, data: HistoricalYear) =>
    setKV(`${HISTORY_PREFIX}${year}`, data),
};
