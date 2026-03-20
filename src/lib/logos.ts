// ESPN CDN team logo mapping
// URL pattern: https://a.espncdn.com/i/teamlogos/ncaa/500/{id}.png
// Covers all 64 current tournament teams + common historical teams

const ESPN_IDS: Record<string, number> = {
  // === EAST REGION ===
  "duke": 150,
  "uconn": 41,
  "connecticut": 41,
  "michigan state": 127,
  "michigan st": 127,
  "michigan st.": 127,
  "kansas": 2305,
  "st. john's": 2599,
  "st john's": 2599,
  "st john": 2599,
  "st. john": 2599,
  "st johns": 2599,
  "louisville": 97,
  "ucla": 26,
  "ohio state": 194,
  "ohio st": 194,
  "tcu": 2628,
  "ucf": 2116,
  "south florida": 58,
  "usf": 58,
  "northern iowa": 2460,
  "cal baptist": 2856,
  "california baptist": 2856,
  "north dakota state": 2449,
  "north dakota st": 2449,
  "furman": 231,
  "siena": 2561,

  // === SOUTH REGION ===
  "florida": 57,
  "houston": 248,
  "illinois": 356,
  "nebraska": 158,
  "vanderbilt": 238,
  "north carolina": 153,
  "unc": 153,
  "saint mary's": 2608,
  "saint marys": 2608,
  "st mary's": 2608,
  "st marys": 2608,
  "st mary": 2608,
  "clemson": 228,
  "iowa": 2294,
  "texas a&m": 245,
  "texas am": 245,
  "vcu": 2670,
  "mcneese": 2377,
  "mcneese state": 2377,
  "mcneese st": 2377,
  "troy": 2653,
  "penn": 219,
  "pennsylvania": 219,
  "idaho": 70,
  "prairie view a&m": 2504,
  "prairie view": 2504,

  // === MIDWEST REGION ===
  "michigan": 130,
  "iowa state": 66,
  "iowa st": 66,
  "virginia": 258,
  "alabama": 333,
  "texas tech": 2641,
  "tennessee": 2633,
  "kentucky": 96,
  "georgia": 61,
  "saint louis": 139,
  "st louis": 139,
  "st. louis": 139,
  "santa clara": 2541,
  "miami (oh)": 193,
  "miami ohio": 193,
  "akron": 2006,
  "hofstra": 2275,
  "wright state": 2750,
  "wright st": 2750,
  "tennessee state": 2634,
  "tennessee st": 2634,
  "howard bison": 47,

  // === WEST REGION ===
  "arizona": 12,
  "purdue": 2509,
  "gonzaga": 2250,
  "arkansas": 8,
  "wisconsin": 275,
  "byu": 252,
  "brigham young": 252,
  "miami (fl)": 2390,
  "miami": 2390,
  "villanova": 222,
  "utah state": 328,
  "utah st": 328,
  "utah st.": 328,
  "missouri": 142,
  "mizzou": 142,
  "texas longhorns": 251,
  "high point": 2272,
  "hawaii": 62,
  "hawai'i": 62,
  "kennesaw state": 2314,
  "kennesaw st": 2314,
  "queens": 2853,
  "liu": 2344,
  "long island": 2344,

  // === COMMON HISTORICAL TEAMS ===
  "auburn": 2,
  "baylor": 239,
  "creighton": 156,
  "marquette": 269,
  "memphis": 235,
  "ole miss": 145,
  "mississippi": 145,
  "miss st": 344,
  "mississippi state": 344,
  "mississippi st": 344,
  "mississippi st.": 344,
  "oklahoma": 201,
  "mount st mary": 2351,
  "mount st mary's": 2351,
  "mount st. mary's": 2351,
  "drake": 2181,
  "bryant": 2803,
  "alabama state": 2011,
  "alabama st": 2011,
  "colorado state": 36,
  "colorado st": 36,
  "wofford": 2747,
  "norfolk state": 2450,
  "norfolk st": 2450,
  "norfolk st.": 2450,
  "uc san diego": 5765,
  "oregon": 2483,
  "oregon state": 204,
  "oregon st": 204,
  "new mexico": 167,
  "robert morris": 2523,
  "texas": 251,
  "xavier": 2752,
  "grand canyon": 2253,
  "lipscomb": 288,
  "unc wilmington": 350,
  "uncw": 350,
  "siu edwardsville": 2565,
  "siue": 2565,
  "liberty": 2335,
  "montana": 149,
  "omaha": 2437,
  "yale": 43,
  "san diego state": 21,
  "san diego st": 21,
  "san diego st.": 21,
  "maryland": 120,
  "stanford": 24,
  "northwestern": 77,
  "pittsburgh": 221,
  "pitt": 221,
  "west virginia": 277,
  "dayton": 2168,
  "colorado": 38,
  "providence": 2507,
  "cincinnati": 2132,
  "butler": 2086,
  "wichita state": 2724,
  "wichita st": 2724,
  "syracuse": 183,
  "georgetown": 46,
  "indiana": 84,
  "notre dame": 87,
  "rutgers": 164,
  "washington": 264,
  "minnesota": 135,
  "wake forest": 154,
  "lsu": 99,
  "oklahoma state": 197,
  "oklahoma st": 197,
  "texas state": 326,
  "south carolina": 2579,
  "richmond": 257,
  "belmont": 2057,
  "murray state": 2413,
  "murray st": 2413,
  "loyola chicago": 2350,
  "loyola-chicago": 2350,
  "oral roberts": 198,
  "abilene christian": 2000,
  "colgate": 2142,
  "iona": 314,
  "vermont": 261,
  "jacksonville state": 55,
  "jacksonville st": 55,
  "chattanooga": 236,
  "longwood": 2344,
  "st. peter's": 2612,
  "st peter's": 2612,
  "fairleigh dickinson": 161,
  "princeton": 163,
  "uab": 5,
  "north texas": 249,
  "nevada": 2440,
  "unlv": 2439,
  "san francisco": 2539,
  "kent state": 2309,
  "kent st": 2309,
  "charleston": 2127,
  "college of charleston": 2127,
  "samford": 2534,
  "grambling": 2755,
  "grambling state": 2755,
  "grambling st": 2755,
  "howard": 47,
  "southeastern louisiana": 2545,
  "se louisiana": 2545,
  "wagner": 2681,
  "stetson": 56,
  "morehead state": 2400,
  "morehead st": 2400,
};

