import { NextResponse } from "next/server";
import { store } from "@/lib/store";
import { TournamentResults } from "@/lib/types";

export async function GET() {
  const results = await store.getResults();
  // Backfill eliminated field for old data
  const data = results || { wins: {}, eliminated: [], updatedAt: "" };
  if (!data.eliminated) data.eliminated = [];
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const body = await request.json();
  const { wins } = body;

  if (!wins || typeof wins !== "object") {
    return NextResponse.json(
      { error: "wins object is required" },
      { status: 400 }
    );
  }

  // Preserve existing eliminated list if not provided
  const existing = await store.getResults();
  const results: TournamentResults = {
    wins,
    eliminated: body.eliminated || existing?.eliminated || [],
    updatedAt: new Date().toISOString(),
  };

  await store.setResults(results);

  return NextResponse.json(results);
}
