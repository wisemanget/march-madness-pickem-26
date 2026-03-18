import { LiveGame } from "./types";
import { TEAMS } from "./teams";

const SCOREBOARD_URL =
  "https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/scoreboard";

// Map ESPN display names to our team names
// ESPN uses various forms: "Duke Blue Devils", "Duke", etc.
// Build a lookup from lowercase keywords -> our team name
const TEAM_NAME_MAP: Record<string, string> = {};
for (const team of TEAMS) {
  TEAM_NAME_MAP[team.name.toLowerCase()] = team.name;
}
// Add common ESPN display name variations
const ESPN_ALIASES: Record<string, string> = {
  "uconn": "UConn",
  "connecticut": "UConn",
  "connecticut huskies": "UConn",
  "michigan st": "Michigan State",
  "michigan state spartans": "Michigan State",
  "duke blue devils": "Duke",
  "florida gators": "Florida",
  "houston cougars": "Houston",
  "illinois fighting illini": "Illinois",
  "nebraska cornhuskers": "Nebraska",
  "north carolina tar heels": "North Carolina",
  "unc": "North Carolina",
  "tar heels": "North Carolina",
  "clemson tigers": "Clemson",
  "iowa hawkeyes": "Iowa",
  "iowa state cyclones": "Iowa State",
  "texas a&m aggies": "Texas A&M",
  "virginia cavaliers": "Virginia",
  "alabama crimson tide": "Alabama",
  "texas tech red raiders": "Texas Tech",
  "tennessee volunteers": "Tennessee",
  "kentucky wildcats": "Kentucky",
  "georgia bulldogs": "Georgia",
  "arizona wildcats": "Arizona",
  "purdue boilermakers": "Purdue",
  "gonzaga bulldogs": "Gonzaga",
  "arkansas razorbacks": "Arkansas",
  "wisconsin badgers": "Wisconsin",
  "byu cougars": "BYU",
  "brigham young": "BYU",
  "miami hurricanes": "Miami (FL)",
  "villanova wildcats": "Villanova",
  "utah state aggies": "Utah State",
  "missouri tigers": "Missouri",
  "nc state wolfpack": "NC State",
  "north carolina state": "NC State",
  "st. john's red storm": "St. John's",
  "louisville cardinals": "Louisville",
  "ucla bruins": "UCLA",
  "ohio state buckeyes": "Ohio State",
  "tcu horned frogs": "TCU",
  "ucf knights": "UCF",
  "south florida bulls": "South Florida",
  "northern iowa panthers": "Northern Iowa",
  "california baptist lancers": "Cal Baptist",
  "cal baptist": "Cal Baptist",
  "north dakota state bison": "North Dakota State",
  "furman paladins": "Furman",
  "siena saints": "Siena",
  "vanderbilt commodores": "Vanderbilt",
  "saint mary's gaels": "Saint Mary's",
  "saint mary's": "Saint Mary's",
  "vcu rams": "VCU",
  "mcneese cowboys": "McNeese",
  "mcneese state": "McNeese",
  "troy trojans": "Troy",
  "penn quakers": "Penn",
  "pennsylvania": "Penn",
  "idaho vandals": "Idaho",
  "prairie view a&m panthers": "Prairie View A&M",
  "prairie view": "Prairie View A&M",
  "michigan wolverines": "Michigan",
  "saint louis billikens": "Saint Louis",
  "santa clara broncos": "Santa Clara",
  "smu mustangs": "SMU",
  "akron zips": "Akron",
  "hofstra pride": "Hofstra",
  "wright state raiders": "Wright State",
  "tennessee state tigers": "Tennessee State",
  "umbc retrievers": "UMBC",
  "high point panthers": "High Point",
  "hawaii rainbow warriors": "Hawaii",
  "hawai'i": "Hawaii",
  "kennesaw state owls": "Kennesaw State",
  "queens royals": "Queens",
  "liu sharks": "LIU",
  "long island": "LIU",
};

for (const [alias, name] of Object.entries(ESPN_ALIASES)) {
  TEAM_NAME_MAP[alias.toLowerCase()] = name;
}

/**
 * Try to match an ESPN team name to our team list.
 * Tries exact match, alias match, then substring matching.
 */
export function mapEspnTeamName(espnName: string): string {
  const lower = espnName.toLowerCase().trim();

  // Direct match
  if (TEAM_NAME_MAP[lower]) return TEAM_NAME_MAP[lower];

  // Check if any of our team names appear in the ESPN name
  for (const team of TEAMS) {
    const teamLower = team.name.toLowerCase();
    if (lower.includes(teamLower)) return team.name;
  }

  // Check if any alias is a substring
  for (const [alias, name] of Object.entries(TEAM_NAME_MAP)) {
    if (lower.includes(alias) || alias.includes(lower)) return name;
  }

  // No match - return original
  return espnName;
}

