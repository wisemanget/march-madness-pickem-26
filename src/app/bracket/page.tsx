"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useDraftState } from "@/hooks/useDraftState";
import { LiveGame, TournamentResults } from "@/lib/types";
import {
  buildBracket,
  Matchup,
  BracketTeam,
  ROUNDS,
  REGION_NAMES,
} from "@/lib/bracket";
import TeamLogo from "@/components/TeamLogo";

// Map ESPN round strings to our round numbers
const ESPN_ROUND_MAP: Record<string, number> = {
  "Round of 64": 1,
  "Round of 32": 2,
  "Sweet 16": 3,
  "Elite 8": 4,
  "Final Four": 5,
  Championship: 6,
};

interface LiveOverlay {
  topScore: number;
  bottomScore: number;
  status: "pre" | "in" | "post";
  statusDetail: string;
  broadcast?: string;
  startTime: string;
}

function matchLiveOverlay(
  matchup: Matchup,
  games: LiveGame[]
): LiveOverlay | undefined {
  if (!matchup.top || !matchup.bottom) return undefined;

  const game = games.find((g) => {
    const names = new Set([g.homeTeam.name, g.awayTeam.name]);
    return names.has(matchup.top!.name) && names.has(matchup.bottom!.name);
  });
  if (!game) return undefined;

  // Figure out which game team maps to top/bottom
  const topIsHome = game.homeTeam.name === matchup.top.name;
  return {
    topScore: topIsHome ? game.homeTeam.score : game.awayTeam.score,
    bottomScore: topIsHome ? game.awayTeam.score : game.homeTeam.score,
    status: game.status,
    statusDetail: game.statusDetail,
    broadcast: game.broadcast,
    startTime: game.startTime,
  };
}

function detectCurrentRound(
  matchups: Matchup[],
  games: LiveGame[]
): number {
  // If there are live games, show that round
  for (const g of games) {
    if (g.status === "in") {
      const rnd = ESPN_ROUND_MAP[g.round];
      if (rnd) return rnd;
    }
  }
  // If there are upcoming games today, show that round
  for (const g of games) {
    if (g.status === "pre") {
      const rnd = ESPN_ROUND_MAP[g.round];
      if (rnd) return rnd;
    }
  }
  // Otherwise find the latest round with undecided matchups
  for (let r = 6; r >= 1; r--) {
    const roundMatchups = matchups.filter((m) => m.round === r);
    const hasDecided = roundMatchups.some((m) => m.winner);
    const hasUndecided = roundMatchups.some((m) => !m.winner);
    if (hasDecided && hasUndecided) return r; // partially complete round
    if (hasDecided && !hasUndecided && r < 6) return r + 1; // fully complete, show next
  }
  return 1;
}

// ─── Team Row ────────────────────────────────────────────────────────────────

function MatchupTeamRow({
  team,
  score,
  isWinner,
  isLoser,
  isLive,
  gameStarted,
}: {
  team: BracketTeam | null;
  score?: number;
  isWinner: boolean;
  isLoser: boolean;
  isLive: boolean;
  gameStarted: boolean;
}) {
  if (!team) {
    return (
      <div className="flex items-center gap-2 py-2 px-3">
        <div className="w-5 h-5 rounded-full bg-slate-700/50 shrink-0" />
        <span className="text-xs text-slate-600 italic">TBD</span>
      </div>
    );
  }

  return (
    <div
      className={`flex items-center gap-2 py-2 px-3 rounded-lg transition-colors ${
        isWinner
          ? "bg-green-900/20"
          : isLoser
          ? "opacity-40"
          : ""
      }`}
    >
      <TeamLogo teamName={team.name} size="xs" />
      <span className="text-amber-400 font-mono text-[10px] w-4 text-right shrink-0">
        {team.seed}
      </span>
      <div className="flex-1 min-w-0">
        <span
          className={`text-xs sm:text-sm truncate block ${
            isWinner ? "font-bold text-white" : "font-medium text-slate-300"
          }`}
        >
          {team.name}
        </span>
        {team.owner && (
          <span className="text-[9px] sm:text-[10px] text-amber-400/70 block truncate">
            {team.owner}
          </span>
        )}
      </div>
      {gameStarted && score !== undefined && (
        <span
          className={`text-base sm:text-lg font-bold tabular-nums min-w-[2ch] text-right ${
            isLive ? "text-white" : isWinner ? "text-white" : "text-slate-500"
          }`}
        >
          {score}
        </span>
      )}
      {isWinner && !gameStarted && (
        <span className="text-green-400 text-xs font-bold">W</span>
      )}
    </div>
  );
}

