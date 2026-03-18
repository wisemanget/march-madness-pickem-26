"use client";

import { useState, useEffect, useMemo } from "react";
import { HistoricalYear } from "@/lib/types";
import { calculateTeamPoints } from "@/lib/scoring";
import TeamLogo from "@/components/TeamLogo";

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
          <div className="text-xl sm:text-2xl text-slate-400 animate-pulse mt-4">Loading history...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center gap-3 animate-slide-up">
        <span className="text-3xl sm:text-4xl">📚</span>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-gradient">History</h1>
      </div>

      {years.length === 0 ? (
        <div className="glass-card rounded-2xl p-8 sm:p-12 text-center animate-slide-up">
          <span className="text-5xl sm:text-6xl block mb-4">📭</span>
          <h2 className="text-lg sm:text-xl font-bold text-slate-300 mb-2">No Historical Data Yet</h2>
          <p className="text-slate-500 text-sm sm:text-base">
            Import your Google Sheet data from the{" "}
            <a href="/import" className="text-amber-400 underline font-medium">
              Import page
            </a>
            .
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
                className={`px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl font-bold text-base sm:text-lg transition-all ${
                  selectedYear === year
                    ? "bg-gradient-to-r from-amber-500 to-orange-500 text-black shadow-lg shadow-amber-500/20"
                    : "glass-card text-slate-300"
                }`}
              >
                {year}
              </button>
            ))}
          </div>

          {yearData && (
            <div className="space-y-4 sm:space-y-6 animate-slide-up" style={{ animationDelay: "100ms" }}>
              {/* Year header */}
              <div className="glass-card rounded-2xl p-4 sm:p-6 text-center">
                <h2 className="text-3xl sm:text-4xl font-extrabold text-gradient mb-2">
                  {selectedYear} Tournament
                </h2>
                {yearData.champion && (
                  <p className="text-base sm:text-lg text-slate-300">
                    <span className="text-xl sm:text-2xl">🏆</span> Champion:{" "}
                    <span className="text-amber-400 font-bold">{yearData.champion}</span>
                  </p>
                )}
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  {yearData.participants.length} participants · {yearData.picks.length} picks
                </p>
              </div>

              {/* Winner highlight */}
              {scoreboard.length > 0 && scoreboard[0].totalPoints > 0 && (
                <div className="glass-card rounded-2xl p-4 sm:p-6 text-center border-2 border-amber-400/50 leader-glow">
                  <span className="text-4xl sm:text-5xl trophy-spin inline-block cursor-pointer">🏆</span>
                  <h3 className="text-xl sm:text-2xl font-extrabold text-amber-400 mt-2">
                    {scoreboard[0].name}
                  </h3>
                  <p className="text-slate-400 text-sm sm:text-base">
                    Pool Winner — {scoreboard[0].totalPoints} points
                  </p>
                </div>
              )}

              {/* Standings */}
              <div className="space-y-3">
                {scoreboard.map((player, rank) => (
                  <div
                    key={player.name}
                    className={`glass-card rounded-2xl p-3 sm:p-4 transition-all ${
                      rank === 0
                        ? "border-2 border-amber-400/30"
                        : "border border-slate-700/30"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2 sm:mb-3">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <span
                          className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-bold text-xs sm:text-sm shrink-0 ${
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
                          <span className="text-base sm:text-lg font-bold">{player.name}</span>
                          <span className="text-[10px] sm:text-xs text-slate-500 ml-1 sm:ml-2">
                            {player.totalWins}W
                          </span>
                        </div>
                      </div>
                      <span className="text-xl sm:text-2xl font-extrabold text-gradient">
                        {player.totalPoints}pts
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-1.5 sm:gap-2">
                      {player.teams
                        .sort((a, b) => b.points - a.points)
                        .map((team) => (
                          <div
                            key={team.name}
                            className="bg-slate-700/20 rounded-lg px-2.5 sm:px-3 py-2 text-sm flex items-center gap-2"
                          >
                            <TeamLogo teamName={team.name} size="xs" />
                            <div className="min-w-0 flex-1">
                              <span className="font-medium text-xs sm:text-sm truncate block">{team.name}</span>
                              {team.wins > 0 && (
                                <div className="text-[10px] sm:text-xs text-slate-400">
                                  {team.wins}W = {team.points}pts
                                </div>
                              )}
                            </div>
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
