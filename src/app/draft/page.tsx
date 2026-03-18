"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useDraftState } from "@/hooks/useDraftState";
import { useSettings } from "@/hooks/useSettings";
import { TEAMS } from "@/lib/teams";
import { Team } from "@/lib/types";
import {
  getCurrentDrafter,
  getCurrentRound,
  getPickInRound,
  generateDraftOrder,
} from "@/lib/draft-order";

const REGION_COLORS: Record<string, string> = {
  East: "bg-blue-900/40 border-blue-500/50",
  South: "bg-red-900/40 border-red-500/50",
  Midwest: "bg-purple-900/40 border-purple-500/50",
  West: "bg-green-900/40 border-green-500/50",
};

const REGION_TEXT: Record<string, string> = {
  East: "text-blue-400",
  South: "text-red-400",
  Midwest: "text-purple-400",
  West: "text-green-400",
};

const REGION_BADGE: Record<string, string> = {
  East: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  South: "bg-red-500/20 text-red-300 border-red-500/30",
  Midwest: "bg-purple-500/20 text-purple-300 border-purple-500/30",
  West: "bg-green-500/20 text-green-300 border-green-500/30",
};

function seedColor(seed: number) {
  if (seed <= 4) return "bg-amber-500 text-black font-bold";
  if (seed <= 8) return "bg-slate-500 text-white";
  if (seed <= 12) return "bg-slate-600 text-slate-200";
  return "bg-slate-700 text-slate-400";
}

function Confetti() {
  const colors = ["#f59e0b", "#ef4444", "#3b82f6", "#22c55e", "#a855f7", "#f97316"];
  const pieces = Array.from({ length: 30 }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    color: colors[Math.floor(Math.random() * colors.length)],
    delay: Math.random() * 0.5,
    size: 6 + Math.random() * 8,
  }));

  return (
    <>
      {pieces.map((p) => (
        <div
          key={p.id}
          className="confetti-piece"
          style={{
            left: `${p.left}%`,
            backgroundColor: p.color,
            animationDelay: `${p.delay}s`,
            width: p.size,
            height: p.size,
            borderRadius: Math.random() > 0.5 ? "50%" : "2px",
          }}
        />
      ))}
    </>
  );
}