// ─── Matchup Card ────────────────────────────────────────────────────────────

function MatchupCard({
  matchup,
  live,
}: {
  matchup: Matchup;
  live?: LiveOverlay;
}) {
  const isLive = live?.status === "in";
  const isFinal = live?.status === "post" || (!live && !!matchup.winner);
  const isPre = live?.status === "pre";
  const gameStarted = isLive || isFinal;

  // Determine winner display
  const topWins = matchup.winner === "top" || (live?.status === "post" && (live.topScore > live.bottomScore));
  const bottomWins = matchup.winner === "bottom" || (live?.status === "post" && (live.bottomScore > live.topScore));

  return (
    <div
      className={`glass-card rounded-xl overflow-hidden border transition-all ${
        isLive
          ? "border-green-500/40 bg-green-950/10 shadow-lg shadow-green-500/5"
          : isFinal
          ? "border-slate-700/30"
          : "border-slate-700/20"
      }`}
    >
      <MatchupTeamRow
        team={matchup.top}
        score={live ? live.topScore : undefined}
        isWinner={topWins}
        isLoser={bottomWins}
        isLive={isLive}
        gameStarted={gameStarted}
      />

      <div className="border-t border-slate-700/30" />

      <MatchupTeamRow
        team={matchup.bottom}
        score={live ? live.bottomScore : undefined}
        isWinner={bottomWins}
        isLoser={topWins}
        isLive={isLive}
        gameStarted={gameStarted}
      />

      {/* Status footer */}
      <div className="px-3 py-1.5 border-t border-slate-700/20 flex items-center justify-between">
        {isLive ? (
          <span className="text-[10px] sm:text-xs font-bold text-green-400 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            {live?.statusDetail || "LIVE"}
          </span>
        ) : isFinal ? (
          <span className="text-[10px] sm:text-xs font-bold text-slate-500">
            FINAL
          </span>
        ) : isPre && live ? (
          <span className="text-[10px] sm:text-xs text-slate-500">
            {new Date(live.startTime).toLocaleTimeString([], {
              hour: "numeric",
              minute: "2-digit",
            })}
          </span>
        ) : (
          <span className="text-[10px] sm:text-xs text-slate-600 italic">
            {matchup.top && matchup.bottom ? "Upcoming" : ""}
          </span>
        )}
        {live?.broadcast && (
          <span className="text-[9px] sm:text-[10px] text-slate-600">
            {live.broadcast}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function BracketPage() {
  const { state, loading } = useDraftState();
  const [results, setResults] = useState<TournamentResults | null>(null);
  const [liveGames, setLiveGames] = useState<LiveGame[]>([]);
  const [selectedRound, setSelectedRound] = useState<number>(1);
  const [regionFilter, setRegionFilter] = useState<string>("All");
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState("");
  const [roundAutoDetected, setRoundAutoDetected] = useState(false);

  // Fetch results (poll every 10s)
  useEffect(() => {
    const fetchResults = async () => {
      try {
        const res = await fetch("/api/results");
        const data = await res.json();
        setResults(data);
      } catch {
        /* silent */
      }
    };
    fetchResults();
    const interval = setInterval(fetchResults, 10000);
    return () => clearInterval(interval);
  }, []);

  // Fetch live games (poll every 30s)
  useEffect(() => {
    const fetchGames = async () => {
      try {
        const res = await fetch("/api/scores/live");
        const data = await res.json();
        setLiveGames(data.games || []);
      } catch {
        /* silent */
      }
    };
    fetchGames();
    const interval = setInterval(fetchGames, 30000);
    return () => clearInterval(interval);
  }, []);

  // Auto-sync when games are active
  useEffect(() => {
    const hasActive = liveGames.some(
      (g) => g.status === "in" || g.status === "post"
    );
    if (!hasActive) return;

    const syncResults = async () => {
      try {
        await fetch("/api/scores/sync", { method: "POST" });
        const res = await fetch("/api/results");
        const data = await res.json();
        setResults(data);
        setLastSync(new Date().toLocaleTimeString());
      } catch {
        /* silent */
      }
    };
    syncResults();
    const interval = setInterval(syncResults, 60000);
    return () => clearInterval(interval);
  }, [liveGames.length > 0]);

  const handleSync = useCallback(async () => {
    setSyncing(true);
    try {
      const res = await fetch("/api/scores/sync", { method: "POST" });
      const data = await res.json();
      setResults(data.results);
      setLastSync(new Date().toLocaleTimeString());
    } catch {
      /* silent */
    } finally {
      setSyncing(false);
    }
  }, []);

  // Build owner map from draft picks
  const owners = useMemo(() => {
    if (!state) return {} as Record<string, string>;
    const map: Record<string, string> = {};
    for (const pick of state.picks) {
      map[pick.team.name] = pick.participantName;
    }
    return map;
  }, [state]);

  // Build full bracket
  const bracket = useMemo(() => {
    return buildBracket(
      results?.wins || {},
      results?.eliminated || [],
      owners
    );
  }, [results, owners]);

  // Auto-detect current round on first load
  useEffect(() => {
    if (!roundAutoDetected && bracket.length > 0) {
      const detected = detectCurrentRound(bracket, liveGames);
      setSelectedRound(detected);
      setRoundAutoDetected(true);
    }
  }, [bracket, liveGames, roundAutoDetected]);

  // Build live game overlay map
  const liveOverlays = useMemo(() => {
    const map = new Map<string, LiveOverlay>();
    for (const m of bracket) {
      const overlay = matchLiveOverlay(m, liveGames);
      if (overlay) map.set(m.id, overlay);
    }
    return map;
  }, [bracket, liveGames]);

  // Filter matchups for display
  const displayMatchups = useMemo(() => {
    let filtered = bracket.filter((m) => m.round === selectedRound);
    if (
      selectedRound <= 4 &&
      regionFilter !== "All"
    ) {
      filtered = filtered.filter((m) => m.region === regionFilter);
    }
    return filtered;
  }, [bracket, selectedRound, regionFilter]);

  // Count decided matchups per round
  const roundStats = useMemo(() => {
    const stats: Record<number, { decided: number; total: number; live: number }> = {};
    for (const r of ROUNDS) {
      const roundMatchups = bracket.filter((m) => m.round === r.num);
      const decided = roundMatchups.filter((m) => m.winner).length;
      const live = roundMatchups.filter((m) => liveOverlays.get(m.id)?.status === "in").length;
      stats[r.num] = { decided, total: r.games, live };
    }
    return stats;
  }, [bracket, liveOverlays]);

  // Live game count
  const liveCount = liveGames.filter((g) => g.status === "in").length;

  // Group matchups by region for display
  const groupedMatchups = useMemo(() => {
    if (selectedRound >= 5) {
      // Final Four and Championship - no region grouping
      return [{ region: undefined, matchups: displayMatchups }];
    }
    const groups: { region: string; matchups: Matchup[] }[] = [];
    for (const region of REGION_NAMES) {
      const regionMatchups = displayMatchups.filter(
        (m) => m.region === region
      );
      if (regionMatchups.length > 0) {
        groups.push({ region, matchups: regionMatchups });
      }
    }
    return groups;
  }, [displayMatchups, selectedRound]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <span className="text-5xl animate-float inline-block">🏀</span>
          <div className="text-xl sm:text-2xl text-slate-400 animate-pulse mt-4">
            Loading bracket...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between animate-slide-up">
        <div className="flex items-center gap-3">
          <span className="text-3xl sm:text-4xl">🏟️</span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gradient">
            Bracket
          </h1>
        </div>
        <button
          onClick={handleSync}
          disabled={syncing}
          className="text-xs bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 px-3 py-1.5 rounded-lg transition flex items-center gap-1.5"
        >
          <span className={syncing ? "animate-spin" : ""}>🔄</span>
          {syncing ? "Syncing..." : "Sync ESPN"}
        </button>
      </div>

      {/* Live indicator */}
      {liveCount > 0 && (
        <div className="flex items-center gap-2 text-xs text-slate-500 animate-slide-up">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-green-400 font-medium">
            {liveCount} game{liveCount !== 1 ? "s" : ""} live
          </span>
          {lastSync && (
            <span className="ml-auto">Last sync: {lastSync}</span>
          )}
        </div>
      )}

      {/* Round selector */}
      <div
        className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1 animate-slide-up"
        style={{ animationDelay: "50ms" }}
      >
        {ROUNDS.map((r) => {
          const stats = roundStats[r.num];
          const isActive = selectedRound === r.num;
          const hasLive = stats?.live > 0;

          return (
            <button
              key={r.num}
              onClick={() => setSelectedRound(r.num)}
              className={`px-3 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all whitespace-nowrap flex items-center gap-1.5 shrink-0 ${
                isActive
                  ? "bg-gradient-to-r from-amber-500 to-orange-500 text-black shadow-lg shadow-amber-500/20"
                  : "glass-card text-slate-300 hover:text-white"
              }`}
            >
              <span className="hidden sm:inline">{r.label}</span>
              <span className="sm:hidden">{r.short}</span>
              {stats && stats.decided > 0 && (
                <span
                  className={`text-[10px] rounded-full px-1.5 py-0.5 font-bold ${
                    isActive
                      ? "bg-black/20 text-black"
                      : stats.decided === stats.total
                      ? "bg-green-500/20 text-green-400"
                      : "bg-slate-600/50 text-slate-400"
                  }`}
                >
                  {stats.decided}/{stats.total}
                </span>
              )}
              {hasLive && !isActive && (
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              )}
            </button>
          );
        })}
      </div>

      {/* Region filter (only for R64 through E8) */}
      {selectedRound <= 4 && (
        <div
          className="flex gap-1.5 overflow-x-auto no-scrollbar animate-slide-up"
          style={{ animationDelay: "100ms" }}
        >
          {["All", ...REGION_NAMES].map((r) => (
            <button
              key={r}
              onClick={() => setRegionFilter(r)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition whitespace-nowrap shrink-0 ${
                regionFilter === r
                  ? "bg-slate-600/80 text-white"
                  : "bg-slate-700/30 text-slate-400 hover:text-white"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      )}

      {/* Matchups */}
      <div className="space-y-5 animate-slide-up" style={{ animationDelay: "150ms" }}>
        {groupedMatchups.map((group) => (
          <div key={group.region || "finals"}>
            {group.region && regionFilter === "All" && (
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                {group.region} Region
              </h3>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {group.matchups.map((m) => (
                <MatchupCard
                  key={m.id}
                  matchup={m}
                  live={liveOverlays.get(m.id)}
                />
              ))}
            </div>
          </div>
        ))}

        {displayMatchups.length === 0 && (
          <div className="glass-card rounded-2xl p-8 sm:p-12 text-center">
            <span className="text-5xl block mb-4">🏀</span>
            <h2 className="text-lg sm:text-xl font-bold text-slate-300 mb-2">
              No Matchups Yet
            </h2>
            <p className="text-slate-500 text-sm">
              {selectedRound === 1
                ? "The bracket will populate once the draft is complete."
                : "Earlier rounds need to be completed first."}
            </p>
          </div>
        )}
      </div>

      {/* Final Four bracket summary for FF/Championship rounds */}
      {selectedRound >= 5 && (
        <div className="glass-card rounded-2xl p-4 sm:p-5 animate-slide-up">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
            Region Champions
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {REGION_NAMES.map((region) => {
              const e8 = bracket.find(
                (m) => m.round === 4 && m.region === region
              );
              const champ =
                e8?.winner === "top" ? e8.top : e8?.winner === "bottom" ? e8.bottom : null;
              return (
                <div
                  key={region}
                  className="bg-slate-700/30 rounded-xl p-3 text-center"
                >
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1.5">
                    {region}
                  </div>
                  {champ ? (
                    <div className="flex flex-col items-center gap-1">
                      <TeamLogo teamName={champ.name} size="sm" />
                      <span className="text-xs font-bold text-white truncate w-full">
                        {champ.name}
                      </span>
                      <span className="text-[10px] text-amber-400/70">
                        ({champ.seed}) {champ.owner || ""}
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-600 italic">TBD</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
