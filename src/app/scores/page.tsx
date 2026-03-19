"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useDraftState } from "@/hooks/useDraftState";
import { useSettings } from "@/hooks/useSettings";
import { LiveGame, TournamentResults } from "@/lib/types";
import { calculateTeamPoints, remainingPossiblePoints, maxPossibleScore } from "@/lib/scoring";
import TeamLogo from "@/components/TeamLogo";
import { FIRST_FOUR_REPLACEMENTS } from "@/lib/teams";

const REGION_STRIPE: Record<string, string> = {
  East: "region-east",
  South: "region-south",
  Midwest: "region-midwest",
  West: "region-west",
};

function RankBadge({ rank }: { rank: number }) {
  if (rank === 0)
    return (
      <span className="w-9 h-9 sm:w-10 sm:h-10 rounded-full rank-gold flex items-center justify-center text-base sm:text-lg font-bold shadow-lg shadow-amber-500/30 trophy-spin cursor-pointer">
        🥇
      </span>
    );
  if (rank === 1)
    return (
      <span className="w-9 h-9 sm:w-10 sm:h-10 rounded-full rank-silver flex items-center justify-center text-base sm:text-lg font-bold shadow-lg">
        🥈
      </span>
    );
  if (rank === 2)
    return (
      <span className="w-9 h-9 sm:w-10 sm:h-10 rounded-full rank-bronze flex items-center justify-center text-base sm:text-lg font-bold shadow-lg">
        🥉
      </span>
    );
  return (
    <span className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-slate-700 flex items-center justify-center text-base sm:text-lg font-bold text-slate-400">
      {rank + 1}
    </span>
  );
}

function GameStatusBadge({ game }: { game: LiveGame }) {
  if (game.status === "post") {
    return <span className="text-[10px] sm:text-xs font-bold text-slate-400">FINAL</span>;
  }
  if (game.status === "in") {
    return (
      <span className="text-[10px] sm:text-xs font-bold text-green-400 animate-pulse">
        {game.statusDetail || "LIVE"}
      </span>
    );
  }
  // Pre-game
  const time = new Date(game.startTime).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
  return <span className="text-[10px] sm:text-xs text-slate-500">{time}</span>;
}

function LiveGameCard({
  game,
  draftedTeams,
}: {
  game: LiveGame;
  draftedTeams: Record<string, string>; // team name -> participant name
}) {
  const homeOwner = draftedTeams[game.homeTeam.name];
  const awayOwner = draftedTeams[game.awayTeam.name];
  const isLive = game.status === "in";

  return (
    <div
      className={`glass-card rounded-xl p-3 sm:p-4 border transition-all ${
        isLive
          ? "border-green-500/40 bg-green-950/10"
          : game.status === "post"
          ? "border-slate-700/30"
          : "border-slate-700/20 opacity-80"
      }`}
    >
      {/* Round & status header */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] sm:text-xs text-slate-500 font-medium">
          {game.round}
        </span>
        <GameStatusBadge game={game} />
      </div>

      {/* Away team */}
      <TeamRow
        name={game.awayTeam.name}
        espnName={game.awayTeam.espnName}
        seed={game.awayTeam.seed}
        score={game.awayTeam.score}
        winner={game.awayTeam.winner}
        owner={awayOwner}
        isLive={isLive}
        gameStarted={game.status !== "pre"}
      />

      {/* Home team */}
      <TeamRow
        name={game.homeTeam.name}
        espnName={game.homeTeam.espnName}
        seed={game.homeTeam.seed}
        score={game.homeTeam.score}
        winner={game.homeTeam.winner}
        owner={homeOwner}
        isLive={isLive}
        gameStarted={game.status !== "pre"}
      />

      {/* Broadcast */}
      {game.broadcast && (
        <div className="text-[10px] text-slate-600 mt-1.5 text-center">
          {game.broadcast}
        </div>
      )}
    </div>
  );
}

