import { NextResponse } from "next/server";
import { fetchLiveGames } from "@/lib/espn";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date") || undefined;

  try {
    const games = await fetchLiveGames(date);
    return NextResponse.json({
      games,
      fetchedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Failed to fetch live scores:", error);
    return NextResponse.json(
      { games: [], fetchedAt: new Date().toISOString(), error: "Failed to fetch scores" },
      { status: 500 }
    );
  }
}
