"use client";

import { useState, useEffect, useMemo } from "react";
import { useDraftState } from "@/hooks/useDraftState";
import { PARTICIPANTS, TournamentResults } from "@/lib/types";
import { calculateTeamPoints, POINTS_PER_WIN } from "@/lib/scoring";

export default function ScoresPage() {
  const { state, loading } = useDraftState();
  const [results, setResults] = useState<TournamentResults | null>(null);

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

    return PARTICIPANTS.map((name) => {
      const myPicks = state.picks.filter((p) => p.participantName === name);
      const teams = myPicks.map((p) => {
        const wins = results.wins[p.team.name] || 0;
        const points = calculateTeamPoints(wins);
        return { ...p.team, wins, points };
      });
      const totalPoints = teams.reduce((sum, t) => sum + t.points, 0);
      const totalWins = teams.reduce((sum, t) => sum + t.wins, 0);
      return { name, teams, totalPoints, totalWins };
    }).sort((a, b) => b.totalPoints - a.totalPoints);
  }, [state, results]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-2xl text-slate-400 animate-pulse">Loading...</div>
      </div>
    );
  }

  const hasPicks = state && state.picks.length > 0;
  const hasResults = results && Object.keys(results.wins).length > 0;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-amber-400">Scoreboard</h1>

      {/* Scoring explanation */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
        <h2 className="font-semibold mb-2">Scoring System</h2>
        <div className="flex gap-4 text-sm text-slate-400 flex-wrap">
          {["Round of 64", "Round of 32", "Sweet 16", "Elite 8", "Final Four", "Championship"].map(
            (round, i) => (
              <span key={round}>
                {round}: <span className="text-amber-400 font-bold">{POINTS_PER_WIN[i]}pt</span>
              </span>
            )
          )}
        </div>
      </div>

      {!hasPicks ? (
        <div className="text-slate-500 text-center py-12">
          No picks have been made yet. <a href="/draft" className="text-amber-400 underline">Start the draft</a>.
        </div>
      ) : (
        <div className="space-y-4">
          {scoreboard.map((player, rank) => (
            <div
              key={player.name}
              className={`bg-slate-800 rounded-xl border p-4 ${
                rank === 0 && hasResults
                  ? "border-amber-400"
                  : "border-slate-700"
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span
                    className={`text-2xl font-bold ${
                      rank === 0 && hasResults ? "text-amber-400" : "text-slate-500"
                    }`}
                  >
                    #{rank + 1}
                  </span>
                  <span className="text-xl font-semibold">{player.name}</span>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-amber-400">
                    {player.totalPoints} pts
                  </div>
                  <div className="text-xs text-slate-500">
                    {player.totalWins} wins
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {player.teams.map((team) => (
                  <div
                    key={team.name}
                    className="bg-slate-700/50 rounded px-3 py-2 text-sm"
                  >
                    <div className="flex items-center justify-between">
                      <span>
                        <span className="text-amber-400 font-mono text-xs mr-1">
                          ({team.seed})
                        </span>
                        {team.name}
                      </span>
                    </div>
                    {hasResults && (
                      <div className="text-xs text-slate-400 mt-1">
                        {team.wins}W = {team.points}pts
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
