import { NextResponse } from "next/server";
import { store } from "@/lib/store";
import { HistoricalYear, Pick } from "@/lib/types";
import { FIRST_FOUR_REPLACEMENTS } from "@/lib/teams";

/**
 * Normalize a historical year's picks and results so that First Four
 * play-in team names (e.g. "NC State", "UMBC", "SMU") are replaced with
 * the teams that actually advanced (e.g. "Texas", "Howard", "Miami (OH)").
 *
 * This runs at read-time so the history page and its scoreboard always
 * receive consistent data regardless of when the season was archived.
 */
function normalizeHistoricalYear(yearData: HistoricalYear): HistoricalYear {
  // Remap picks from play-in team → winner that took their spot
  const normalizedPicks: Pick[] = yearData.picks.map((pick) => {
    const replacement = FIRST_FOUR_REPLACEMENTS[pick.team.name];
    if (!replacement) return pick;
    return {
      ...pick,
      team: { ...pick.team, name: replacement },
    };
  });

  // Remap wins: if old play-in name has wins recorded, move them to the replacement
  const rawWins = yearData.results?.wins || {};
  const normalizedWins: Record<string, number> = {};
  for (const [team, wins] of Object.entries(rawWins)) {
    const name = FIRST_FOUR_REPLACEMENTS[team] || team;
    // Take the higher value in case both old and new names exist
    normalizedWins[name] = Math.max(normalizedWins[name] || 0, wins);
  }

  return {
    ...yearData,
    picks: normalizedPicks,
    results: {
      ...yearData.results,
      wins: normalizedWins,
    },
  };
}

export async function GET() {
  const years = await store.getHistoryIndex();
  if (!years || years.length === 0) {
    return NextResponse.json({ years: [], data: {} });
  }

  const data: Record<number, HistoricalYear> = {};
  for (const year of years) {
    const yearData = await store.getHistoricalYear(year);
    if (yearData) data[year] = normalizeHistoricalYear(yearData);
  }

  return NextResponse.json({ years, data });
}

export async function POST(request: Request) {
  const body = await request.json();
  const { year, participants, picks, results, teams, champion } = body;

  if (!year || !participants) {
    return NextResponse.json(
      { error: "year and participants are required" },
      { status: 400 }
    );
  }

  const yearData: HistoricalYear = {
    year,
    participants: participants || [],
    picks: picks || [],
    results: results || { wins: {}, updatedAt: "" },
    teams: teams || [],
    champion,
    updatedAt: new Date().toISOString(),
  };

  await store.setHistoricalYear(year, yearData);

  // Update index
  let years = await store.getHistoryIndex();
  if (!years) years = [];
  if (!years.includes(year)) {
    years.push(year);
    years.sort((a, b) => b - a); // newest first
    await store.setHistoryIndex(years);
  }

  return NextResponse.json(yearData);
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const yearStr = searchParams.get("year");
  if (!yearStr) {
    return NextResponse.json({ error: "year parameter required" }, { status: 400 });
  }

  const year = parseInt(yearStr);
  let years = await store.getHistoryIndex();
  if (years) {
    years = years.filter((y) => y !== year);
    await store.setHistoryIndex(years);
  }

  return NextResponse.json({ success: true });
}