function TeamRow({
  name,
  espnName,
  seed,
  score,
  winner,
  owner,
  isLive,
  gameStarted,
}: {
  name: string;
  espnName: string;
  seed: number;
  score: number;
  winner: boolean;
  owner?: string;
  isLive: boolean;
  gameStarted: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-2 py-1.5 ${
        winner ? "text-white" : gameStarted ? "text-slate-400" : "text-slate-300"
      }`}
    >
      <TeamLogo teamName={name} size="xs" />
      <span className="text-amber-400 font-mono text-[10px] sm:text-xs w-4 text-right">
        {seed > 0 ? seed : ""}
      </span>
      <div className="flex-1 min-w-0">
        <span
          className={`text-xs sm:text-sm font-medium truncate block ${
            winner ? "font-bold" : ""
          }`}
          title={espnName}
        >
          {name}
        </span>
        {owner && (
          <span className="text-[9px] sm:text-[10px] text-amber-400/70">
            {owner}
          </span>
        )}
      </div>
      {gameStarted && (
        <span
          className={`text-base sm:text-lg font-bold tabular-nums min-w-[2ch] text-right ${
            isLive ? "text-white" : winner ? "text-white" : "text-slate-500"
          }`}
        >
          {score}
        </span>
      )}
    </div>
  );
}

export default function ScoresPage() {
  const { state, loading } = useDraftState();
  const { settings, loading: settingsLoading } = useSettings();
  const [results, setResults] = useState<TournamentResults | null>(null);
  const [liveGames, setLiveGames] = useState<LiveGame[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string>("");
  const [tab, setTab] = useState<"standings" | "games">("standings");

  const participants = settings?.participants || [];

  // Fetch results
  useEffect(() => {
    const fetchResults = async () => {
      const res = await fetch("/api/results");
      const data = await res.json();
      setResults(data);
    };
    fetchResults();
    const interval = setInterval(fetchResults, 10000);
    return () => clearInterval(interval);
  }, []);

  // Fetch live games
  useEffect(() => {
    const fetchGames = async () => {
      try {
        const res = await fetch("/api/scores/live");
        const data = await res.json();
        setLiveGames(data.games || []);
      } catch {
        // silent
      }
    };
    fetchGames();
    // Poll every 30 seconds for live scores
    const interval = setInterval(fetchGames, 30000);
    return () => clearInterval(interval);
  }, []);

  // Auto-sync: trigger sync when we detect live games
  useEffect(() => {
    const hasActiveGames = liveGames.some((g) => g.status === "in" || g.status === "post");
    if (!hasActiveGames) return;

    // Sync every 60 seconds when games are active
    const syncResults = async () => {
      try {
        await fetch("/api/scores/sync", { method: "POST" });
        // Refresh results after sync
        const res = await fetch("/api/results");
        const data = await res.json();
        setResults(data);
        setLastSync(new Date().toLocaleTimeString());
      } catch {
        // silent
      }
    };

    syncResults(); // initial sync
    const interval = setInterval(syncResults, 60000);
    return () => clearInterval(interval);
  }, [liveGames.length > 0]);

  const handleManualSync = useCallback(async () => {
    setSyncing(true);
    try {
      const res = await fetch("/api/scores/sync", { method: "POST" });
      const data = await res.json();
      setResults(data.results);
      setLastSync(new Date().toLocaleTimeString());
    } catch {
      // silent
    } finally {
      setSyncing(false);
    }
  }, []);

  // Build drafted teams map: team name -> participant name
  const draftedTeams = useMemo(() => {
    if (!state) return {} as Record<string, string>;
    const map: Record<string, string> = {};
    for (const pick of state.picks) {
      const teamName = FIRST_FOUR_REPLACEMENTS[pick.team.name] || pick.team.name;
      map[teamName] = pick.participantName;
    }
    return map;
  }, [state]);

  const eliminated = useMemo(() => {
    return new Set(results?.eliminated || []);
  }, [results]);

  const scoreboard = useMemo(() => {
    if (!state || !results) return [];

    return participants
      .map((name) => {
        const myPicks = state.picks.filter((p) => p.participantName === name);
        const teams = myPicks.map((p) => {
          const teamName = FIRST_FOUR_REPLACEMENTS[p.team.name] || p.team.name;
          const wins = results.wins[teamName] || 0;
          const points = calculateTeamPoints(wins);
          const isEliminated = eliminated.has(teamName);
          const remaining = remainingPossiblePoints(wins, isEliminated);
          return { ...p.team, name: teamName, wins, points, eliminated: isEliminated, remaining };
        });
        const totalPoints = teams.reduce((sum, t) => sum + t.points, 0);
        const totalWins = teams.reduce((sum, t) => sum + t.wins, 0);
        const maxPossible = maxPossibleScore(
          teams.map((t) => ({ wins: t.wins, eliminated: t.eliminated }))
        );
        const teamsAlive = teams.filter((t) => !t.eliminated).length;
        return { name, teams, totalPoints, totalWins, maxPossible, teamsAlive };
      })
      .sort((a, b) => b.totalPoints - a.totalPoints || b.maxPossible - a.maxPossible);
  }, [state, results, participants, eliminated]);

  // Categorize games
  const liveNow = liveGames.filter((g) => g.status === "in");
  const upcoming = liveGames.filter((g) => g.status === "pre");
  const final = liveGames.filter((g) => g.status === "post");
  const hasGamesToday = liveGames.length > 0;

  if (loading || settingsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <span className="text-5xl animate-float inline-block">🏆</span>
          <div className="text-xl sm:text-2xl text-slate-400 animate-pulse mt-4">
            Loading scores...
          </div>
        </div>
      </div>
    );
  }

  const hasPicks = state && state.picks.length > 0;
  const hasResults = results && Object.keys(results.wins).length > 0;
  const topScore = scoreboard.length > 0 ? scoreboard[0].totalPoints : 0;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between animate-slide-up">
        <div className="flex items-center gap-3">
          <span className="text-3xl sm:text-4xl">🏆</span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gradient">
            Scoreboard
          </h1>
        </div>
        <button
          onClick={handleManualSync}
          disabled={syncing}
          className="text-xs bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 px-3 py-1.5 rounded-lg transition flex items-center gap-1.5"
        >
          <span className={syncing ? "animate-spin" : ""}>🔄</span>
          {syncing ? "Syncing..." : "Sync ESPN"}
        </button>
      </div>

      {/* Live indicator + last sync */}
      {hasGamesToday && (
        <div className="flex items-center justify-between text-xs text-slate-500 animate-slide-up">
          <div className="flex items-center gap-2">
            {liveNow.length > 0 && (
              <>
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <span className="text-green-400 font-medium">
                  {liveNow.length} game{liveNow.length !== 1 ? "s" : ""} live
                </span>
              </>
            )}
            {liveNow.length === 0 && final.length > 0 && (
              <span>{final.length} game{final.length !== 1 ? "s" : ""} final today</span>
            )}
          </div>
          {lastSync && <span>Last sync: {lastSync}</span>}
        </div>
      )}

      {/* Tab toggle */}
      <div className="flex gap-2 animate-slide-up" style={{ animationDelay: "50ms" }}>
        <button
          onClick={() => setTab("standings")}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
            tab === "standings"
              ? "bg-gradient-to-r from-amber-500 to-orange-500 text-black shadow-lg shadow-amber-500/20"
              : "glass-card text-slate-300"
          }`}
        >
          📊 Standings
        </button>
        <button
          onClick={() => setTab("games")}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition flex items-center gap-1.5 ${
            tab === "games"
              ? "bg-gradient-to-r from-amber-500 to-orange-500 text-black shadow-lg shadow-amber-500/20"
              : "glass-card text-slate-300"
          }`}
        >
          🏀 Live Games
          {liveNow.length > 0 && (
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          )}
        </button>
      </div>

      {/* ===== STANDINGS TAB ===== */}
      {tab === "standings" && (
        <>
          {/* Scoring info */}
          <div
            className="glass-card rounded-2xl p-3 sm:p-4 animate-slide-up"
            style={{ animationDelay: "50ms" }}
          >
            <h2 className="font-semibold mb-2 flex items-center gap-2 text-sm sm:text-base">
              <span>📊</span> Scoring System
            </h2>
            <div className="flex gap-2 sm:gap-3 text-sm flex-wrap items-center">
              <span className="bg-slate-700/50 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg">
                <span className="text-amber-400 font-bold text-base sm:text-lg">
                  1 point
                </span>{" "}
                <span className="text-slate-400">per tournament win</span>
              </span>
              <span className="text-slate-500 text-xs sm:text-sm">
                Max 6 pts/team (champion)
              </span>
            </div>
          </div>

          {!hasPicks ? (
            <div className="text-slate-500 text-center py-8 sm:py-12 glass-card rounded-2xl">
              <span className="text-4xl sm:text-5xl block mb-4">🏀</span>
              No picks have been made yet.{" "}
              <a href="/draft" className="text-amber-400 underline font-medium">
                Start the draft
              </a>
              .
            </div>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {scoreboard.map((player, rank) => (
                <div
                  key={player.name}
                  className={`glass-card rounded-2xl p-4 sm:p-5 transition-all animate-slide-up ${
                    rank === 0 && hasResults
                      ? "border-2 border-amber-400/50 leader-glow"
                      : "border border-slate-700/30"
                  }`}
                  style={{ animationDelay: `${rank * 80}ms` }}
                >
                  <div className="flex items-center justify-between mb-3 sm:mb-4">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <RankBadge rank={rank} />
                      <div>
                        <span className="text-lg sm:text-xl font-bold">
                          {player.name}
                        </span>
                        <div className="text-[10px] sm:text-xs text-slate-500">
                          {player.teamsAlive} alive · {player.totalWins} wins
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl sm:text-3xl font-extrabold text-gradient">
                        {player.totalPoints}
                      </div>
                      <div className="text-[10px] sm:text-xs text-slate-500">
                        max {player.maxPossible}
                      </div>
                    </div>
                  </div>

                  {/* Score bar relative to leader */}
                  {hasResults && topScore > 0 && (
                    <div className="w-full bg-slate-700/50 rounded-full h-1.5 sm:h-2 mb-3 sm:mb-4 overflow-hidden relative">
                      {/* Max possible extent (ghost bar) */}
                      <div
                        className="absolute h-full rounded-full bg-slate-600/40 transition-all duration-1000"
                        style={{
                          width: `${Math.min(
                            100,
                            (player.maxPossible /
                              Math.max(
                                ...scoreboard.map((s) => s.maxPossible)
                              )) *
                              100
                          )}%`,
                        }}
                      />
                      {/* Actual score */}
                      <div
                        className={`relative h-full rounded-full transition-all duration-1000 ${
                          rank === 0
                            ? "bg-gradient-to-r from-amber-500 to-orange-500"
                            : "bg-slate-500"
                        }`}
                        style={{
                          width: `${(player.totalPoints / topScore) * 100}%`,
                        }}
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-1.5 sm:gap-2">
                    {player.teams
                      .sort(
                        (a, b) =>
                          (a.eliminated ? 1 : 0) - (b.eliminated ? 1 : 0) ||
                          b.points - a.points ||
                          b.wins - a.wins
                      )
                      .map((team) => (
                        <div
                          key={team.name}
                          className={`bg-slate-700/30 rounded-xl px-2.5 sm:px-3 py-2 sm:py-2.5 text-sm flex items-center gap-2 ${
                            REGION_STRIPE[team.region] || ""
                          } ${team.eliminated ? "opacity-40" : ""} ${
                            team.wins >= 4 ? "ring-1 ring-amber-500/30" : ""
                          }`}
                        >
                          <TeamLogo teamName={team.name} size="sm" />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1">
                              <span className="text-amber-400 font-mono text-[10px] sm:text-xs">
                                ({team.seed})
                              </span>
                              <span className="font-medium truncate text-xs sm:text-sm">
                                {team.name}
                              </span>
                              {team.eliminated && (
                                <span className="text-red-400 text-[10px]">✗</span>
                              )}
                            </div>
                            {hasResults && (
                              <div className="flex items-center justify-between mt-0.5">
                                <span className="text-[10px] sm:text-xs text-slate-400">
                                  {team.wins}W
                                  {!team.eliminated && team.remaining > 0 && (
                                    <span className="text-slate-600">
                                      {" "}
                                      (+{team.remaining} possible)
                                    </span>
                                  )}
                                </span>
                                <span
                                  className={`text-[10px] sm:text-xs font-bold ${
                                    team.points > 0
                                      ? "text-amber-400"
                                      : "text-slate-600"
                                  }`}
                                >
                                  {team.points}pts
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ===== LIVE GAMES TAB ===== */}
      {tab === "games" && (
        <div className="space-y-4 sm:space-y-6 animate-slide-up">
          {!hasGamesToday ? (
            <div className="glass-card rounded-2xl p-8 sm:p-12 text-center">
              <span className="text-5xl block mb-4">📺</span>
              <h2 className="text-lg sm:text-xl font-bold text-slate-300 mb-2">
                No Games Today
              </h2>
              <p className="text-slate-500 text-sm">
                Check back on game days! Scores update automatically from ESPN.
              </p>
            </div>
          ) : (
            <>
              {/* Live games */}
              {liveNow.length > 0 && (
                <div>
                  <h2 className="text-sm font-bold text-green-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                    Live Now
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {liveNow.map((game) => (
                      <LiveGameCard
                        key={game.id}
                        game={game}
                        draftedTeams={draftedTeams}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Upcoming */}
              {upcoming.length > 0 && (
                <div>
                  <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Upcoming
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {upcoming.map((game) => (
                      <LiveGameCard
                        key={game.id}
                        game={game}
                        draftedTeams={draftedTeams}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Final */}
              {final.length > 0 && (
                <div>
                  <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Final
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {final.map((game) => (
                      <LiveGameCard
                        key={game.id}
                        game={game}
                        draftedTeams={draftedTeams}
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
