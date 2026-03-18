import { NextResponse } from "next/server";
import { store } from "@/lib/store";
import { HistoricalYear } from "@/lib/types";

export async function GET() {
  const years = await store.getHistoryIndex();
  if (!years || years.length === 0) {
    return NextResponse.json({ years: [], data: {} });
  }

  const data: Record<number, HistoricalYear> = {};
  for (const year of years) {
    const yearData = await store.getHistoricalYear(year);
    if (yearData) data[year] = yearData;
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