export default function DraftPage() {
  const { state, loading, refetch } = useDraftState();
  const { settings, loading: settingsLoading } = useSettings();
  const [myName, setMyName] = useState<string>("");
  const [picking, setPicking] = useState(false);
  const [regionFilter, setRegionFilter] = useState<string>("All");
  const [showConfetti, setShowConfetti] = useState(false);
  const [lastPickCount, setLastPickCount] = useState(0);

  const participants = settings?.participants || [];

  useEffect(() => {
    const saved = localStorage.getItem("mm-participant");
    if (saved) setMyName(saved);
  }, []);

  // Confetti on new pick
  useEffect(() => {
    if (state && state.picks.length > lastPickCount && lastPickCount > 0) {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);
    }
    if (state) setLastPickCount(state.picks.length);
  }, [state?.picks.length]);

  const pickedTeamNames = useMemo(() => {
    if (!state) return new Set<string>();
    return new Set(state.picks.map((p) => p.team.name));
  }, [state]);

  const availableTeams = useMemo(() => {
    return TEAMS.filter((t) => !pickedTeamNames.has(t.name));
  }, [pickedTeamNames]);

  const filteredTeams = useMemo(() => {
    if (regionFilter === "All") return availableTeams;
    return availableTeams.filter((t) => t.region === regionFilter);
  }, [availableTeams, regionFilter]);

  const draftOrder = useMemo(() => generateDraftOrder(participants), [participants]);

  const handlePick = async (team: Team) => {
    if (picking) return;
    setPicking(true);
    try {
      const res = await fetch("/api/draft/pick", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participantName: myName, teamName: team.name }),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "Failed to make pick");
      }
      await refetch();
    } finally {
      setPicking(false);
    }
  };

  if (loading || settingsLoading || !state) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <span className="text-5xl animate-float inline-block">🏀</span>
          <div className="text-2xl text-slate-400 animate-pulse mt-4">Loading draft...</div>
        </div>
      </div>
    );
  }

  const n = participants.length;
  const totalPicks = draftOrder.length;
  const currentDrafter = getCurrentDrafter(state.currentPickIndex, participants);
  const currentRound = getCurrentRound(state.currentPickIndex, n);
  const pickInRound = getPickInRound(state.currentPickIndex, n);
  const isMyTurn = myName === currentDrafter && state.status === "drafting";
  const rounds = n > 0 ? Math.ceil(totalPicks / n) : 0;

  // Get column headers for each round (accounts for snake order)
  const getColumnHeaders = (round: number) => {
    const names = [...participants];
    if (round % 2 === 1) names.reverse();
    return names;
  };

  return (
    <div className="space-y-6">
      {showConfetti && <Confetti />}

      {/* Current Pick Banner */}
      {state.status === "drafting" ? (
        <div
          className={`rounded-2xl p-5 text-center border-2 transition-all ${
            isMyTurn
              ? "bg-gradient-to-r from-amber-500/20 to-orange-500/20 border-amber-400 your-turn-pulse"
              : "glass-card border-slate-700/50"
          }`}
        >
          {isMyTurn ? (
            <div className="animate-bounce-in">
              <p className="text-amber-400 text-3xl font-extrabold animate-pulse">
                🏀 YOUR TURN! 🏀
              </p>
              <p className="text-slate-300 mt-1">
                Round {currentRound}, Pick {pickInRound} — Select a team below
              </p>
            </div>
          ) : (
            <div>
              <p className="text-xl">
                <span className="text-white font-bold">{currentDrafter}</span>
                <span className="text-slate-400"> is on the clock</span>
              </p>
              <p className="text-slate-500 text-sm">
                Round {currentRound}, Pick {pickInRound} (Overall #{state.currentPickIndex + 1})
              </p>
              {/* Mini progress */}
              <div className="w-48 mx-auto mt-3 bg-slate-700 rounded-full h-2 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-500"
                  style={{ width: `${(state.picks.length / totalPicks) * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-2xl p-5 text-center bg-green-900/20 border-2 border-green-500/50 glass-card">
          <span className="text-4xl trophy-spin inline-block cursor-pointer">🏆</span>
          <p className="text-green-400 text-2xl font-bold mt-2">Draft Complete!</p>
        </div>
      )}

      {!myName && state.status === "drafting" && (
        <div className="glass-card border border-yellow-600/50 rounded-xl p-3 text-center text-yellow-300">
          <a href="/" className="underline font-medium">Go to home page</a> to select who you are before making picks.
        </div>
      )}

      {/* Draft Board */}
      <div className="glass-card rounded-2xl overflow-hidden">
        <h2 className="text-lg font-semibold p-4 border-b border-slate-700/50 flex items-center gap-2">
          <span>📋</span> Draft Board
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700/50">
                <th className="p-2 text-left text-slate-500 w-16">Rd</th>
                {participants.map((name) => (
                  <th
                    key={name}
                    className={`p-2 text-center min-w-[110px] ${
                      name === currentDrafter && state.status === "drafting"
                        ? "text-amber-400 font-bold"
                        : "text-slate-300"
                    }`}
                  >
                    {name}
                    {name === myName && (
                      <span className="text-[10px] text-green-400 block">you</span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: rounds }, (_, round) => {
                const headers = getColumnHeaders(round);
                return (
                  <tr key={round} className="border-b border-slate-700/30">
                    <td className="p-2 text-slate-500 font-mono font-bold">{round + 1}</td>
                    {participants.map((name) => {
                      const pickIndex = round * n + headers.indexOf(name);
                      const pick = state.picks[pickIndex] || null;
                      const isCurrentPick =
                        state.status === "drafting" &&
                        pickIndex === state.currentPickIndex;

                      return (
                        <td
                          key={`${round}-${name}`}
                          className={`p-1 text-center ${
                            isCurrentPick
                              ? "bg-amber-500/20 ring-2 ring-amber-400/50 ring-inset rounded"
                              : ""
                          }`}
                        >
                          {pick ? (
                            <div
                              className={`rounded-lg px-2 py-1.5 text-xs border transition-all hover-lift ${
                                REGION_COLORS[pick.team.region]
                              }`}
                            >
                              <span
                                className={`inline-block w-5 h-5 rounded-full text-[10px] font-bold leading-5 text-center mr-1 ${seedColor(
                                  pick.team.seed
                                )}`}
                              >
                                {pick.team.seed}
                              </span>
                              <span className="font-medium">{pick.team.name}</span>
                            </div>
                          ) : (
                            <span className="text-slate-700">—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Team Picker */}
      {state.status === "drafting" && (
        <div className="glass-card rounded-2xl p-4">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <span>🎯</span> Available Teams ({availableTeams.length})
            </h2>
            <div className="flex gap-2 flex-wrap">
              {["All", "East", "South", "Midwest", "West"].map((region) => (
                <button
                  key={region}
                  onClick={() => setRegionFilter(region)}
                  className={`px-3 py-1.5 rounded-lg text-sm transition font-medium ${
                    regionFilter === region
                      ? "bg-gradient-to-r from-amber-500 to-orange-500 text-black font-bold shadow-lg shadow-amber-500/20"
                      : "bg-slate-700/50 text-slate-300 hover:bg-slate-600/50"
                  }`}
                >
                  {region}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-2">
            {filteredTeams
              .sort((a, b) => a.seed - b.seed || a.region.localeCompare(b.region))
              .map((team) => (
                <button
                  key={team.name}
                  disabled={!isMyTurn || picking}
                  onClick={() => handlePick(team)}
                  className={`rounded-xl p-2.5 text-left border transition-all ${
                    REGION_COLORS[team.region]
                  } ${
                    isMyTurn && !picking
                      ? "hover:ring-2 hover:ring-amber-400 cursor-pointer hover:scale-105 hover:shadow-lg hover:shadow-amber-500/10 active:scale-95"
                      : "opacity-50 cursor-not-allowed"
                  }`}
                >
                  <div className="flex items-center gap-1">
                    <span
                      className={`inline-block w-5 h-5 rounded-full text-[10px] font-bold leading-5 text-center shrink-0 ${seedColor(
                        team.seed
                      )}`}
                    >
                      {team.seed}
                    </span>
                    <span className="text-xs font-medium truncate">{team.name}</span>
                  </div>
                  <span className={`text-[10px] ${REGION_TEXT[team.region]}`}>
                    {team.region}
                  </span>
                </button>
              ))}
          </div>

          {isMyTurn && (
            <p className="text-center text-amber-400/60 text-sm mt-4 animate-pulse">
              Tap a team to draft them!
            </p>
          )}
        </div>
      )}
    </div>
  );
}
