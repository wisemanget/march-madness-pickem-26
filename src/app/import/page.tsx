"use client";

import { useState, useMemo } from "react";
import { Pick, Team } from "@/lib/types";

interface ParsedParticipant {
  name: string;
  teams: { name: string; wins: number }[];
  totalPoints: number;
}

// Parse the Google Sheet tab-separated paste format
// Layout: paired participant blocks side by side
// Left block cols: [empty, name/team, point tally, total]
// Right block cols: [empty, empty, name/team, point tally, total]
// Participant header row has "Point tally" in it
// Team rows have team name + optional point values
// "Total Points =" marks end of block
function parseSheetData(raw: string): ParsedParticipant[] {
  const lines = raw.split("\n");
  const participants: ParsedParticipant[] = [];

  // Track current participant being built for left and right blocks
  let leftParticipant: ParsedParticipant | null = null;
  let rightParticipant: ParsedParticipant | null = null;

  for (const line of lines) {
    const cols = line.split("\t");

    // Check for left-block participant header (col B has name, col C has "Point tally")
    const colB = (cols[1] || "").trim();
    const colC = (cols[2] || "").trim();
    const colF = (cols[5] || cols[6] || "").trim(); // right block name
    const colG = (cols[6] || cols[7] || "").trim(); // right block "Point tally"

    // Detect participant header row: has "Point tally" somewhere
    const isLeftHeader = colB && colC.toLowerCase().includes("point tally");
    const isRightHeader = (() => {
      // Check columns 5-8 for a name + "Point tally" pattern
      for (let i = 5; i < Math.min(cols.length - 1, 9); i++) {
        const name = (cols[i] || "").trim();
        const next = (cols[i + 1] || "").trim();
        if (name && !name.toLowerCase().includes("point tally") && !name.toLowerCase().includes("total points") && next.toLowerCase().includes("point tally")) {
          return { name, tallyCol: i + 1 };
        }
      }
      return null;
    })();

    if (isLeftHeader) {
      // Save previous left participant
      if (leftParticipant) participants.push(leftParticipant);
      leftParticipant = { name: colB, teams: [], totalPoints: 0 };
    }

    if (isRightHeader) {
      if (rightParticipant) participants.push(rightParticipant);
      rightParticipant = { name: isRightHeader.name, teams: [], totalPoints: 0 };
    }

    // Skip header rows and total rows for team parsing
    if (isLeftHeader || colC.toLowerCase().includes("point tally")) {
      // Also check right side on same line
      if (!isRightHeader) continue;
      // If right header found, we handled it above
      continue;
    }

    // Check for "Total Points =" in left block
    const leftTotalMatch = cols.slice(0, 5).some((c) => (c || "").includes("Total Points"));
    if (leftTotalMatch && leftParticipant) {
      // Extract total from nearby column
      for (let i = 0; i < 5; i++) {
        const num = parseInt((cols[i] || "").trim());
        if (!isNaN(num) && num > 0 && !(cols[i] || "").includes("Total")) {
          leftParticipant.totalPoints = num;
        }
      }
      participants.push(leftParticipant);
      leftParticipant = null;
    }

    // Check for "Total Points =" in right block
    const rightTotalMatch = cols.slice(5).some((c) => (c || "").includes("Total Points"));
    if (rightTotalMatch && rightParticipant) {
      for (let i = 5; i < cols.length; i++) {
        const num = parseInt((cols[i] || "").trim());
        if (!isNaN(num) && num > 0 && !(cols[i] || "").includes("Total")) {
          rightParticipant.totalPoints = num;
        }
      }
      participants.push(rightParticipant);
      rightParticipant = null;
    }

    if (leftTotalMatch || rightTotalMatch) continue;

    // Parse team rows for left block (col B = team name, col C = point tally)
    if (leftParticipant && colB && !colB.toLowerCase().includes("total points") && !colB.toLowerCase().includes("point tally") && !colB.toLowerCase().includes("teams:")) {
      const wins = parseInt(colC) || 0;
      leftParticipant.teams.push({ name: colB, wins });
    }

    // Parse team rows for right block
    if (rightParticipant) {
      // Find the team name in the right block columns (typically col 5 or 6)
      for (let i = 5; i < Math.min(cols.length, 9); i++) {
        const cell = (cols[i] || "").trim();
        if (cell && !cell.toLowerCase().includes("total points") && !cell.toLowerCase().includes("point tally") && !cell.toLowerCase().includes("teams:") && !cell.toLowerCase().includes("order:")) {
          // Check if this looks like a team name (not a pure number)
          if (!/^\d+$/.test(cell)) {
            const winsCol = parseInt((cols[i + 1] || "").trim()) || 0;
            rightParticipant.teams.push({ name: cell, wins: winsCol });
            break; // Only one team per row per block
          }
        }
      }
    }
  }

  // Push any remaining participants
  if (leftParticipant) participants.push(leftParticipant);
  if (rightParticipant) participants.push(rightParticipant);

  // Deduplicate (in case of double-push)
  const seen = new Set<string>();
  return participants.filter((p) => {
    if (seen.has(p.name)) return false;
    seen.add(p.name);
    return p.teams.length > 0;
  });
}

