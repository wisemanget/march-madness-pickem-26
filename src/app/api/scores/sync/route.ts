import { NextResponse } from "next/server";
import { fetchLiveGames, computeWinsFromGames } from "@/lib/espn";
import { store } from "@/lib/store";
import { TournamentResults } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * POST /api/scores/sync
 *
 * Fetches all tournament games from ESPN (across multiple days),
 * computes win totals from final games, and updates the results store.
 *
 * This merges ESPN data with any manually-entered results,
 * preferring the higher value (so manual overrides are preserved).
 */
export async function POST() {
  try {
    // Fetch games across the tournament date range
    // NCAA tournament typically runs ~3 weeks in March/April
    const today = new Date();
    const year = today.getFullYear();

    // Generate date range: March 14 through April 10
    const dates: string[] = [];
    const start = new Date(year, 2, 14); // March 14
    const end = new Date(year, 3, 10);   // April 10

    for (let d = new Date(start); d <= end && d <= today; d.setDate(d.getDate() + 1)) {
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      dates.push(`${yyyy}${mm}${dd}`);
    }

    // Fetch all games across all tournament dates
    // Do in batches to avoid overwhelming ESPN
    const allGames = [];
    for (const date of dates) {
      const games = await fetchLiveGames(date);
      allGames.push(...games);
    }

    // Deduplicate games by ID
    const uniqueGames = Array.from(
      new Map(allGames.map((g) => [g.id, g])).values()
    );

    // Compute wins from final games
    const { wins: espnWins, eliminated } = computeWinsFromGames(uniqueGames);

    // Merge with existing results (keep the higher win count)
    const existing = await store.getResults();
    const mergedWins: Record<string, number> = { ...(existing?.wins || {}) };

    for (const [team, wins] of Object.entries(espnWins)) {
      mergedWins[team] = Math.max(mergedWins[team] || 0, wins);
    }

    // Merge eliminated lists
    const existingEliminated = existing?.eliminated || [];
    const mergedEliminated = Array.from(
      new Set([...existingEliminated, ...eliminated])
    );

    const results: TournamentResults = {
      wins: mergedWins,
      eliminated: mergedEliminated,
      updatedAt: new Date().toISOString(),
    };

    await store.setResults(results);

    return NextResponse.json({
      results,
      gamesProcessed: uniqueGames.filter((g) => g.status === "post").length,
      totalGames: uniqueGames.length,
    });
  } catch (error) {
    console.error("Failed to sync scores:", error);
    return NextResponse.json(
      { error: "Failed to sync scores from ESPN" },
      { status: 500 }
    );
  }
}
