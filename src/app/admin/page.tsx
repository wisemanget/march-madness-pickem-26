"use client";

import { useState, useEffect } from "react";
import { useDraftState } from "@/hooks/useDraftState";
import { TEAMS } from "@/lib/teams";
import { TournamentResults } from "@/lib/types";

export default function AdminPage() {
  const { state, refetch } = useDraftState();
  const [results, setResults] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const fetchResults = async () => {
      const res = await fetch("/api/results");
      const data: TournamentResults = await res.json();
      if (data.wins && Object.keys(data.wins).length > 0) {
        setResults(data.wins);
      }
    };
    fetchResults();
  }, []);

  const handleReset = async () => {
    if (!confirm("Are you sure you want to reset the entire draft? This cannot be undone!")) {
      return;
    }
    setResetting(true);
    await fetch("/api/draft", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reset" }),
    });
    await refetch();
    setResetting(false);
    setMessage("Draft has been reset!");
  };

  const handleWinChange = (teamName: string, wins: number) => {
    setResults((prev) => ({
      ...prev,
      [teamName]: Math.max(0, Math.min(6, wins)),
    }));
  };

  const handleSaveResults = async () => {
    setSaving(true);
    await fetch("/api/results", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ wins: results }),
    });
    setSaving(false);
    setMessage("Results saved!");
    setTimeout(() => setMessage(""), 3000);
  };

  const draftedTeams =
    state?.picks.map((p) => p.team.name) || [];

  const regions = ["East", "South", "Midwest", "West"] as const;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-amber-400">Admin</h1>

      {message && (
        <div className="bg-green-900/30 border border-green-500 rounded-lg p-3 text-green-300">
          {message}
        </div>
      )}

      {/* Reset Draft */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
        <h2 className="font-semibold mb-2">Draft Controls</h2>
        <p className="text-sm text-slate-400 mb-3">
          Current status: <span className="text-white font-bold">{state?.status}</span>
          {" | "}
          Picks made: <span className="text-white font-bold">{state?.picks.length || 0}</span> / 64
        </p>
        <button
          onClick={handleReset}
          disabled={resetting}
          className="bg-red-600 hover:bg-red-500 disabled:bg-red-800 text-white px-4 py-2 rounded-lg transition"
        >
          {resetting ? "Resetting..." : "Reset Draft"}
        </button>
      </div>

      {/* Tournament Results */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">Tournament Results</h2>
          <button
            onClick={handleSaveResults}
            disabled={saving}
            className="bg-amber-500 hover:bg-amber-400 disabled:bg-amber-700 text-black font-bold px-4 py-2 rounded-lg transition"
          >
            {saving ? "Saving..." : "Save Results"}
          </button>
        </div>
        <p className="text-xs text-slate-500 mb-4">
          Enter the number of wins (0-6) for each team. Only drafted teams are shown.
        </p>

        {regions.map((region) => {
          const regionTeams = TEAMS.filter(
            (t) => t.region === region && draftedTeams.includes(t.name)
          ).sort((a, b) => a.seed - b.seed);

          if (regionTeams.length === 0) return null;

          return (
            <div key={region} className="mb-4">
              <h3 className="text-sm font-semibold text-slate-400 mb-2 uppercase">
                {region} Region
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {regionTeams.map((team) => (
                  <div
                    key={team.name}
                    className="flex items-center justify-between bg-slate-700/50 rounded px-3 py-2"
                  >
                    <span className="text-sm">
                      <span className="text-amber-400 font-mono mr-1">
                        ({team.seed})
                      </span>
                      {team.name}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() =>
                          handleWinChange(team.name, (results[team.name] || 0) - 1)
                        }
                        className="w-7 h-7 rounded bg-slate-600 hover:bg-slate-500 text-white text-sm"
                      >
                        -
                      </button>
                      <span className="w-6 text-center font-mono font-bold">
                        {results[team.name] || 0}
                      </span>
                      <button
                        onClick={() =>
                          handleWinChange(team.name, (results[team.name] || 0) + 1)
                        }
                        className="w-7 h-7 rounded bg-slate-600 hover:bg-slate-500 text-white text-sm"
                      >
                        +
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
