"use client";

import { useState, useEffect, useMemo } from "react";
import { useDraftState } from "@/hooks/useDraftState";
import { TEAMS } from "@/lib/teams";
import { PARTICIPANTS, Team } from "@/lib/types";
import {
  getCurrentDrafter,
  getCurrentRound,
  getPickInRound,
  DRAFT_ORDER,
} from "@/lib/draft-order";

const REGION_COLORS: Record<string, string> = {
  East: "bg-blue-900/50 border-blue-500",
  South: "bg-red-900/50 border-red-500",
  Midwest: "bg-purple-900/50 border-purple-500",
  West: "bg-green-900/50 border-green-500",
};

const REGION_TEXT: Record<string, string> = {
  East: "text-blue-400",
  South: "text-red-400",
  Midwest: "text-purple-400",
  West: "text-green-400",
};

const SEED_COLORS: Record<string, string> = {
  top: "bg-amber-500 text-black",
  mid: "bg-slate-500 text-white",
  low: "bg-slate-700 text-slate-300",
};

function seedColor(seed: number) {
  if (seed <= 4) return SEED_COLORS.top;
  if (seed <= 8) return SEED_COLORS.mid;
  return SEED_COLORS.low;
}

export default function DraftPage() {
  const { state, loading, refetch } = useDraftState();
  const [myName, setMyName] = useState<string>("");
  const [picking, setPicking] = useState(false);
  const [regionFilter, setRegionFilter] = useState<string>("All");

  useEffect(() => {
    const saved = localStorage.getItem("mm-participant");
    if (saved) setMyName(saved);
  }, []);

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

  // Build the draft board grid: rows=rounds, cols=participants
  const draftBoard = useMemo(() => {
    if (!state) return [];
    const board: (typeof state.picks[0] | null)[][] = [];
    for (let round = 0; round < 8; round++) {
      const row: (typeof state.picks[0] | null)[] = [];
      for (let col = 0; col < 8; col++) {
        const pickIndex = round * 8 + col;
        const pick = state.picks[pickIndex] || null;
        row.push(pick);
      }
      board.push(row);
    }
    return board;
  }, [state]);

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

  if (loading || !state) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-2xl text-slate-400 animate-pulse">Loading draft...</div>
      </div>
    );
  }

  const currentDrafter = getCurrentDrafter(state.currentPickIndex);
  const currentRound = getCurrentRound(state.currentPickIndex);
  const pickInRound = getPickInRound(state.currentPickIndex);
  const isMyTurn = myName === currentDrafter && state.status === "drafting";

  // Get column headers for each round (accounts for snake order)
  const getColumnHeaders = (round: number) => {
    const names = [...PARTICIPANTS];
    if (round % 2 === 1) names.reverse();
    return names;
  };

  return (
    <div className="space-y-6">
      {/* Current Pick Banner */}
      {state.status === "drafting" ? (
        <div
          className={`rounded-xl p-4 text-center border-2 ${
            isMyTurn
              ? "bg-amber-500/20 border-amber-400 your-turn-pulse"
              : "bg-slate-800 border-slate-700"
          }`}
        >
          {isMyTurn ? (
            <div>
              <p className="text-amber-400 text-2xl font-bold animate-pulse">
                YOUR TURN!
              </p>
              <p className="text-slate-300">
                Round {currentRound}, Pick {pickInRound} - Select a team below
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
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-xl p-4 text-center bg-green-900/30 border-2 border-green-500">
          <p className="text-green-400 text-2xl font-bold">Draft Complete!</p>
        </div>
      )}

      {!myName && state.status === "drafting" && (
        <div className="bg-yellow-900/30 border border-yellow-600 rounded-lg p-3 text-center text-yellow-300">
          <a href="/" className="underline">Go to home page</a> to select who you are before making picks.
        </div>
      )}

      {/* Draft Board */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
        <h2 className="text-lg font-semibold p-4 border-b border-slate-700">
          Draft Board
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="p-2 text-left text-slate-500 w-16">Rd</th>
                {PARTICIPANTS.map((name) => (
                  <th key={name} className="p-2 text-center text-slate-300 min-w-[100px]">
                    {name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 8 }, (_, round) => {
                const headers = getColumnHeaders(round);
                return (
                  <tr key={round} className="border-b border-slate-700/50">
                    <td className="p-2 text-slate-500 font-mono">{round + 1}</td>
                    {PARTICIPANTS.map((name) => {
                      // Find the pick for this participant in this round
                      const pickIndex = round * 8 + headers.indexOf(name);
                      const pick = state.picks[pickIndex] || null;
                      const isCurrentPick =
                        state.status === "drafting" &&
                        pickIndex === state.currentPickIndex;

                      return (
                        <td
                          key={`${round}-${name}`}
                          className={`p-1 text-center ${
                            isCurrentPick
                              ? "bg-amber-500/20 ring-2 ring-amber-400 ring-inset"
                              : ""
                          }`}
                        >
                          {pick ? (
                            <div
                              className={`rounded px-2 py-1 text-xs border ${
                                REGION_COLORS[pick.team.region]
                              }`}
                            >
                              <span
                                className={`inline-block w-5 h-5 rounded-full text-xs font-bold leading-5 text-center mr-1 ${seedColor(
                                  pick.team.seed
                                )}`}
                              >
                                {pick.team.seed}
                              </span>
                              <span className="font-medium">{pick.team.name}</span>
                            </div>
                          ) : (
                            <span className="text-slate-600">-</span>
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
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">
              Available Teams ({availableTeams.length})
            </h2>
            <div className="flex gap-2">
              {["All", "East", "South", "Midwest", "West"].map((region) => (
                <button
                  key={region}
                  onClick={() => setRegionFilter(region)}
                  className={`px-3 py-1 rounded text-sm transition ${
                    regionFilter === region
                      ? "bg-amber-500 text-black font-bold"
                      : "bg-slate-700 text-slate-300 hover:bg-slate-600"
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
                  className={`rounded-lg p-2 text-left border transition-all ${
                    REGION_COLORS[team.region]
                  } ${
                    isMyTurn && !picking
                      ? "hover:ring-2 hover:ring-amber-400 cursor-pointer hover:scale-105"
                      : "opacity-60 cursor-not-allowed"
                  }`}
                >
                  <div className="flex items-center gap-1">
                    <span
                      className={`inline-block w-5 h-5 rounded-full text-xs font-bold leading-5 text-center shrink-0 ${seedColor(
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
        </div>
      )}
    </div>
  );
}
