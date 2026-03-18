"use client";

import { useState, useEffect } from "react";
import { useSettings } from "@/hooks/useSettings";
import { useDraftState } from "@/hooks/useDraftState";
import { getCurrentDrafter } from "@/lib/draft-order";

export default function Home() {
  const { state, loading: draftLoading } = useDraftState();
  const { settings, loading: settingsLoading } = useSettings();
  const [selectedName, setSelectedName] = useState<string>("");
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState("");
  const [showPinPrompt, setShowPinPrompt] = useState<string | null>(null);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("mm-participant");
    const token = localStorage.getItem("mm-auth-token");
    if (saved) {
      setSelectedName(saved);
      if (token) setAuthenticated(true);
    }
  }, []);

  const hasPins =
    settings?.participantPins &&
    Object.keys(settings.participantPins).length > 0;

  const handleSelect = async (name: string) => {
    if (hasPins && settings?.participantPins?.[name]) {
      // Need PIN verification
      setShowPinPrompt(name);
      setPinInput("");
      setPinError("");
      return;
    }
    // No PIN required
    setSelectedName(name);
    setAuthenticated(true);
    localStorage.setItem("mm-participant", name);
    localStorage.setItem("mm-auth-token", name + ":nopin");
  };

  const handlePinSubmit = async () => {
    if (!showPinPrompt) return;
    setPinError("");
    try {
      const res = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          participantName: showPinPrompt,
          pin: pinInput,
        }),
      });
      const data = await res.json();
      if (data.valid) {
        setSelectedName(showPinPrompt);
        setAuthenticated(true);
        localStorage.setItem("mm-participant", showPinPrompt);
        localStorage.setItem("mm-auth-token", showPinPrompt + ":" + pinInput);
        setShowPinPrompt(null);
        setPinInput("");
      } else {
        setPinError("Incorrect PIN");
      }
    } catch {
      setPinError("Verification failed");
    }
  };

  const loading = draftLoading || settingsLoading;
  const participants = settings?.participants || [];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <span className="text-5xl sm:text-6xl animate-float inline-block">🏀</span>
          <div className="text-xl sm:text-2xl text-slate-400 animate-pulse mt-4">Loading...</div>
        </div>
      </div>
    );
  }

  const currentDrafter = state
    ? getCurrentDrafter(state.currentPickIndex, participants)
    : "";
  const picksMade = state?.picks.length ?? 0;
  const totalPicks = Math.min(
    64,
    participants.length > 0
      ? Math.ceil(64 / participants.length) * participants.length
      : 64
  );
  const progress = totalPicks > 0 ? (picksMade / totalPicks) * 100 : 0;

  const statusLabel =
    state?.status === "complete"
      ? "Complete"
      : state?.status === "waiting"
      ? "Waiting for Players"
      : "Drafting";

  return (
    <div className="max-w-2xl mx-auto space-y-5 sm:space-y-8">
      {/* Hero */}
      <div className="text-center space-y-2 sm:space-y-3 animate-slide-up">
        <div className="text-5xl sm:text-6xl mb-2 animate-float inline-block">🏀</div>
        <h1 className="text-3xl sm:text-5xl font-extrabold text-gradient">
          March Madness Pick&apos;em
        </h1>
        <p className="text-slate-400 text-base sm:text-lg">
          {settings?.year || new Date().getFullYear()} NCAA Tournament Draft
        </p>
      </div>

      {/* Status Card */}
      <div
        className="glass-card rounded-2xl p-4 sm:p-6 animate-slide-up"
        style={{ animationDelay: "100ms" }}
      >
        <h2 className="text-base sm:text-lg font-semibold mb-3 flex items-center gap-2">
          <span>📊</span> Draft Status
        </h2>
        {state?.status === "complete" ? (
          <div className="text-center py-3 sm:py-4">
            <span className="text-3xl sm:text-4xl trophy-spin inline-block cursor-pointer">
              🏆
            </span>
            <div className="text-green-400 text-lg sm:text-xl font-bold mt-2">
              Draft Complete!
            </div>
            <p className="text-slate-400 text-sm">
              All {picksMade} teams have been picked.
            </p>
          </div>
        ) : state?.status === "waiting" ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-yellow-400 animate-pulse" />
              <span className="text-yellow-400 font-bold">{statusLabel}</span>
            </div>
            <p className="text-slate-400 text-sm">
              {state.readyParticipants.length} / {participants.length} ready
            </p>
            <div className="flex flex-wrap gap-2">
              {participants.map((name) => (
                <span
                  key={name}
                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                    state.readyParticipants.includes(name)
                      ? "bg-green-900/40 text-green-400 border border-green-500/50"
                      : "bg-slate-700/50 text-slate-500 border border-slate-600/50"
                  }`}
                >
                  {name} {state.readyParticipants.includes(name) ? "✓" : "..."}
                </span>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-3 sm:space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-slate-400">Progress</span>
                <span className="text-amber-400 font-bold">
                  {picksMade} / {totalPicks}
                </span>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-3 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-500 animate-fill"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
            <p className="text-slate-300">
              On the clock:{" "}
              <span className="text-white font-bold text-lg">
                {currentDrafter}
              </span>
            </p>
          </div>
        )}
      </div>

      {/* Select who you are */}
      <div
        className="glass-card rounded-2xl p-4 sm:p-6 animate-slide-up"
        style={{ animationDelay: "200ms" }}
      >
        <h2 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 flex items-center gap-2">
          <span>👤</span> Who are you?
        </h2>
        <p className="text-sm text-slate-400 mb-3 sm:mb-4">
          Select your name to make picks when it&apos;s your turn.
          {hasPins && " You'll need your PIN to log in."}
        </p>

        {/* PIN prompt modal */}
        {showPinPrompt && (
          <div className="mb-4 p-4 rounded-xl bg-slate-800/80 border border-amber-500/30">
            <p className="text-sm text-slate-300 mb-2">
              Enter PIN for <span className="font-bold text-white">{showPinPrompt}</span>
            </p>
            <div className="flex gap-2">
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ""))}
                onKeyDown={(e) => e.key === "Enter" && handlePinSubmit()}
                placeholder="4-digit PIN"
                className="flex-1 bg-slate-700/50 border border-slate-600/50 rounded-lg px-3 py-2 text-white text-center tracking-widest focus:outline-none focus:border-amber-500/50"
                autoFocus
              />
              <button
                onClick={handlePinSubmit}
                className="bg-amber-500 hover:bg-amber-400 text-black font-bold px-4 py-2 rounded-lg transition"
              >
                OK
              </button>
              <button
                onClick={() => setShowPinPrompt(null)}
                className="bg-slate-600 hover:bg-slate-500 text-white px-3 py-2 rounded-lg transition"
              >
                Cancel
              </button>
            </div>
            {pinError && (
              <p className="text-red-400 text-xs mt-2">{pinError}</p>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 sm:gap-3">
          {participants.map((name) => (
            <button
              key={name}
              onClick={() => handleSelect(name)}
              className={`px-3 sm:px-4 py-3 rounded-xl font-medium transition-all ${
                selectedName === name && authenticated
                  ? "bg-gradient-to-r from-amber-500 to-orange-500 text-slate-900 ring-2 ring-amber-300 shadow-lg shadow-amber-500/20"
                  : "bg-slate-700/50 text-slate-300 active:bg-slate-600/50"
              }`}
            >
              {name}
              {selectedName === name && authenticated && " ✓"}
            </button>
          ))}
        </div>
        {selectedName && authenticated && (
          <p className="mt-3 sm:mt-4 text-sm text-green-400 animate-bounce-in">
            Logged in as <span className="font-bold">{selectedName}</span>
          </p>
        )}
      </div>

      {/* Action Buttons */}
      <div
        className="flex flex-col sm:flex-row gap-3 sm:gap-4 animate-slide-up"
        style={{ animationDelay: "300ms" }}
      >
        <a
          href="/draft"
          className="flex-1 text-center bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-900 font-bold py-4 rounded-xl text-lg transition shadow-lg shadow-amber-500/20 active:scale-[0.98]"
        >
          🏀 Go to Draft Board
        </a>
        <a
          href="/scores"
          className="flex-1 text-center glass-card text-white font-bold py-4 rounded-xl text-lg transition active:scale-[0.98]"
        >
          🏆 View Scores
        </a>
      </div>

      {/* Draft Order */}
      <div
        className="glass-card rounded-2xl p-4 sm:p-6 animate-slide-up"
        style={{ animationDelay: "400ms" }}
      >
        <h2 className="text-base sm:text-lg font-semibold mb-3 flex items-center gap-2">
          <span>📋</span> Draft Order (Snake)
        </h2>
        <div className="space-y-1">
          {participants.map((name, i) => (
            <div
              key={name}
              className={`flex items-center gap-3 p-2 rounded-lg transition ${
                currentDrafter === name && state?.status === "drafting"
                  ? "bg-amber-500/10 border border-amber-500/30"
                  : ""
              }`}
            >
              <span className="text-amber-400 font-mono w-8 text-right font-bold">
                {i + 1}.
              </span>
              <span
                className={
                  currentDrafter === name && state?.status === "drafting"
                    ? "text-amber-400 font-bold"
                    : "text-slate-300"
                }
              >
                {name}
              </span>
              {currentDrafter === name && state?.status === "drafting" && (
                <span className="text-[10px] sm:text-xs bg-amber-500 text-black px-2 py-0.5 rounded-full font-bold animate-pulse ml-auto">
                  ON THE CLOCK
                </span>
              )}
            </div>
          ))}
        </div>
        <p className="text-xs text-slate-500 mt-3">
          Snake draft: order reverses each round (1→{participants.length},{" "}
          {participants.length}→1, ...)
        </p>
      </div>
    </div>
  );
}
