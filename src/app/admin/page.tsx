"use client";

import { useState, useEffect } from "react";
import { useDraftState } from "@/hooks/useDraftState";
import { useSettings } from "@/hooks/useSettings";
import { TEAMS } from "@/lib/teams";
import { TournamentResults } from "@/lib/types";

export default function AdminPage() {
  const { state, refetch } = useDraftState();
  const { settings, refetch: refetchSettings } = useSettings();
  const [results, setResults] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">("success");

  // Participant management
  const [editParticipants, setEditParticipants] = useState<string[]>([]);
  const [newName, setNewName] = useState("");
  const [savingSettings, setSavingSettings] = useState(false);

  // Team reassignment
  const [reassignTeam, setReassignTeam] = useState("");
  const [reassignTo, setReassignTo] = useState("");

  // History
  const [histYear, setHistYear] = useState(2025);
  const [histChampion, setHistChampion] = useState("");
  const [savingHistory, setSavingHistory] = useState(false);

  // Active tab
  const [tab, setTab] = useState<"draft" | "participants" | "results" | "reassign" | "history">("draft");

  const participants = settings?.participants || [];

  useEffect(() => {
    if (settings) {
      setEditParticipants([...settings.participants]);
    }
  }, [settings]);

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

  const showMsg = (text: string, type: "success" | "error" = "success") => {
    setMessage(text);
    setMessageType(type);
    setTimeout(() => setMessage(""), 4000);
  };

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
    showMsg("Draft has been reset!");
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
    showMsg("Results saved!");
  };

  // Participant management
  const addParticipant = () => {
    const name = newName.trim();
    if (!name) return;
    if (editParticipants.includes(name)) {
      showMsg("Name already exists!", "error");
      return;
    }
    setEditParticipants([...editParticipants, name]);
    setNewName("");
  };

  const removeParticipant = (index: number) => {
    setEditParticipants(editParticipants.filter((_, i) => i !== index));
  };

  const moveParticipant = (index: number, direction: "up" | "down") => {
    const newList = [...editParticipants];
    const target = direction === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= newList.length) return;
    [newList[index], newList[target]] = [newList[target], newList[index]];
    setEditParticipants(newList);
  };

  const saveParticipants = async () => {
    if (editParticipants.length < 2) {
      showMsg("Need at least 2 participants!", "error");
      return;
    }
    setSavingSettings(true);
    await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        participants: editParticipants,
        year: settings?.year || new Date().getFullYear(),
      }),
    });
    await refetchSettings();
    setSavingSettings(false);
    showMsg("Participants saved!");
  };

  // Team reassignment
  const handleReassign = async () => {
    if (!reassignTeam || !reassignTo) {
      showMsg("Select both a team and a new owner!", "error");
      return;
    }
    const res = await fetch("/api/draft/reassign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teamName: reassignTeam, newOwner: reassignTo }),
    });
    if (res.ok) {
      await refetch();
      showMsg(`${reassignTeam} reassigned to ${reassignTo}`);
      setReassignTeam("");
      setReassignTo("");
    } else {
      const err = await res.json();
      showMsg(err.error || "Failed to reassign", "error");
    }
  };

  // Save current year to history
  const handleSaveToHistory = async () => {
    if (!state || state.picks.length === 0) {
      showMsg("No draft data to save!", "error");
      return;
    }
    setSavingHistory(true);
    const res = await fetch("/api/history", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        year: histYear,
        participants,
        picks: state.picks,
        results: { wins: results, updatedAt: new Date().toISOString() },
        teams: TEAMS,
        champion: histChampion || undefined,
      }),
    });
    setSavingHistory(false);
    if (res.ok) {
      showMsg(`${histYear} data saved to history!`);
    } else {
      showMsg("Failed to save history", "error");
    }
  };

  const draftedTeams = state?.picks.map((p) => p.team.name) || [];
  const regions = ["East", "South", "Midwest", "West"] as const;

  const tabs = [
    { id: "draft" as const, label: "Draft Controls", icon: "🎮" },
    { id: "participants" as const, label: "Participants", icon: "👥" },
    { id: "results" as const, label: "Results", icon: "📊" },
    { id: "reassign" as const, label: "Reassign Teams", icon: "🔄" },
    { id: "history" as const, label: "Save History", icon: "📚" },
  ];

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 animate-slide-up">
        <span className="text-3xl">⚙️</span>
        <h1 className="text-3xl font-extrabold text-gradient">Admin Panel</h1>
      </div>

      {message && (
        <div
          className={`rounded-xl p-3 text-center font-medium animate-bounce-in ${
            messageType === "success"
              ? "bg-green-900/30 border border-green-500/50 text-green-300"
              : "bg-red-900/30 border border-red-500/50 text-red-300"
          }`}
        >
          {message}
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex gap-2 flex-wrap">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              tab === t.id
                ? "bg-gradient-to-r from-amber-500 to-orange-500 text-black shadow-lg shadow-amber-500/20"
                : "glass-card text-slate-300 hover:text-white"
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Draft Controls */}
      {tab === "draft" && (
        <div className="glass-card rounded-2xl p-5 animate-slide-up">
          <h2 className="font-semibold mb-3 text-lg flex items-center gap-2">
            <span>🎮</span> Draft Controls
          </h2>
          <div className="flex items-center gap-4 mb-4 text-sm">
            <span className="text-slate-400">
              Status:{" "}
              <span className={`font-bold ${state?.status === "complete" ? "text-green-400" : "text-amber-400"}`}>
                {state?.status}
              </span>
            </span>
            <span className="text-slate-400">
              Picks:{" "}
              <span className="text-white font-bold">{state?.picks.length || 0}</span> / 64
            </span>
          </div>
          <button
            onClick={handleReset}
            disabled={resetting}
            className="bg-red-600 hover:bg-red-500 disabled:bg-red-800 text-white px-6 py-3 rounded-xl transition font-bold hover-lift"
          >
            {resetting ? "Resetting..." : "🗑️ Reset Draft"}
          </button>
          <p className="text-xs text-slate-500 mt-2">
            This clears all picks and starts a fresh draft.
          </p>
        </div>
      )}

      {/* Participant Management */}
      {tab === "participants" && (
        <div className="glass-card rounded-2xl p-5 animate-slide-up">
          <h2 className="font-semibold mb-3 text-lg flex items-center gap-2">
            <span>👥</span> Manage Participants
          </h2>
          <p className="text-sm text-slate-400 mb-4">
            Add, remove, or reorder participants. The draft order follows this list (snake format).
          </p>

          <div className="space-y-2 mb-4">
            {editParticipants.map((name, i) => (
              <div
                key={`${name}-${i}`}
                className="flex items-center gap-2 bg-slate-700/30 rounded-xl px-4 py-2.5 group"
              >
                <span className="text-amber-400 font-mono w-8 font-bold">{i + 1}.</span>
                <span className="flex-1 font-medium">{name}</span>
                <button
                  onClick={() => moveParticipant(i, "up")}
                  disabled={i === 0}
                  className="w-8 h-8 rounded-lg bg-slate-600/50 hover:bg-slate-500/50 disabled:opacity-20 text-sm transition"
                >
                  ↑
                </button>
                <button
                  onClick={() => moveParticipant(i, "down")}
                  disabled={i === editParticipants.length - 1}
                  className="w-8 h-8 rounded-lg bg-slate-600/50 hover:bg-slate-500/50 disabled:opacity-20 text-sm transition"
                >
                  ↓
                </button>
                <button
                  onClick={() => removeParticipant(i)}
                  className="w-8 h-8 rounded-lg bg-red-600/30 hover:bg-red-500/50 text-red-400 text-sm transition opacity-0 group-hover:opacity-100"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addParticipant()}
              placeholder="Add new participant..."
              className="flex-1 bg-slate-700/50 border border-slate-600/50 rounded-xl px-4 py-2.5 text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500/50"
            />
            <button
              onClick={addParticipant}
              className="bg-green-600 hover:bg-green-500 text-white px-4 py-2.5 rounded-xl font-medium transition"
            >
              + Add
            </button>
          </div>

          <button
            onClick={saveParticipants}
            disabled={savingSettings}
            className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 disabled:opacity-50 text-black font-bold px-6 py-3 rounded-xl transition hover-lift shadow-lg shadow-amber-500/20"
          >
            {savingSettings ? "Saving..." : "💾 Save Participants"}
          </button>
        </div>
      )}

      {/* Tournament Results */}
      {tab === "results" && (
        <div className="glass-card rounded-2xl p-5 animate-slide-up">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-lg flex items-center gap-2">
              <span>📊</span> Tournament Results
            </h2>
            <button
              onClick={handleSaveResults}
              disabled={saving}
              className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 disabled:opacity-50 text-black font-bold px-5 py-2.5 rounded-xl transition hover-lift shadow-lg shadow-amber-500/20"
            >
              {saving ? "Saving..." : "💾 Save Results"}
            </button>
          </div>
          <p className="text-xs text-slate-500 mb-4">
            Enter wins (0-6) for each drafted team. Only drafted teams shown.
          </p>

          {regions.map((region) => {
            const regionTeams = TEAMS.filter(
              (t) => t.region === region && draftedTeams.includes(t.name)
            ).sort((a, b) => a.seed - b.seed);

            if (regionTeams.length === 0) return null;

            return (
              <div key={region} className="mb-5">
                <h3 className="text-sm font-bold text-slate-400 mb-2 uppercase tracking-wider">
                  {region} Region
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {regionTeams.map((team) => {
                    const wins = results[team.name] || 0;
                    return (
                      <div
                        key={team.name}
                        className={`flex items-center justify-between bg-slate-700/30 rounded-xl px-4 py-2.5 ${
                          wins > 0 ? "border-l-4 border-amber-500/50" : ""
                        }`}
                      >
                        <span className="text-sm">
                          <span className="text-amber-400 font-mono mr-1">
                            ({team.seed})
                          </span>
                          <span className="font-medium">{team.name}</span>
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleWinChange(team.name, wins - 1)}
                            className="w-8 h-8 rounded-lg bg-slate-600/50 hover:bg-slate-500 text-white text-sm transition"
                          >
                            −
                          </button>
                          <span className="w-8 text-center font-mono font-bold text-lg">
                            {wins}
                          </span>
                          <button
                            onClick={() => handleWinChange(team.name, wins + 1)}
                            className="w-8 h-8 rounded-lg bg-slate-600/50 hover:bg-slate-500 text-white text-sm transition"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {draftedTeams.length === 0 && (
            <p className="text-slate-500 text-center py-8">
              No teams drafted yet. Start the draft first!
            </p>
          )}
        </div>
      )}

      {/* Team Reassignment */}
      {tab === "reassign" && (
        <div className="glass-card rounded-2xl p-5 animate-slide-up">
          <h2 className="font-semibold mb-3 text-lg flex items-center gap-2">
            <span>🔄</span> Reassign Teams
          </h2>
          <p className="text-sm text-slate-400 mb-4">
            Move a drafted team from one person to another.
          </p>

          {state && state.picks.length > 0 ? (
            <div className="space-y-4">
              <div>
                <label className="text-sm text-slate-400 mb-1 block">Select Team</label>
                <select
                  value={reassignTeam}
                  onChange={(e) => setReassignTeam(e.target.value)}
                  className="w-full bg-slate-700/50 border border-slate-600/50 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-amber-500/50"
                >
                  <option value="">Choose a team...</option>
                  {state.picks
                    .sort((a, b) => a.team.name.localeCompare(b.team.name))
                    .map((pick) => (
                      <option key={pick.team.name} value={pick.team.name}>
                        ({pick.team.seed}) {pick.team.name} — currently: {pick.participantName}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="text-sm text-slate-400 mb-1 block">Assign To</label>
                <select
                  value={reassignTo}
                  onChange={(e) => setReassignTo(e.target.value)}
                  className="w-full bg-slate-700/50 border border-slate-600/50 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-amber-500/50"
                >
                  <option value="">Choose a participant...</option>
                  {participants.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={handleReassign}
                disabled={!reassignTeam || !reassignTo}
                className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 disabled:opacity-50 text-black font-bold px-6 py-3 rounded-xl transition hover-lift shadow-lg shadow-amber-500/20"
              >
                🔄 Reassign Team
              </button>
            </div>
          ) : (
            <p className="text-slate-500 text-center py-8">
              No teams have been drafted yet.
            </p>
          )}
        </div>
      )}

      {/* Save to History */}
      {tab === "history" && (
        <div className="glass-card rounded-2xl p-5 animate-slide-up">
          <h2 className="font-semibold mb-3 text-lg flex items-center gap-2">
            <span>📚</span> Save to History
          </h2>
          <p className="text-sm text-slate-400 mb-4">
            Archive the current draft and results as a historical year, or save data from a previous year.
          </p>

          <div className="space-y-4">
            <div>
              <label className="text-sm text-slate-400 mb-1 block">Year</label>
              <input
                type="number"
                value={histYear}
                onChange={(e) => setHistYear(parseInt(e.target.value) || 2025)}
                className="w-full bg-slate-700/50 border border-slate-600/50 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-amber-500/50"
              />
            </div>

            <div>
              <label className="text-sm text-slate-400 mb-1 block">Tournament Champion (optional)</label>
              <input
                type="text"
                value={histChampion}
                onChange={(e) => setHistChampion(e.target.value)}
                placeholder="e.g. Duke"
                className="w-full bg-slate-700/50 border border-slate-600/50 rounded-xl px-4 py-2.5 text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500/50"
              />
            </div>

            <button
              onClick={handleSaveToHistory}
              disabled={savingHistory || !state || state.picks.length === 0}
              className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 disabled:opacity-50 text-black font-bold px-6 py-3 rounded-xl transition hover-lift shadow-lg shadow-amber-500/20"
            >
              {savingHistory ? "Saving..." : "📚 Save Current Data to History"}
            </button>

            <p className="text-xs text-slate-500">
              This saves the current participants, picks, and results under the specified year.
              You can view historical data on the History page.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