export function getLogoUrl(teamName: string): string | null {
  const key = teamName.toLowerCase().trim();
  const id = ESPN_IDS[key];
  if (id) {
    return `https://a.espncdn.com/i/teamlogos/ncaa/500/${id}.png`;
  }

  // Try partial matching - check if any key is contained in the team name or vice versa
  for (const [mapKey, mapId] of Object.entries(ESPN_IDS)) {
    if (key.includes(mapKey) || mapKey.includes(key)) {
      return `https://a.espncdn.com/i/teamlogos/ncaa/500/${mapId}.png`;
    }
  }

  return null;
}

// Generate a color from team name for fallback avatars
export function getTeamColor(teamName: string): string {
  let hash = 0;
  for (let i = 0; i < teamName.length; i++) {
    hash = teamName.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 60%, 40%)`;
}

export function getTeamInitials(teamName: string): string {
  // Handle abbreviations
  const upper = teamName.toUpperCase();
  if (["UCLA", "UCF", "BYU", "VCU", "TCU", "LSU", "UNLV", "UAB"].includes(upper)) {
    return upper.slice(0, 3);
  }
  // Handle "St." prefix
  const cleaned = teamName.replace(/^(St\.|Saint|Mount St\.?)\s*/i, "");
  const words = cleaned.split(/\s+/).filter(w => w.length > 0);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return words.slice(0, 2).map(w => w[0]).join("").toUpperCase();
}
