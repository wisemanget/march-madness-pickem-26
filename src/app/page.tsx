"use client";

import { useState, useEffect } from "react";
import { PARTICIPANTS } from "@/lib/types";
import { useDraftState } from "@/hooks/useDraftState";
import { getCurrentDrafter } from "@/lib/draft-order";

export default function Home() {
  const { state, loading } = useDraftState();
  const [selectedName, setSelectedName] = useState<string>("");

  useEffect(() => {
    const saved = localStorage.getItem("mm-participant");
    if (saved) setSelectedName(saved);
  }, []);

  const handleSelect = (name: string) => {
    setSelectedName(name);
    localStorage.setItem("mm-participant", name);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-2xl text-slate-400 animate-pulse">Loading...</div>
      </div>
    );
  }

  const currentDrafter = state ? getCurrentDrafter(state.currentPickIndex) : "";
  const picksMade = state?.picks.length ?? 0;

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold text-amber-400">
          March Madness Pick&apos;em
        </h1>
        <p className="text-slate-400 text-lg">2026 NCAA Tournament Draft</p>
      </div>

      {/* Status */}
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
        <h2 className="text-lg font-semibold mb-3">Draft Status</h2>
        {state?.status === "complete" ? (
          <div className="text-green-400 text-xl font-bold">
            Draft Complete! All 64 teams have been picked.
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-slate-300">
              <span className="text-amber-400 font-bold">{picksMade}</span> / 64
              picks made
            </p>
            <p className="text-slate-300">
              Current pick:{" "}
              <span className="text-white font-bold">{currentDrafter}</span>
            </p>
          </div>
        )}
      </div>

      {/* Select who you are */}
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
        <h2 className="text-lg font-semibold mb-4">Who are you?</h2>
        <p className="text-sm text-slate-400 mb-4">
          Select your name to make picks when it&apos;s your turn.
        </p>
        <div className="grid grid-cols-2 gap-3">
          {PARTICIPANTS.map((name) => (
            <button
              key={name}
              onClick={() => handleSelect(name)}
              className={`px-4 py-3 rounded-lg font-medium transition-all ${
                selectedName === name
                  ? "bg-amber-500 text-slate-900 ring-2 ring-amber-300"
                  : "bg-slate-700 text-slate-300 hover:bg-slate-600"
              }`}
            >
              {name}
            </button>
          ))}
        </div>
        {selectedName && (
          <p className="mt-4 text-sm text-green-400">
            You are logged in as <span className="font-bold">{selectedName}</span>
          </p>
        )}
      </div>

      {/* Go to draft */}
      <div className="flex gap-4">
        <a
          href="/draft"
          className="flex-1 text-center bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold py-4 rounded-xl text-lg transition"
        >
          Go to Draft Board
        </a>
        <a
          href="/scores"
          className="flex-1 text-center bg-slate-700 hover:bg-slate-600 text-white font-bold py-4 rounded-xl text-lg transition"
        >
          View Scores
        </a>
      </div>

      {/* Draft Order */}
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
        <h2 className="text-lg font-semibold mb-3">Draft Order (Snake)</h2>
        <div className="space-y-1">
          {PARTICIPANTS.map((name, i) => (
            <div key={name} className="flex items-center gap-3 text-slate-300">
              <span className="text-amber-400 font-mono w-6">{i + 1}.</span>
              <span>{name}</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-slate-500 mt-3">
          Snake draft: order reverses each round (1-8, 8-1, 1-8, ...)
        </p>
      </div>
    </div>
  );
}
