"use client";

import { useState, useEffect, useMemo } from "react";
import { useDraftState } from "@/hooks/useDraftState";
import { useSettings } from "@/hooks/useSettings";
import { TournamentResults } from "@/lib/types";
import { calculateTeamPoints, POINTS_PER_WIN } from "@/lib/scoring";

const REGION_STRIPE: Record<string, string> = {
  East: "region-east",
  South: "region-south",
  Midwest: "region-midwest",
  West: "region-west",
};

function RankBadge({ rank }: { rank: number }) {
  if (rank === 0)
    return (
      <span className="w-10 h-10 rounded-full rank-gold flex items-center justify-center text-lg font-bold shadow-lg shadow-amber-500/30 trophy-spin cursor-pointer">
        🥇
      </span>
    );
  if (rank === 1)
    return (
      <span className="w-10 h-10 rounded-full rank-silver flex items-center justify-center text-lg font-bold shadow-lg">
        🥈
      </span>
    );
  if (rank === 2)
    return (
      <span className="w-10 h-10 rounded-full rank-bronze flex items-center justify-center text-lg font-bold shadow-lg">
        🥉
      </span>
    );
  return (
    <span className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-lg font-bold text-slate-400">
      {rank + 1}
    </span>
  );
}

export default function ScoresPage() {
  const { state, loading } = useDraftState();
  const { settings, loading: settingsLoading } = useSettings();
  const [results, setResults] = useState<TournamentResults | null>(null);

  const participants = settings?.participants || [];

  useEffect(() => {
    const fetchResults = async () => {
      const res = await fetch("/api/results");
      const data = await res.json();
      setResults(data);
    };
    fetchResults();
    const interval = setInterval(fetchResults, 5000);
    return () => clearInterval(interval);
  }, []);

  const scoreboard = useMemo(() => {
    if (!state || !results) return [];

    return participants
      .map((name) => {
        const myPicks = state.picks.filter((p) => p.participantName === name);
        const teams = myPicks.map((p) => {
          const wins = results.wins[p.team.name] || 0;
          const points = calculateTeamPoints(wins);
          return { ...p.team, wins, points };
        });
        const totalPoints = teams.reduce((sum, t) => sum + t.points, 0);
        const totalWins = teams.reduce((sum, t) => sum + t.wins, 0);
        const maxPossible = teams.length * 63;
        return { name, teams, totalPoints, totalWins, maxPossible };
      })
      .sort((a, b) => b.totalPoints - a.totalPoints);
  }, [state, results, participants]);

  if (loading || settingsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <span className="text-5xl animate-float inline-block">🏆</span>
          <div className="text-2xl text-slate-400 animate-pulse mt-4">Loading scores...</div>
        </div>
      </div>
    );
  }

  const hasPicks = state && state.picks.length > 0;
  const hasResults = results && Object.keys(results.wins).length > 0;
  const topScore = scoreboard.length > 0 ? scoreboard[0].totalPoints : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 animate-slide-up">
        <span className="text-4xl">🏆</span>
        <h1 className="text-3xl font-extrabold text-gradient">Scoreboard</h1>
      </div>

      {/* Scoring explanation */}
      <div className="glass-card rounded-2xl p-4 animate-slide-up" style={{ animationDelay: "50ms" }}>
        <h2 className="font-semibold mb-2 flex items-center gap-2">
          <span>📊</span> Scoring System
        </h2>
        <div className="flex gap-3 text-sm flex-wrap">
          {[
            "Round of 64",
            "Round of 32",
            "Sweet 16",
            "Elite 8",
            "Final Four",
            "Championship",
          ].map((round, i) => (
            <span
              key={round}
              className="bg-slate-700/50 px-3 py-1.5 rounded-lg"
            >
              <span className="text-slate-400">{round}:</span>{" "}
              <span className="text-amber-400 font-bold">{POINTS_PER_WIN[i]}pt</span>
            </span>
          ))}
        </div>
      </div>

      {!hasPicks ? (
        <div className="text-slate-500 text-center py-12 glass-card rounded-2xl">
          <span className="text-5xl block mb-4">🏀</span>
          No picks have been made yet.{" "}
          <a href="/draft" className="text-amber-400 underline font-medium">
            Start the draft
          </a>
          .
        </div>
      ) : (
        <div className="space-y-4 stagger-children">
          {scoreboard.map((player, rank) => (
            <div
              key={player.name}
              className={`glass-card rounded-2xl p-5 transition-all hover-lift animate-slide-up ${
                rank === 0 && hasResults
                  ? "border-2 border-amber-400/50 leader-glow"
                  : "border border-slate-700/30"
              }`}
              style={{ animationDelay: `${rank * 80}ms` }}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <RankBadge rank={rank} />
                  <div>
                    <span className="text-xl font-bold">{player.name}</span>
                    <div className="text-xs text-slate-500">
                      {player.teams.length} teams · {player.totalWins} wins
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-extrabold text-gradient">
                    {player.totalPoints}
                  </div>
                  <div className="text-xs text-slate-500">points</div>
                </div>
              </div>

              {/* Score bar relative to leader */}
              {hasResults && topScore > 0 && (
                <div className="w-full bg-slate-700/50 rounded-full h-2 mb-4 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-1000 ${
                      rank === 0
                        ? "bg-gradient-to-r from-amber-500 to-orange-500"
                        : "bg-slate-500"
                    }`}
                    style={{ width: `${(player.totalPoints / topScore) * 100}%` }}
                  />
                </div>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {player.teams
                  .sort((a, b) => b.points - a.points || b.wins - a.wins)
                  .map((team) => (
                    <div
                      key={team.name}
                      className={`bg-slate-700/30 rounded-xl px-3 py-2.5 text-sm hover-lift transition ${
                        REGION_STRIPE[team.region] || ""
                      } ${team.wins >= 4 ? "ring-1 ring-amber-500/30" : ""}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="truncate">
                          <span className="text-amber-400 font-mono text-xs mr-1">
                            ({team.seed})
                          </span>
                          <span className="font-medium">{team.name}</span>
                        </span>
                      </div>
                      {hasResults && (
                        <div className="flex items-center justify-between mt-1.5">
                          <span className="text-xs text-slate-400">
                            {team.wins}W
                          </span>
                          <span
                            className={`text-xs font-bold ${
                              team.points > 0 ? "text-amber-400" : "text-slate-600"
                            }`}
                          >
                            {team.points}pts
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
