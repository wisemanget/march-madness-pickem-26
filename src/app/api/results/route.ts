import { NextResponse } from "next/server";
import { store } from "@/lib/store";
import { TournamentResults } from "@/lib/types";

export async function GET() {
  const results = await store.getResults();
  return NextResponse.json(results || { wins: {}, updatedAt: "" });
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

  const results: TournamentResults = {
    wins,
    updatedAt: new Date().toISOString(),
  };

  await store.setResults(results);

  return NextResponse.json(results);
}