// Round name mapping from ESPN
const ROUND_MAP: Record<number, string> = {
  1: "First Four",
  2: "Round of 64",
  3: "Round of 32",
  4: "Sweet 16",
  5: "Elite 8",
  6: "Final Four",
  7: "Championship",
};

// Round number to wins: winning in Round of 64 = 1 win, Round of 32 = 2 wins, etc.
export const ROUND_TO_WINS: Record<number, number> = {
  1: 0, // First Four doesn't count as a tournament win in our scoring
  2: 1, // Round of 64
  3: 2, // Round of 32
  4: 3, // Sweet 16
  5: 4, // Elite 8
  6: 5, // Final Four
  7: 6, // Championship
};

// How many more wins a team can earn from a given round
export function maxRemainingWins(currentWins: number): number {
  return Math.max(0, 6 - currentWins);
}

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Fetch live NCAA tournament games from ESPN.
 * Optionally pass a date (YYYYMMDD) for a specific day;
 * defaults to today.
 */
export async function fetchLiveGames(date?: string): Promise<LiveGame[]> {
  const params = new URLSearchParams({
    groups: "100",  // NCAA tournament
    limit: "100",
  });
  if (date) {
    params.set("dates", date);
  }

  const url = `${SCOREBOARD_URL}?${params}`;
  const res = await fetch(url, {
    next: { revalidate: 30 }, // cache for 30 seconds
  });

  if (!res.ok) {
    console.error(`ESPN API error: ${res.status}`);
    return [];
  }

  const data = await res.json();
  const events = data.events || [];

  return events.map((event: any) => {
    const competition = event.competitions?.[0];
    const competitors = competition?.competitors || [];
    const status = competition?.status;

    // ESPN status types: STATUS_SCHEDULED, STATUS_IN_PROGRESS, STATUS_FINAL, STATUS_HALFTIME, etc.
    const statusType = status?.type?.name || "";
    let gameStatus: "pre" | "in" | "post" = "pre";
    if (statusType === "STATUS_FINAL" || statusType === "STATUS_END_PERIOD") {
      gameStatus = "post";
    } else if (
      statusType === "STATUS_IN_PROGRESS" ||
      statusType === "STATUS_HALFTIME" ||
      statusType === "STATUS_END_OF_PERIOD"
    ) {
      gameStatus = "in";
    }

    // Get round info
    const roundNumber = event.season?.type || competition?.tournamentRoundNumber || 0;
    const roundName = ROUND_MAP[roundNumber] || event.season?.slug || "";

    // Parse competitors (home = index 0 or isHome, away = other)
    const home = competitors.find((c: any) => c.homeAway === "home") || competitors[0];
    const away = competitors.find((c: any) => c.homeAway === "away") || competitors[1];

    const parseTeam = (comp: any) => {
      const espnName = comp?.team?.displayName || comp?.team?.shortDisplayName || comp?.team?.name || "TBD";
      return {
        name: mapEspnTeamName(espnName),
        espnName,
        seed: parseInt(comp?.curatedRank?.current || comp?.seed || "0") || 0,
        score: parseInt(comp?.score || "0") || 0,
        logo: comp?.team?.logo || undefined,
        winner: comp?.winner === true,
      };
    };

    // Get broadcast info
    const broadcasts = competition?.broadcasts || [];
    const broadcast = broadcasts[0]?.names?.[0] || undefined;

    return {
      id: event.id || "",
      status: gameStatus,
      statusDetail: status?.type?.shortDetail || status?.type?.detail || "",
      round: roundName,
      startTime: event.date || competition?.date || "",
      homeTeam: parseTeam(home),
      awayTeam: parseTeam(away),
      broadcast,
    } as LiveGame;
  });
}

/**
 * From a list of completed games, compute the win counts for each team.
 * A team gets +1 win for each game they won in the tournament.
 */
export function computeWinsFromGames(
  games: LiveGame[]
): { wins: Record<string, number>; eliminated: string[] } {
  const wins: Record<string, number> = {};
  const eliminated: string[] = [];

  for (const game of games) {
    if (game.status !== "post") continue; // only count final games

    const winner = game.homeTeam.winner ? game.homeTeam : game.awayTeam;
    const loser = game.homeTeam.winner ? game.awayTeam : game.homeTeam;

    // Only count if we can map to one of our teams
    const winnerTeam = TEAMS.find((t) => t.name === winner.name);
    const loserTeam = TEAMS.find((t) => t.name === loser.name);

    if (winnerTeam) {
      wins[winnerTeam.name] = (wins[winnerTeam.name] || 0) + 1;
    }
    if (loserTeam && !eliminated.includes(loserTeam.name)) {
      eliminated.push(loserTeam.name);
    }
  }

  return { wins, eliminated };
}
