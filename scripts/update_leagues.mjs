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
const predictionsPath = path.resolve('src/data/matchPredictions.json');
const SPORT_KEYS = [
  'soccer_epl',
  'soccer_spain_la_liga',
  'soccer_italy_serie_a',
  'soccer_germany_bundesliga',
  'soccer_france_ligue_one',
  'soccer_uefa_champs_league',
];

// Kept in sync with CLAUDE.md's "Tracked Focus Clubs" section and
// src/pages/[lang]/index.astro's FOCUS_CLUBS — update all three together.
// AI predictions (matchPredictions.json) are 100% hand-written by Claude,
// never auto-generated (see CLAUDE.md), so this can't auto-fix a gap — it
// only prints a warning so a coverage drop is visible in the daily cron log
// instead of silently sitting until someone happens to look at the homepage.
const FOCUS_CLUBS = new Set([
  'Arsenal', 'Manchester City', 'Manchester United', 'Tottenham Hotspur', 'Chelsea', 'Liverpool',
  'Real Madrid', 'Barcelona', 'Bayern Munich', 'Paris Saint Germain',
]);

function checkFocusClubPredictionCoverage(matches) {
  let predictions = {};
  try { predictions = JSON.parse(fs.readFileSync(predictionsPath, 'utf8')); } catch (e) {}
  const focusMatches = matches.filter(m => FOCUS_CLUBS.has(m.home_team) || FOCUS_CLUBS.has(m.away_team));
  const missing = focusMatches.filter(m => !(m.id in predictions));
  if (missing.length === 0) {
    console.log(`✅ Prediction coverage: all ${focusMatches.length} focus-club matches have a matchPredictions.json entry.`);
    return;
  }
  console.warn(`⚠️  Prediction coverage gap: ${missing.length}/${focusMatches.length} focus-club matches have NO matchPredictions.json entry (homepage will show the "結算中" placeholder for these):`);
  for (const m of missing) {
    console.warn(`   - [${m.id}] ${m.commence_time} ${m.home_team} vs ${m.away_team} (${m.sport_title})`);
  }
  console.warn(`   Ask Claude to backfill predictions for these — this script never writes predictions itself.`);
}

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

  checkFocusClubPredictionCoverage(merged);
}

main();
