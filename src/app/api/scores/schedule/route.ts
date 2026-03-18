import { NextResponse } from "next/server";
import { fetchLiveGames } from "@/lib/espn";
import { LiveGame } from "@/lib/types";

export const dynamic = "force-dynamic";

// In-memory cache to avoid hammering ESPN on every request
let cache: { games: LiveGame[]; fetchedAt: number } | null = null;
const CACHE_TTL = 2 * 60 * 1000; // 2 minutes

/**
 * GET /api/scores/schedule
 *
 * Returns all tournament games across the full date range (March 14 – April 10),
 * including future scheduled games with start times.
 * Results are cached in-memory for 2 minutes.
 */
export async function GET() {
  try {
    // Return cached data if fresh
    if (cache && Date.now() - cache.fetchedAt < CACHE_TTL) {
      return NextResponse.json({
        games: cache.games,
        fetchedAt: new Date(cache.fetchedAt).toISOString(),
        cached: true,
      });
    }

    const year = new Date().getFullYear();
    const start = new Date(year, 2, 14); // March 14
    const end = new Date(year, 3, 10); // April 10

    const dates: string[] = [];
    for (
      let d = new Date(start);
      d <= end;
      d.setDate(d.getDate() + 1)
    ) {
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      dates.push(`${yyyy}${mm}${dd}`);
    }

    // Fetch in parallel batches of 5 to avoid overwhelming ESPN
    const allGames: LiveGame[] = [];
    for (let i = 0; i < dates.length; i += 5) {
      const batch = dates.slice(i, i + 5);
      const results = await Promise.all(
        batch.map((d) => fetchLiveGames(d))
      );
      for (const games of results) {
        allGames.push(...games);
      }
    }

    // Deduplicate by game ID
    const unique = Array.from(
      new Map(allGames.map((g) => [g.id, g])).values()
    );

    cache = { games: unique, fetchedAt: Date.now() };

    return NextResponse.json({
      games: unique,
      fetchedAt: new Date().toISOString(),
      cached: false,
    });
  } catch (error) {
    console.error("Failed to fetch tournament schedule:", error);
    // Return stale cache if available
    if (cache) {
      return NextResponse.json({
        games: cache.games,
        fetchedAt: new Date(cache.fetchedAt).toISOString(),
        cached: true,
        stale: true,
      });
    }
    return NextResponse.json(
      { games: [], fetchedAt: new Date().toISOString(), error: "Failed to fetch schedule" },
      { status: 500 }
    );
  }
}
