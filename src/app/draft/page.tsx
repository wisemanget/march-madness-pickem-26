"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useDraftState } from "@/hooks/useDraftState";
import { useSettings } from "@/hooks/useSettings";
import { useNotifications } from "@/hooks/useNotifications";
import { TEAMS } from "@/lib/teams";
import { Team } from "@/lib/types";
import {
  getCurrentDrafter,
  getCurrentRound,
  getPickInRound,
  generateDraftOrder,
} from "@/lib/draft-order";
import TeamLogo from "@/components/TeamLogo";

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

function seedColor(seed: number) {
  if (seed <= 4) return "bg-amber-500 text-black font-bold";
  if (seed <= 8) return "bg-slate-500 text-white";
  if (seed <= 12) return "bg-slate-600 text-slate-200";
  return "bg-slate-700 text-slate-400";
}

function Confetti() {
  const colors = [
    "#f59e0b",
    "#ef4444",
    "#3b82f6",
    "#22c55e",
    "#a855f7",
    "#f97316",
  ];
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

function CountdownTimer({
  deadline,
  onExpired,
}: {
  deadline: string;
  onExpired: () => void;
}) {
  const [remaining, setRemaining] = useState(0);
  const expiredRef = useRef(false);

  useEffect(() => {
    expiredRef.current = false;
    const tick = () => {
      const ms = new Date(deadline).getTime() - Date.now();
      const sec = Math.max(0, Math.ceil(ms / 1000));
      setRemaining(sec);
      if (sec <= 0 && !expiredRef.current) {
        expiredRef.current = true;
        onExpired();
      }
    };
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [deadline, onExpired]);

  const pct = remaining > 0 ? (remaining / 90) * 100 : 0;
  const urgent = remaining <= 10;

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-slate-700 rounded-full h-2 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            urgent
              ? "bg-red-500 animate-pulse"
              : "bg-gradient-to-r from-amber-500 to-orange-500"
          }`}
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </div>
      <span
        className={`font-mono font-bold text-sm min-w-[3ch] text-right ${
          urgent ? "text-red-400 animate-pulse" : "text-amber-400"
        }`}
      >
        {remaining}s
      </span>
    </div>
  );
}

function DraftLobby({
  myName,
  participants,
  readyParticipants,
  onReady,
  onStart,
}: {
  myName: string;
  participants: string[];
  readyParticipants: string[];
  onReady: () => void;
  onStart: () => void;
}) {
  const allReady = participants.every((p) => readyParticipants.includes(p));
  const amReady = readyParticipants.includes(myName);

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="text-center animate-slide-up">
        <div className="text-5xl mb-3 animate-float inline-block">🏀</div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-gradient">
          Draft Lobby
        </h2>
        <p className="text-slate-400 mt-2">
          Waiting for all participants to ready up...
        </p>
      </div>

      <div className="glass-card rounded-2xl p-4 sm:p-6 animate-slide-up">
        <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
          <span>👥</span> Participants ({readyParticipants.length}/
          {participants.length} ready)
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {participants.map((name) => {
            const isReady = readyParticipants.includes(name);
            return (
              <div
                key={name}
                className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                  isReady
                    ? "bg-green-900/30 border-green-500/50"
                    : "bg-slate-800/50 border-slate-700/50"
                } ${name === myName ? "ring-2 ring-amber-400/50" : ""}`}
              >
                <span
                  className={`w-3 h-3 rounded-full shrink-0 ${
                    isReady ? "bg-green-400" : "bg-slate-600 animate-pulse"
                  }`}
                />
                <span className="font-medium text-sm truncate">
                  {name}
                  {name === myName && (
                    <span className="text-amber-400 text-[10px] ml-1">
                      (you)
                    </span>
                  )}
                </span>
                {isReady && <span className="ml-auto text-green-400">✓</span>}
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-3 animate-slide-up">
        {myName && !amReady && (
          <button
            onClick={onReady}
            className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400 text-white font-bold py-4 rounded-xl text-lg transition shadow-lg shadow-green-500/20 active:scale-[0.98]"
          >
            ✅ I&apos;m Ready!
          </button>
        )}
        {amReady && !allReady && (
          <div className="text-center text-green-400 font-medium py-3 animate-pulse">
            Waiting for others...
          </div>
        )}
        {allReady && (
          <button
            onClick={onStart}
            className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-900 font-bold py-4 rounded-xl text-lg transition shadow-lg shadow-amber-500/20 active:scale-[0.98] animate-bounce-in"
          >
            🏀 Start Draft!
          </button>
        )}
        {!myName && (
          <div className="glass-card border border-yellow-600/50 rounded-xl p-3 text-center text-yellow-300 text-sm">
            <a href="/" className="underline font-medium">
              Go to home page
            </a>{" "}
            to select who you are before readying up.
          </div>
        )}
      </div>
    </div>
  );
}

