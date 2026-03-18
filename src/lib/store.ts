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

function isKVConfigured(): boolean {
  return !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
}

// Fail loudly in production if KV is not configured
function assertKVInProduction(): void {
  if (process.env.NODE_ENV === "production" && !isKVConfigured()) {
    throw new Error(
      "KV_REST_API_URL and KV_REST_API_TOKEN must be set in production. " +
      "Configure Vercel KV (Upstash Redis) in your Vercel project settings."
    );
  }
}

async function getKV<T>(key: string): Promise<T | null> {
  assertKVInProduction();
  if (isKVConfigured()) {
    const { kv } = await import("@vercel/kv");
    return kv.get<T>(key);
  }
  return fileGet<T>(key);
}

async function setKV<T>(key: string, value: T): Promise<void> {
  assertKVInProduction();
  if (isKVConfigured()) {
    const { kv } = await import("@vercel/kv");
    await kv.set(key, value);
  } else {
    fileSet(key, value);
  }
}

async function deleteKV(key: string): Promise<void> {
  assertKVInProduction();
  if (isKVConfigured()) {
    const { kv } = await import("@vercel/kv");
    await kv.del(key);
  } else {
    fileDelete(key);
  }
}

/**
 * Optimistic locking: set draft state only if version matches.
 * Returns true if write succeeded, false if version mismatch.
 */
async function setDraftStateIfVersion(
  state: DraftState,
  expectedVersion: number
): Promise<boolean> {
  assertKVInProduction();

  if (isKVConfigured()) {
    // For KV, use a simple read-check-write pattern
    // (In a high-concurrency scenario, you'd use a Lua script, but
    // for 8 friends this is sufficient)
    const { kv } = await import("@vercel/kv");
    const current = await kv.get<DraftState>(DRAFT_KEY);
    if (current && current.version !== expectedVersion) {
      return false;
    }
    await kv.set(DRAFT_KEY, state);
    return true;
  }

  // File-based: simple version check
  const current = fileGet<DraftState>(DRAFT_KEY);
  if (current && current.version !== expectedVersion) {
    return false;
  }
  fileSet(DRAFT_KEY, state);
  return true;
}

export function getDefaultDraftState(): DraftState {
  return {
    status: "drafting",
    picks: [],
    currentPickIndex: 0,
    version: 0,
    updatedAt: new Date().toISOString(),
  };
}

export function getDefaultSettings(): AppSettings {
  return {
    participants: [...DEFAULT_PARTICIPANTS],
    year: new Date().getFullYear(),
    draftOrderSeed: DEFAULT_PARTICIPANTS.map((_, i) => i),
    participantPins: {},
    adminPin: "1234",
    updatedAt: new Date().toISOString(),
  };
}

export function isKVHealthy(): { configured: boolean; production: boolean } {
  return {
    configured: isKVConfigured(),
    production: process.env.NODE_ENV === "production",
  };
}

export const store = {
  getDraftState: () => getKV<DraftState>(DRAFT_KEY),
  setDraftState: (state: DraftState) => setKV(DRAFT_KEY, state),
  setDraftStateIfVersion,
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