export default function ImportPage() {
  const [year, setYear] = useState(2026);
  const [champion, setChampion] = useState("");
  const [pasteData, setPasteData] = useState("");
  const [parsed, setParsed] = useState<ParsedParticipant[]>([]);
  const [editParsed, setEditParsed] = useState<ParsedParticipant[]>([]);
  const [step, setStep] = useState<"paste" | "review" | "done">("paste");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">("success");

  const showMsg = (text: string, type: "success" | "error" = "success") => {
    setMessage(text);
    setMessageType(type);
    setTimeout(() => setMessage(""), 5000);
  };

  const handleParse = () => {
    if (!pasteData.trim()) {
      showMsg("Paste your Google Sheet data first!", "error");
      return;
    }
    const result = parseSheetData(pasteData);
    if (result.length === 0) {
      showMsg("Could not find any participants. Make sure you copied the full tab data.", "error");
      return;
    }
    setParsed(result);
    setEditParsed(JSON.parse(JSON.stringify(result)));
    setStep("review");
    showMsg(`Found ${result.length} participants with ${result.reduce((s, p) => s + p.teams.length, 0)} teams!`);
  };

  const updateTeamWins = (pIdx: number, tIdx: number, wins: number) => {
    setEditParsed((prev) => {
      const next = JSON.parse(JSON.stringify(prev));
      next[pIdx].teams[tIdx].wins = Math.max(0, Math.min(6, wins));
      next[pIdx].totalPoints = next[pIdx].teams.reduce((s: number, t: { wins: number }) => s + t.wins, 0);
      return next;
    });
  };

  const removeTeam = (pIdx: number, tIdx: number) => {
    setEditParsed((prev) => {
      const next = JSON.parse(JSON.stringify(prev));
      next[pIdx].teams.splice(tIdx, 1);
      next[pIdx].totalPoints = next[pIdx].teams.reduce((s: number, t: { wins: number }) => s + t.wins, 0);
      return next;
    });
  };

  const updateParticipantName = (pIdx: number, name: string) => {
    setEditParsed((prev) => {
      const next = [...prev];
      next[pIdx] = { ...next[pIdx], name };
      return next;
    });
  };

  const updateTeamName = (pIdx: number, tIdx: number, name: string) => {
    setEditParsed((prev) => {
      const next = JSON.parse(JSON.stringify(prev));
      next[pIdx].teams[tIdx].name = name;
      return next;
    });
  };

  const totalTeams = editParsed.reduce((s, p) => s + p.teams.length, 0);

  const handleSave = async () => {
    const valid = editParsed.filter((p) => p.name.trim() && p.teams.length > 0);
    if (valid.length < 2) {
      showMsg("Need at least 2 participants with teams!", "error");
      return;
    }

    setSaving(true);

    const participants = valid.map((p) => p.name.trim());
    const picks: Pick[] = [];
    const wins: Record<string, number> = {};
    const teams: Team[] = [];
    let pickNumber = 1;

    for (const entry of valid) {
      for (const team of entry.teams) {
        const t: Team = { name: team.name, seed: 0, region: "East" };
        teams.push(t);
        picks.push({
          pickNumber: pickNumber++,
          participantName: entry.name.trim(),
          team: t,
          timestamp: new Date().toISOString(),
        });
        if (team.wins > 0) {
          wins[team.name] = team.wins;
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
        setStep("done");
        showMsg(`${year} data imported successfully!`);
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
          <h1 className="text-3xl font-extrabold text-gradient">Import from Google Sheet</h1>
          <p className="text-slate-400 text-sm">Paste a sheet tab and everything is auto-detected</p>
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

      {/* Step indicator */}
      <div className="flex items-center gap-2 justify-center">
        {[
          { id: "paste" as const, label: "1. Paste", icon: "📄" },
          { id: "review" as const, label: "2. Review & Edit", icon: "✏️" },
          { id: "done" as const, label: "3. Done", icon: "✅" },
        ].map((s, i) => (
          <div key={s.id} className="flex items-center gap-2">
            <button
              onClick={() => {
                if (s.id === "paste") setStep("paste");
                if (s.id === "review" && editParsed.length > 0) setStep("review");
              }}
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

      {/* Step 1: Paste */}
      {step === "paste" && (
        <div className="space-y-4 animate-slide-up">
          {/* Instructions */}
          <div className="glass-card rounded-2xl p-5">
            <h2 className="font-semibold mb-2 flex items-center gap-2">
              <span>💡</span> How to import
            </h2>
            <ol className="text-sm text-slate-400 space-y-1.5 list-decimal list-inside">
              <li>Open your Google Sheet and click a year tab (2022, 2023, etc.)</li>
              <li>Select <strong className="text-white">all the data</strong> — the participant blocks with teams and point tallies (Ctrl+A or Cmd+A works)</li>
              <li>Copy it (Ctrl+C / Cmd+C)</li>
              <li>Paste it into the box below (Ctrl+V / Cmd+V)</li>
              <li>Hit <strong className="text-amber-400">&quot;Parse Sheet Data&quot;</strong> — names, teams, and wins are auto-detected</li>
            </ol>
          </div>

          {/* Year & Champion */}
          <div className="glass-card rounded-2xl p-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-slate-400 mb-1 block font-medium">Year</label>
                <input
                  type="number"
                  value={year}
                  onChange={(e) => setYear(parseInt(e.target.value) || 2026)}
                  className="w-full bg-slate-700/50 border border-slate-600/50 rounded-xl px-4 py-3 text-white text-xl font-bold focus:outline-none focus:border-amber-500/50"
                />
              </div>
              <div>
                <label className="text-sm text-slate-400 mb-1 block font-medium">Tournament Champion (optional)</label>
                <input
                  type="text"
                  value={champion}
                  onChange={(e) => setChampion(e.target.value)}
                  placeholder="e.g. Florida"
                  className="w-full bg-slate-700/50 border border-slate-600/50 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500/50"
                />
              </div>
            </div>
          </div>

          {/* Paste box */}
          <div className="glass-card rounded-2xl p-5">
            <label className="text-sm text-slate-400 mb-2 block font-medium">
              Paste your Google Sheet data here
            </label>
            <textarea
              value={pasteData}
              onChange={(e) => setPasteData(e.target.value)}
              placeholder={"Paste the copied sheet data here...\n\nIt should look something like:\n\tChris K.\tPoint tally\ttotal\t\t\tLuke\tPoint tally\ttotal\n\tFlorida\t4\t\t\t\tSt John\t1\n\t..."}
              rows={12}
              className="w-full bg-slate-900/50 border border-slate-600/50 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-500/50 resize-y font-mono"
            />
            <div className="flex items-center justify-between mt-3">
              <span className="text-xs text-slate-500">
                {pasteData ? `${pasteData.split("\n").length} lines pasted` : "Nothing pasted yet"}
              </span>
              <button
                onClick={handleParse}
                disabled={!pasteData.trim()}
                className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 disabled:opacity-50 text-black font-bold px-6 py-3 rounded-xl transition hover-lift shadow-lg shadow-amber-500/20"
              >
                🔍 Parse Sheet Data
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Review & Edit */}
      {step === "review" && (
        <div className="space-y-4 animate-slide-up">
          <div className="glass-card rounded-2xl p-4 text-center">
            <h3 className="text-2xl font-extrabold text-gradient">{year} Tournament</h3>
            {champion && (
              <p className="text-slate-300 text-sm mt-1">
                🏆 Champion: <span className="text-amber-400 font-bold">{champion}</span>
              </p>
            )}
            <p className="text-sm text-slate-500 mt-1">
              {editParsed.length} participants · {totalTeams} teams auto-detected
            </p>
          </div>

          <div className="glass-card rounded-2xl p-4">
            <p className="text-sm text-slate-400 mb-1">
              ✏️ Everything below was auto-parsed from your sheet. Review and fix anything that looks off — you can edit names, team names, and win counts. Then save.
            </p>
          </div>

          {/* Editable standings */}
          <div className="space-y-4">
            {editParsed
              .map((p, origIdx) => ({ ...p, origIdx }))
              .sort((a, b) => b.totalPoints - a.totalPoints)
              .map((participant, rank) => (
                <div
                  key={participant.origIdx}
                  className={`glass-card rounded-2xl p-5 ${
                    rank === 0 ? "border-2 border-amber-400/30" : "border border-slate-700/30"
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
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
                      <input
                        type="text"
                        value={participant.name}
                        onChange={(e) => updateParticipantName(participant.origIdx, e.target.value)}
                        className="bg-transparent border-b border-slate-600 text-lg font-bold text-white focus:outline-none focus:border-amber-500 px-1 py-0.5"
                      />
                    </div>
                    <span className="text-2xl font-extrabold text-gradient shrink-0 ml-2">
                      {participant.totalPoints} pts
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {participant.teams.map((team, tIdx) => (
                      <div
                        key={tIdx}
                        className={`flex items-center gap-2 bg-slate-700/30 rounded-xl px-3 py-2 group ${
                          team.wins > 0 ? "border-l-4 border-amber-500/50" : ""
                        }`}
                      >
                        <input
                          type="text"
                          value={team.name}
                          onChange={(e) => updateTeamName(participant.origIdx, tIdx, e.target.value)}
                          className="flex-1 bg-transparent text-sm font-medium text-white focus:outline-none border-b border-transparent focus:border-slate-500 min-w-0"
                        />
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => updateTeamWins(participant.origIdx, tIdx, team.wins - 1)}
                            className="w-7 h-7 rounded-lg bg-slate-600/50 hover:bg-slate-500 text-white text-xs transition"
                          >
                            −
                          </button>
                          <span className="w-6 text-center font-mono font-bold">
                            {team.wins}
                          </span>
                          <button
                            onClick={() => updateTeamWins(participant.origIdx, tIdx, team.wins + 1)}
                            className="w-7 h-7 rounded-lg bg-slate-600/50 hover:bg-slate-500 text-white text-xs transition"
                          >
                            +
                          </button>
                        </div>
                        <button
                          onClick={() => removeTeam(participant.origIdx, tIdx)}
                          className="w-6 h-6 rounded text-red-400 hover:bg-red-600/30 text-xs transition opacity-0 group-hover:opacity-100"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
          </div>

          <div className="flex justify-between items-center pt-2">
            <button
              onClick={() => setStep("paste")}
              className="glass-card text-slate-300 hover:text-white px-6 py-3 rounded-xl transition font-medium"
            >
              ← Re-paste
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

      {/* Step 3: Done */}
      {step === "done" && (
        <div className="glass-card rounded-2xl p-8 text-center animate-bounce-in">
          <span className="text-6xl block mb-4 trophy-spin inline-block">🏆</span>
          <h2 className="text-2xl font-extrabold text-gradient mb-2">
            {year} Imported Successfully!
          </h2>
          <p className="text-slate-400 mb-6">
            {editParsed.length} participants and {totalTeams} teams saved.
          </p>
          <div className="flex gap-4 justify-center">
            <a
              href="/history"
              className="bg-gradient-to-r from-amber-500 to-orange-500 text-black font-bold px-6 py-3 rounded-xl transition hover-lift shadow-lg shadow-amber-500/20"
            >
              📚 View History
            </a>
            <button
              onClick={() => {
                setPasteData("");
                setParsed([]);
                setEditParsed([]);
                setChampion("");
                setYear((y) => y - 1);
                setStep("paste");
              }}
              className="glass-card text-white font-bold px-6 py-3 rounded-xl transition hover-lift"
            >
              📋 Import Another Year
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