export default function DraftPage() {
  const { state, loading, refetch, connected } = useDraftState();
  const { settings, loading: settingsLoading } = useSettings();
  const { notifyTurn } = useNotifications();
  const [myName, setMyName] = useState<string>("");
  const [myPin, setMyPin] = useState<string>("");
  const [picking, setPicking] = useState(false);
  const [regionFilter, setRegionFilter] = useState<string>("All");
  const [showConfetti, setShowConfetti] = useState(false);
  const [lastPickCount, setLastPickCount] = useState(0);

  const participants = settings?.participants || [];

  useEffect(() => {
    const saved = localStorage.getItem("mm-participant");
    const token = localStorage.getItem("mm-auth-token");
    if (saved) {
      setMyName(saved);
      if (token) {
        const parts = token.split(":");
        if (parts.length >= 2) setMyPin(parts.slice(1).join(":"));
      }
    }
  }, []);

  // Confetti on new picks
  useEffect(() => {
    if (state && state.picks.length > lastPickCount && lastPickCount > 0) {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);
    }
    if (state) setLastPickCount(state.picks.length);
  }, [state?.picks.length]);

  // Notify when it's my turn
  useEffect(() => {
    if (!state || !myName || state.status !== "drafting") return;
    const currentDrafter = getCurrentDrafter(
      state.currentPickIndex,
      participants
    );
    if (currentDrafter === myName) {
      notifyTurn(state.currentPickIndex);
    }
  }, [state?.currentPickIndex, state?.status, myName, participants, notifyTurn]);

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

  const draftOrder = useMemo(
    () => generateDraftOrder(participants),
    [participants]
  );

  const handlePick = async (team: Team) => {
    if (picking) return;
    setPicking(true);
    try {
      const res = await fetch("/api/draft/pick", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          participantName: myName,
          teamName: team.name,
          pin: myPin || undefined,
        }),
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

  const handleReady = async () => {
    await fetch("/api/draft/ready", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        participantName: myName,
        pin: myPin || undefined,
      }),
    });
    await refetch();
  };

  const handleStart = async () => {
    await fetch("/api/draft", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "start" }),
    });
    await refetch();
  };

  const handleUndo = async () => {
    if (!confirm("Undo the last pick?")) return;
    const adminPin = sessionStorage.getItem("mm-admin-pin");
    const res = await fetch("/api/draft/undo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        participantName: myName,
        pin: myPin || undefined,
        adminPin: adminPin || undefined,
      }),
    });
    if (!res.ok) {
      const err = await res.json();
      alert(err.error || "Failed to undo");
    }
    await refetch();
  };

  const handleAutoPickExpired = useCallback(async () => {
    try {
      await fetch("/api/draft/auto-pick", { method: "POST" });
      await refetch();
    } catch {
      // Will be picked up by next poll
    }
  }, [refetch]);

  if (loading || settingsLoading || !state) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <span className="text-5xl animate-float inline-block">🏀</span>
          <div className="text-xl sm:text-2xl text-slate-400 animate-pulse mt-4">
            Loading draft...
          </div>
        </div>
      </div>
    );
  }

  // Lobby view
  if (state.status === "waiting") {
    return (
      <DraftLobby
        myName={myName}
        participants={participants}
        readyParticipants={state.readyParticipants || []}
        onReady={handleReady}
        onStart={handleStart}
      />
    );
  }

  const n = participants.length;
  const totalPicks = draftOrder.length;
  const currentDrafter = getCurrentDrafter(
    state.currentPickIndex,
    participants
  );
  const currentRound = getCurrentRound(state.currentPickIndex, n);
  const pickInRound = getPickInRound(state.currentPickIndex, n);
  const isMyTurn = myName === currentDrafter && state.status === "drafting";
  const rounds = n > 0 ? Math.ceil(totalPicks / n) : 0;

  const getColumnHeaders = (round: number) => {
    const names = [...participants];
    if (round % 2 === 1) names.reverse();
    return names;
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {showConfetti && <Confetti />}

      {/* Connection indicator */}
      <div className="flex items-center justify-end gap-2 text-xs">
        <span
          className={`w-2 h-2 rounded-full ${
            connected ? "bg-green-400" : "bg-yellow-400 animate-pulse"
          }`}
        />
        <span className="text-slate-500">
          {connected ? "Live" : "Polling"}
        </span>
      </div>

      {/* Current Pick Banner */}
      {state.status === "drafting" ? (
        <div
          className={`rounded-2xl p-4 sm:p-5 text-center border-2 transition-all ${
            isMyTurn
              ? "bg-gradient-to-r from-amber-500/20 to-orange-500/20 border-amber-400 your-turn-pulse"
              : "glass-card border-slate-700/50"
          }`}
        >
          {isMyTurn ? (
            <div className="animate-bounce-in">
              <p className="text-amber-400 text-2xl sm:text-3xl font-extrabold your-turn-flash">
                🏀 YOUR TURN! 🏀
              </p>
              <p className="text-slate-300 mt-1 text-sm sm:text-base">
                Round {currentRound}, Pick {pickInRound} — Select a team below
              </p>
            </div>
          ) : (
            <div>
              <p className="text-lg sm:text-xl">
                <span className="text-white font-bold">{currentDrafter}</span>
                <span className="text-slate-400"> is on the clock</span>
              </p>
              <p className="text-slate-500 text-xs sm:text-sm">
                Round {currentRound}, Pick {pickInRound} (Overall #
                {state.currentPickIndex + 1})
              </p>
              <div className="w-32 sm:w-48 mx-auto mt-3 bg-slate-700 rounded-full h-2 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-500"
                  style={{
                    width: `${(state.picks.length / totalPicks) * 100}%`,
                  }}
                />
              </div>
            </div>
          )}

          {/* Pick Timer */}
          {state.pickDeadline && state.pickTimerSeconds > 0 && (
            <div className="mt-3 max-w-xs mx-auto">
              <CountdownTimer
                deadline={state.pickDeadline}
                onExpired={handleAutoPickExpired}
              />
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-2xl p-4 sm:p-5 text-center bg-green-900/20 border-2 border-green-500/50 glass-card">
          <span className="text-3xl sm:text-4xl trophy-spin inline-block cursor-pointer">
            🏆
          </span>
          <p className="text-green-400 text-xl sm:text-2xl font-bold mt-2">
            Draft Complete!
          </p>
        </div>
      )}

      {!myName && state.status === "drafting" && (
        <div className="glass-card border border-yellow-600/50 rounded-xl p-3 text-center text-yellow-300 text-sm">
          <a href="/" className="underline font-medium">
            Go to home page
          </a>{" "}
          to select who you are before making picks.
        </div>
      )}

      {/* Undo button */}
      {state.status === "drafting" && state.picks.length > 0 && (
        <div className="flex justify-end">
          <button
            onClick={handleUndo}
            className="text-xs bg-slate-700/50 hover:bg-slate-600/50 text-slate-400 hover:text-white px-3 py-1.5 rounded-lg transition"
          >
            ↩ Undo Last Pick
          </button>
        </div>
      )}

      {/* Draft Board - mobile: card view, desktop: table */}
      <div className="glass-card rounded-2xl overflow-hidden">
        <h2 className="text-base sm:text-lg font-semibold p-3 sm:p-4 border-b border-slate-700/50 flex items-center gap-2">
          <span>📋</span> Draft Board
        </h2>

        {/* Desktop table view */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700/50">
                <th className="p-2 text-left text-slate-500 w-12">Rd</th>
                {participants.map((name) => (
                  <th
                    key={name}
                    className={`p-2 text-center min-w-[120px] ${
                      name === currentDrafter && state.status === "drafting"
                        ? "text-amber-400 font-bold"
                        : "text-slate-300"
                    }`}
                  >
                    {name}
                    {name === myName && (
                      <span className="text-[10px] text-green-400 block">
                        you
                      </span>
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
                    <td className="p-2 text-slate-500 font-mono font-bold">
                      {round + 1}
                    </td>
                    {participants.map((name) => {
                      const pickIndex =
                        round * n + headers.indexOf(name);
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
                              className={`rounded-lg px-2 py-1.5 text-xs border flex items-center gap-1.5 justify-center pick-enter ${
                                REGION_COLORS[pick.team.region]
                              }`}
                            >
                              <TeamLogo teamName={pick.team.name} size="xs" />
                              <span
                                className={`inline-block w-4 h-4 rounded-full text-[9px] font-bold leading-4 text-center shrink-0 ${seedColor(
                                  pick.team.seed
                                )}`}
                              >
                                {pick.team.seed}
                              </span>
                              <span className="font-medium truncate">
                                {pick.team.name}
                              </span>
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

        {/* Mobile card view - grouped by participant */}
        <div className="sm:hidden p-3 space-y-3">
          {participants.map((name) => {
            const myPicks = state.picks.filter(
              (p) => p.participantName === name
            );
            return (
              <div key={name} className="bg-slate-800/50 rounded-xl p-3">
                <div className="flex items-center justify-between mb-2">
                  <span
                    className={`font-bold text-sm ${
                      name === currentDrafter && state.status === "drafting"
                        ? "text-amber-400"
                        : "text-white"
                    }`}
                  >
                    {name}
                    {name === myName && (
                      <span className="text-green-400 text-[10px] ml-1">
                        (you)
                      </span>
                    )}
                  </span>
                  <span className="text-xs text-slate-500">
                    {myPicks.length} picks
                  </span>
                </div>
                {myPicks.length > 0 ? (
                  <div className="grid grid-cols-2 gap-1.5">
                    {myPicks.map((pick) => (
                      <div
                        key={pick.team.name}
                        className={`rounded-lg px-2 py-1.5 text-xs border flex items-center gap-1.5 ${
                          REGION_COLORS[pick.team.region]
                        }`}
                      >
                        <TeamLogo teamName={pick.team.name} size="xs" />
                        <span
                          className={`w-4 h-4 rounded-full text-[9px] font-bold leading-4 text-center shrink-0 ${seedColor(
                            pick.team.seed
                          )}`}
                        >
                          {pick.team.seed}
                        </span>
                        <span className="font-medium truncate">
                          {pick.team.name}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <span className="text-xs text-slate-600">No picks yet</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Team Picker */}
      {state.status === "drafting" && (
        <div className="glass-card rounded-2xl p-3 sm:p-4">
          <div className="flex items-center justify-between mb-3 sm:mb-4 flex-wrap gap-2">
            <h2 className="text-base sm:text-lg font-semibold flex items-center gap-2">
              <span>🎯</span> Available ({availableTeams.length})
            </h2>
            <div className="flex gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar">
              {["All", "East", "South", "Midwest", "West"].map((region) => (
                <button
                  key={region}
                  onClick={() => setRegionFilter(region)}
                  className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm transition font-medium whitespace-nowrap ${
                    regionFilter === region
                      ? "bg-gradient-to-r from-amber-500 to-orange-500 text-black font-bold shadow-lg shadow-amber-500/20"
                      : "bg-slate-700/50 text-slate-300"
                  }`}
                >
                  {region}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-1.5 sm:gap-2">
            {filteredTeams
              .sort(
                (a, b) =>
                  a.seed - b.seed || a.region.localeCompare(b.region)
              )
              .map((team) => (
                <button
                  key={team.name}
                  disabled={!isMyTurn || picking}
                  onClick={() => handlePick(team)}
                  className={`rounded-xl p-2 sm:p-2.5 text-left border transition-all ${
                    REGION_COLORS[team.region]
                  } ${
                    isMyTurn && !picking
                      ? "active:scale-95 cursor-pointer sm:hover:ring-2 sm:hover:ring-amber-400 sm:hover:scale-105"
                      : "opacity-50 cursor-not-allowed"
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <TeamLogo teamName={team.name} size="sm" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1">
                        <span
                          className={`inline-block w-4 h-4 rounded-full text-[9px] font-bold leading-4 text-center shrink-0 ${seedColor(
                            team.seed
                          )}`}
                        >
                          {team.seed}
                        </span>
                        <span className="text-xs font-medium truncate">
                          {team.name}
                        </span>
                      </div>
                      <span
                        className={`text-[10px] ${REGION_TEXT[team.region]}`}
                      >
                        {team.region}
                      </span>
                    </div>
                  </div>
                </button>
              ))}
          </div>

          {isMyTurn && (
            <p className="text-center text-amber-400/60 text-xs sm:text-sm mt-3 sm:mt-4 animate-pulse">
              Tap a team to draft them!
            </p>
          )}
        </div>
      )}
    </div>
  );
}
