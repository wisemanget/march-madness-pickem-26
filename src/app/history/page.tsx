"use client";

import { useState, useEffect, useMemo } from "react";
import { HistoricalYear } from "@/lib/types";
import { calculateTeamPoints } from "@/lib/scoring";

export default function HistoryPage() {
  const [years, setYears] = useState<number[]>([]);
  const [data, setData] = useState<Record<number, HistoricalYear>>({});
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await fetch("/api/history");
        const json = await res.json();
        setYears(json.years || []);
        setData(json.data || {});
        if (json.years?.length > 0 && !selectedYear) {
          setSelectedYear(json.years[0]);
        }
      } catch {
        // retry silently
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

  const yearData = selectedYear ? data[selectedYear] : null;

  const scoreboard = useMemo(() => {
    if (!yearData) return [];
    const { picks, results, participants } = yearData;
    if (!picks || !results || !participants) return [];

    return participants
      .map((name) => {
        const myPicks = picks.filter((p) => p.participantName === name);
        const teams = myPicks.map((p) => {
          const wins = results.wins?.[p.team.name] || 0;
          const points = calculateTeamPoints(wins);
          return { ...p.team, wins, points };
        });
        const totalPoints = teams.reduce((sum, t) => sum + t.points, 0);
        const totalWins = teams.reduce((sum, t) => sum + t.wins, 0);
        return { name, teams, totalPoints, totalWins };
      })
      .sort((a, b) => b.totalPoints - a.totalPoints);
  }, [yearData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <span className="text-5xl animate-float inline-block">📚</span>
          <div className="text-2xl text-slate-400 animate-pulse mt-4">Loading history...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 animate-slide-up">
        <span className="text-4xl">📚</span>
        <h1 className="text-3xl font-extrabold text-gradient">History</h1>
      </div>

      {years.length === 0 ? (
        <div className="glass-card rounded-2xl p-12 text-center animate-slide-up">
          <span className="text-6xl block mb-4">📭</span>
          <h2 className="text-xl font-bold text-slate-300 mb-2">No Historical Data Yet</h2>
          <p className="text-slate-500">
            Save completed tournaments from the{" "}
            <a href="/admin" className="text-amber-400 underline font-medium">
              Admin panel
            </a>{" "}
            to see them here.
          </p>
        </div>
      ) : (
        <>
          {/* Year selector */}
          <div className="flex gap-2 flex-wrap animate-slide-up" style={{ animationDelay: "50ms" }}>
            {years.map((year) => (
              <button
                key={year}
                onClick={() => setSelectedYear(year)}
                className={`px-5 py-2.5 rounded-xl font-bold text-lg transition-all hover-lift ${
                  selectedYear === year
                    ? "bg-gradient-to-r from-amber-500 to-orange-500 text-black shadow-lg shadow-amber-500/20"
                    : "glass-card text-slate-300 hover:text-white"
                }`}
              >
                {year}
              </button>
            ))}
          </div>

          {yearData && (
            <div className="space-y-6 animate-slide-up" style={{ animationDelay: "100ms" }}>
              {/* Year header */}
              <div className="glass-card rounded-2xl p-6 text-center">
                <h2 className="text-4xl font-extrabold text-gradient mb-2">
                  {selectedYear} Tournament
                </h2>
                {yearData.champion && (
                  <p className="text-lg text-slate-300">
                    <span className="text-2xl">🏆</span> Champion:{" "}
                    <span className="text-amber-400 font-bold">{yearData.champion}</span>
                  </p>
                )}
                <p className="text-sm text-slate-500 mt-1">
                  {yearData.participants.length} participants · {yearData.picks.length} picks
                </p>
              </div>

              {/* Winner highlight */}
              {scoreboard.length > 0 && scoreboard[0].totalPoints > 0 && (
                <div className="glass-card rounded-2xl p-6 text-center border-2 border-amber-400/50 leader-glow">
                  <span className="text-5xl trophy-spin inline-block cursor-pointer">🏆</span>
                  <h3 className="text-2xl font-extrabold text-amber-400 mt-2">
                    {scoreboard[0].name}
                  </h3>
                  <p className="text-slate-400">
                    Pool Winner — {scoreboard[0].totalPoints} points
                  </p>
                </div>
              )}

              {/* Standings */}
              <div className="space-y-3 stagger-children">
                {scoreboard.map((player, rank) => (
                  <div
                    key={player.name}
                    className={`glass-card rounded-2xl p-4 hover-lift transition-all ${
                      rank === 0
                        ? "border-2 border-amber-400/30"
                        : "border border-slate-700/30"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <span
                          className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                            rank === 0
                              ? "rank-gold"
                              : rank === 1
                              ? "rank-silver"
                              : rank === 2
                              ? "rank-bronze"
                              : "bg-slate-700 text-slate-400"
                          }`}
                        >
                          {rank === 0 ? "🥇" : rank === 1 ? "🥈" : rank === 2 ? "🥉" : rank + 1}
                        </span>
                        <div>
                          <span className="text-lg font-bold">{player.name}</span>
                          <span className="text-xs text-slate-500 ml-2">
                            {player.totalWins}W
                          </span>
                        </div>
                      </div>
                      <span className="text-2xl font-extrabold text-gradient">
                        {player.totalPoints}pts
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {player.teams
                        .sort((a, b) => b.points - a.points)
                        .map((team) => (
                          <div
                            key={team.name}
                            className="bg-slate-700/20 rounded-lg px-3 py-2 text-sm"
                          >
                            <span className="text-amber-400 font-mono text-xs mr-1">
                              ({team.seed})
                            </span>
                            <span className="font-medium">{team.name}</span>
                            {team.wins > 0 && (
                              <div className="text-xs text-slate-400 mt-0.5">
                                {team.wins}W = {team.points}pts
                              </div>
                            )}
                          </div>
                        ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
