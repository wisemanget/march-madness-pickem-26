import { DraftState, TournamentResults, AppSettings, HistoricalYear, DEFAULT_PARTICIPANTS } from "./types";
import * as fs from "fs";
import * as path from "path";

const DRAFT_KEY = "draft:state";
const RESULTS_KEY = "draft:results";
const SETTINGS_KEY = "app:settings";
const HISTORY_PREFIX = "history:";
const HISTORY_INDEX_KEY = "history:years";

// File-based storage directory — persists across requests and server restarts
const DATA_DIR = path.join(process.cwd(), ".data");

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function keyToFilename(key: string): string {
  // Replace colons with double underscores for filesystem safety
  return key.replace(/:/g, "__") + ".json";
}

function fileGet<T>(key: string): T | null {
  ensureDataDir();
  const filepath = path.join(DATA_DIR, keyToFilename(key));
  try {
    if (fs.existsSync(filepath)) {
      const raw = fs.readFileSync(filepath, "utf-8");
      return JSON.parse(raw) as T;
    }
  } catch {
    // Corrupted file — treat as missing
  }
  return null;
}

function fileSet<T>(key: string, value: T): void {
  ensureDataDir();
  const filepath = path.join(DATA_DIR, keyToFilename(key));
  fs.writeFileSync(filepath, JSON.stringify(value, null, 2), "utf-8");
}

function fileDelete(key: string): void {
  const filepath = path.join(DATA_DIR, keyToFilename(key));
  try {
    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
    }
  } catch {
    // ignore
  }
}

async function getKV<T>(key: string): Promise<T | null> {
  if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
    const { kv } = await import("@vercel/kv");
    return kv.get<T>(key);
  }
  return fileGet<T>(key);
}

async function setKV<T>(key: string, value: T): Promise<void> {
  if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
    const { kv } = await import("@vercel/kv");
    await kv.set(key, value);
  } else {
    fileSet(key, value);
  }
}

async function deleteKV(key: string): Promise<void> {
  if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
    const { kv } = await import("@vercel/kv");
    await kv.del(key);
  } else {
    fileDelete(key);
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
  deleteHistoricalYear: (year: number) => deleteKV(`${HISTORY_PREFIX}${year}`),
};
