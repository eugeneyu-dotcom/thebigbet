import fs from 'fs';
import path from 'path';

// Fetch football odds for the Top 5 European leagues (separate from the
// World-Cup-only matches.json). Mirrors update_matches.mjs / update_cricket.mjs.

const keysStr = process.env.ODDS_API_KEY || '';
const API_KEYS = keysStr.split(',').map(k => k.trim()).filter(k => k.length > 0);

if (API_KEYS.length === 0) {
  console.error("❌ Error: ODDS_API_KEY is not set.");
  process.exit(1);
}

const matchesPath = path.resolve('src/data/leagueMatches.json');
const SPORT_KEYS = [
  'soccer_epl',
  'soccer_spain_la_liga',
  'soccer_italy_serie_a',
  'soccer_germany_bundesliga',
  'soccer_france_ligue_one',
];

async function fetchWithKeyRotation(urlTemplate) {
  for (let i = 0; i < API_KEYS.length; i++) {
    const key = API_KEYS[i];
    const url = urlTemplate.replace('{{API_KEY}}', key);
    try {
      const res = await fetch(url);
      if (res.ok) return await res.json();
      if (res.status === 401 || res.status === 429) {
        console.warn(`⚠️ Key ${i + 1} failed with status ${res.status}. Trying next key...`);
        continue;
      }
      console.error(`⚠️ Request failed with status ${res.status}`);
      return null;
    } catch (e) {
      console.error(`⚠️ Exception during fetch:`, e);
      continue;
    }
  }
  console.error("❌ All API keys failed or exhausted.");
  return null;
}

async function main() {
  console.log("⚽️ Starting Top 5 Leagues odds cache update via The-Odds-API...");

  let allMatches = [];
  for (const sportKey of SPORT_KEYS) {
    console.log(`Fetching latest odds for ${sportKey}...`);
    const matches = await fetchWithKeyRotation(`https://api.the-odds-api.com/v4/sports/${sportKey}/odds/?apiKey={{API_KEY}}&regions=uk,eu&markets=h2h`);
    if (Array.isArray(matches)) {
      console.log(`  → ${matches.length} matches`);
      allMatches.push(...matches);
    } else {
      console.log(`  → no data`);
    }
  }

  let existingMatches = [];
  if (fs.existsSync(matchesPath)) {
    try { existingMatches = JSON.parse(fs.readFileSync(matchesPath, 'utf8')); } catch (e) {}
  }
  // Keep existing odds if already cached for a match (don't overwrite once set).
  const merged = allMatches.map(nm => {
    const existing = existingMatches.find(m => m.id === nm.id);
    if (existing && existing.bookmakers && existing.bookmakers.length > 0) {
      return { ...nm, bookmakers: existing.bookmakers };
    }
    return nm;
  });
  fs.writeFileSync(matchesPath, JSON.stringify(merged, null, 2), 'utf8');
  console.log(`✅ Successfully cached ${merged.length} Top 5 Leagues matches to leagueMatches.json.`);
}

main();
