"use client";

import { useState } from "react";
import { Pick, Team } from "@/lib/types";

interface ParticipantEntry {
  name: string;
  teamsText: string; // comma-separated team names
  wins: Record<string, number>; // team name -> wins
}

const EMPTY_ENTRY = (): ParticipantEntry => ({
  name: "",
  teamsText: "",
  wins: {},
});

export default function ImportPage() {
  const [year, setYear] = useState(2025);
  const [champion, setChampion] = useState("");
  const [entries, setEntries] = useState<ParticipantEntry[]>([
    EMPTY_ENTRY(),
    EMPTY_ENTRY(),
    EMPTY_ENTRY(),
    EMPTY_ENTRY(),
    EMPTY_ENTRY(),
    EMPTY_ENTRY(),
    EMPTY_ENTRY(),
    EMPTY_ENTRY(),
  ]);
  const [step, setStep] = useState<"teams" | "wins" | "review">("teams");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">("success");

  // Parsed teams from text
  const parseTeams = (text: string): string[] =>
    text
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

  const updateEntry = (index: number, field: Partial<ParticipantEntry>) => {
    setEntries((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...field };
      return next;
    });
  };

  const updateWin = (entryIndex: number, teamName: string, wins: number) => {
    setEntries((prev) => {
      const next = [...prev];
      next[entryIndex] = {
        ...next[entryIndex],
        wins: {
          ...next[entryIndex].wins,
          [teamName]: Math.max(0, Math.min(6, wins)),
        },
      };
      return next;
    });
  };

  const addEntry = () => setEntries([...entries, EMPTY_ENTRY()]);
  const removeEntry = (i: number) => setEntries(entries.filter((_, idx) => idx !== i));

  const validEntries = entries.filter((e) => e.name.trim() && e.teamsText.trim());
  const allTeams = validEntries.flatMap((e) =>
    parseTeams(e.teamsText).map((team) => ({
      team,
      owner: e.name,
      wins: e.wins[team] || 0,
    }))
  );

  const showMsg = (text: string, type: "success" | "error" = "success") => {
    setMessage(text);
    setMessageType(type);
    setTimeout(() => setMessage(""), 5000);
  };

  const handleSave = async () => {
    if (validEntries.length < 2) {
      showMsg("Need at least 2 participants with teams!", "error");
      return;
    }

    setSaving(true);

    // Build picks and results
    const participants = validEntries.map((e) => e.name.trim());
    const picks: Pick[] = [];
    const wins: Record<string, number> = {};
    const teams: Team[] = [];
    let pickNumber = 1;

    for (const entry of validEntries) {
      const teamNames = parseTeams(entry.teamsText);
      for (const teamName of teamNames) {
        const team: Team = {
          name: teamName,
          seed: 0, // seed unknown from sheet
          region: "East" as const, // region unknown from sheet
        };
        teams.push(team);

        picks.push({
          pickNumber: pickNumber++,
          participantName: entry.name.trim(),
          team,
          timestamp: new Date().toISOString(),
        });

        const teamWins = entry.wins[teamName] || 0;
        if (teamWins > 0) {
          wins[teamName] = teamWins;
        }
      }
    }

    try {
      const res = await fetch("/api/history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          year,
          participants,
          picks,
          results: { wins, updatedAt: new Date().toISOString() },
          teams,
          champion: champion || undefined,
        }),
      });

      if (res.ok) {
        showMsg(`${year} data imported successfully! View it on the History page.`);
      } else {
        showMsg("Failed to save. Please try again.", "error");
      }
    } catch {
      showMsg("Network error. Please try again.", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3 animate-slide-up">
        <span className="text-4xl">📋</span>
        <div>
          <h1 className="text-3xl font-extrabold text-gradient">Import Historical Data</h1>
          <p className="text-slate-400 text-sm">Bring in your Google Sheet data year by year</p>
        </div>
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

      {/* How-to */}
      <div className="glass-card rounded-2xl p-5 animate-slide-up" style={{ animationDelay: "50ms" }}>
        <h2 className="font-semibold mb-2 flex items-center gap-2">
          <span>💡</span> How to import from your Google Sheet
        </h2>
        <ol className="text-sm text-slate-400 space-y-1 list-decimal list-inside">
          <li>Pick a year tab from your sheet (2022, 2023, 2024, or 2025)</li>
          <li>For each person, type their name and paste their team list (comma-separated)</li>
          <li>Click &quot;Next: Enter Wins&quot; to set how many wins each team got</li>
          <li>Review and save — it shows up on the History page</li>
        </ol>
      </div>

      {/* Year & Champion */}
      <div className="glass-card rounded-2xl p-5 animate-slide-up" style={{ animationDelay: "100ms" }}>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-slate-400 mb-1 block font-medium">Year</label>
            <input
              type="number"
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value) || 2025)}
              className="w-full bg-slate-700/50 border border-slate-600/50 rounded-xl px-4 py-3 text-white text-xl font-bold focus:outline-none focus:border-amber-500/50"
            />
          </div>
          <div>
            <label className="text-sm text-slate-400 mb-1 block font-medium">
              Tournament Champion (optional)
            </label>
            <input
              type="text"
              value={champion}
              onChange={(e) => setChampion(e.target.value)}
              placeholder="e.g. UConn"
              className="w-full bg-slate-700/50 border border-slate-600/50 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500/50"
            />
          </div>
        </div>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 justify-center">
        {[
          { id: "teams" as const, label: "1. Teams", icon: "🏀" },
          { id: "wins" as const, label: "2. Wins", icon: "🏆" },
          { id: "review" as const, label: "3. Review", icon: "✅" },
        ].map((s, i) => (
          <div key={s.id} className="flex items-center gap-2">
            <button
              onClick={() => setStep(s.id)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                step === s.id
                  ? "bg-gradient-to-r from-amber-500 to-orange-500 text-black shadow-lg"
                  : "glass-card text-slate-400"
              }`}
            >
              {s.icon} {s.label}
            </button>
            {i < 2 && <span className="text-slate-600">→</span>}
          </div>
        ))}
      </div>

      {/* Step 1: Enter teams per participant */}
      {step === "teams" && (
        <div className="space-y-3 animate-slide-up">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <span>🏀</span> Enter each participant&apos;s teams
          </h2>
          <p className="text-sm text-slate-400">
            Type the participant name, then paste their teams separated by commas.
            Copy team names straight from your sheet.
          </p>

          {entries.map((entry, i) => (
            <div key={i} className="glass-card rounded-2xl p-4 group">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-amber-400 font-mono font-bold w-8">{i + 1}.</span>
                <input
                  type="text"
                  value={entry.name}
                  onChange={(e) => updateEntry(i, { name: e.target.value })}
                  placeholder="Participant name (e.g. Chris K.)"
                  className="flex-1 bg-slate-700/50 border border-slate-600/50 rounded-lg px-3 py-2 text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500/50 font-medium"
                />
                {entries.length > 2 && (
                  <button
                    onClick={() => removeEntry(i)}
                    className="w-8 h-8 rounded-lg bg-red-600/30 hover:bg-red-500/50 text-red-400 text-sm transition opacity-0 group-hover:opacity-100"
                  >
                    ✕
                  </button>
                )}
              </div>
              <textarea
                value={entry.teamsText}
                onChange={(e) => updateEntry(i, { teamsText: e.target.value })}
                placeholder="Teams (comma-separated): Florida, Gonzaga, Marquette, Furman, Drake, High Point, Bryant, Alabama St"
                rows={2}
                className="w-full bg-slate-700/30 border border-slate-600/30 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-500/50 resize-none"
              />
              {entry.teamsText && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {parseTeams(entry.teamsText).map((team) => (
                    <span
                      key={team}
                      className="bg-amber-500/10 text-amber-300 text-xs px-2 py-1 rounded-lg border border-amber-500/20"
                    >
                      {team}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}

          <button
            onClick={addEntry}
            className="w-full glass-card rounded-xl py-3 text-slate-400 hover:text-white transition text-sm font-medium"
          >
            + Add Another Participant
          </button>

          <div className="flex justify-between items-center pt-2">
            <span className="text-sm text-slate-500">
              {validEntries.length} participants · {allTeams.length} teams entered
            </span>
            <button
              onClick={() => setStep("wins")}
              disabled={validEntries.length < 2}
              className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 disabled:opacity-50 text-black font-bold px-6 py-3 rounded-xl transition hover-lift shadow-lg shadow-amber-500/20"
            >
              Next: Enter Wins →
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Enter wins per team */}
      {step === "wins" && (
        <div className="space-y-4 animate-slide-up">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <span>🏆</span> Enter wins for each team
          </h2>
          <p className="text-sm text-slate-400">
            How many tournament games did each team win? (0 = lost in first round, 6 = champion).
            The &quot;Point tally&quot; number from your sheet = the wins count.
          </p>

          {validEntries.map((entry, entryIdx) => {
            const teamNames = parseTeams(entry.teamsText);
            if (teamNames.length === 0) return null;

            const entryTotalWins = teamNames.reduce(
              (sum, t) => sum + (entry.wins[t] || 0),
              0
            );

            return (
              <div key={entry.name} className="glass-card rounded-2xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-lg">{entry.name}</h3>
                  <span className="text-amber-400 font-bold">
                    {entryTotalWins} pts
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {teamNames.map((teamName) => {
                    const wins = entry.wins[teamName] || 0;
                    return (
                      <div
                        key={teamName}
                        className={`flex items-center justify-between bg-slate-700/30 rounded-xl px-4 py-2.5 ${
                          wins > 0 ? "border-l-4 border-amber-500/50" : ""
                        }`}
                      >
                        <span className="text-sm font-medium truncate mr-2">{teamName}</span>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() =>
                              updateWin(entries.indexOf(entry), teamName, wins - 1)
                            }
                            className="w-8 h-8 rounded-lg bg-slate-600/50 hover:bg-slate-500 text-white text-sm transition"
                          >
                            −
                          </button>
                          <span className="w-8 text-center font-mono font-bold text-lg">
                            {wins}
                          </span>
                          <button
                            onClick={() =>
                              updateWin(entries.indexOf(entry), teamName, wins + 1)
                            }
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

          <div className="flex justify-between items-center pt-2">
            <button
              onClick={() => setStep("teams")}
              className="glass-card text-slate-300 hover:text-white px-6 py-3 rounded-xl transition font-medium"
            >
              ← Back to Teams
            </button>
            <button
              onClick={() => setStep("review")}
              className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-bold px-6 py-3 rounded-xl transition hover-lift shadow-lg shadow-amber-500/20"
            >
              Next: Review →
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Review & Save */}
      {step === "review" && (
        <div className="space-y-4 animate-slide-up">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <span>✅</span> Review & Save
          </h2>

          {/* Summary */}
          <div className="glass-card rounded-2xl p-5 text-center">
            <h3 className="text-3xl font-extrabold text-gradient mb-1">{year} Tournament</h3>
            {champion && (
              <p className="text-slate-300">
                🏆 Champion: <span className="text-amber-400 font-bold">{champion}</span>
              </p>
            )}
            <p className="text-sm text-slate-500 mt-1">
              {validEntries.length} participants · {allTeams.length} teams
            </p>
          </div>

          {/* Standings Preview */}
          <div className="space-y-3">
            {validEntries
              .map((entry) => {
                const teamNames = parseTeams(entry.teamsText);
                const totalWins = teamNames.reduce(
                  (sum, t) => sum + (entry.wins[t] || 0),
                  0
                );
                return { ...entry, teamNames, totalWins };
              })
              .sort((a, b) => b.totalWins - a.totalWins)
              .map((entry, rank) => (
                <div
                  key={entry.name}
                  className={`glass-card rounded-2xl p-4 ${
                    rank === 0 ? "border-2 border-amber-400/30" : "border border-slate-700/30"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                          rank === 0
                            ? "rank-gold"
                            : rank === 1
                            ? "rank-silver"
                            : rank === 2
                            ? "rank-bronze"
                            : "bg-slate-700 text-slate-400"
                        }`}
                      >
                        {rank + 1}
                      </span>
                      <span className="font-bold text-lg">{entry.name}</span>
                    </div>
                    <span className="text-2xl font-extrabold text-gradient">
                      {entry.totalWins} pts
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {entry.teamNames.map((team) => {
                      const w = entry.wins[team] || 0;
                      return (
                        <span
                          key={team}
                          className={`text-xs px-2 py-1 rounded-lg ${
                            w > 0
                              ? "bg-amber-500/10 text-amber-300 border border-amber-500/20"
                              : "bg-slate-700/30 text-slate-500"
                          }`}
                        >
                          {team}
                          {w > 0 && ` (${w}W)`}
                        </span>
                      );
                    })}
                  </div>
                </div>
              ))}
          </div>

          <div className="flex justify-between items-center pt-2">
            <button
              onClick={() => setStep("wins")}
              className="glass-card text-slate-300 hover:text-white px-6 py-3 rounded-xl transition font-medium"
            >
              ← Back to Wins
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400 disabled:opacity-50 text-black font-bold px-8 py-3 rounded-xl transition hover-lift shadow-lg shadow-green-500/20 text-lg"
            >
              {saving ? "Saving..." : "💾 Save to History"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
