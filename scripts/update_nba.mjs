import fs from 'fs';
import path from 'path';

// Fetch NBA moneyline / point spread / total odds from The Odds API and cache
// them to src/data/nbaMatches.json for the homepage's NBA cards. Kept separate
// from matches.json / leagueMatches.json / cricketMatches.json so the sports
// never clobber each other (same pattern as update_cricket.mjs).
//
// Cost: 3 credits per run (3 markets x 1 region). Only Pinnacle's lines are
// stored — one consistent book keeps the spread/total numbers coherent and
// the JSON small.
//
// This script never exits non-zero: update:all is an `&&` chain and a failure
// here must not stop the rest of the daily update (see the update:ai /
// update:standings incidents in CLAUDE.md). On any fetch problem the existing
// file is left untouched.

const keysStr = process.env.ODDS_API_KEY || '';
const API_KEYS = keysStr.split(',').map((k) => k.trim()).filter((k) => k.length > 0);

const matchesPath = path.resolve('src/data/nbaMatches.json');
const predictionsPath = path.resolve('src/data/matchPredictions.json');
const SPORT_KEY = 'basketball_nba';
const PREFERRED_BOOK = 'pinnacle';

async function fetchWithKeyRotation(urlTemplate) {
  for (let i = 0; i < API_KEYS.length; i++) {
    const url = urlTemplate.replace('{{API_KEY}}', API_KEYS[i]);
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
      console.error('⚠️ Exception during fetch:', e);
      continue;
    }
  }
  console.error('❌ All API keys failed or exhausted.');
  return null;
}

function keepPreferredBook(game) {
  const books = game.bookmakers ?? [];
  const book = books.find((b) => b.key === PREFERRED_BOOK) ?? books[0];
  return { ...game, bookmakers: book ? [book] : [] };
}

async function main() {
  console.log('🏀 Starting NBA odds cache update via The-Odds-API...');

  if (API_KEYS.length === 0) {
    console.warn('⚠️ ODDS_API_KEY is not set — skipping NBA update, keeping existing data.');
    return;
  }

  const data = await fetchWithKeyRotation(
    `https://api.the-odds-api.com/v4/sports/${SPORT_KEY}/odds/?apiKey={{API_KEY}}&regions=eu&markets=h2h,spreads,totals&oddsFormat=decimal`
  );
  if (!Array.isArray(data)) {
    console.warn('⚠️ NBA fetch failed — keeping existing data.');
    return;
  }

  const games = data
    .map(keepPreferredBook)
    .filter((g) => g.bookmakers.length > 0) // games further out have no lines posted yet
    .sort((a, b) => new Date(a.commence_time).getTime() - new Date(b.commence_time).getTime());

  fs.writeFileSync(matchesPath, JSON.stringify(games, null, 2) + '\n');
  console.log(`✅ Saved ${games.length} NBA games to src/data/nbaMatches.json`);

  checkPredictionCoverage(games);
}

// Visible in the daily GitHub Actions log, same idea as the focus-club check in
// update_leagues.mjs. Predictions are hand-written (see CLAUDE.md), so this only
// warns — it never writes anything and never fails the run.
function checkPredictionCoverage(games) {
  let predictions = {};
  try {
    predictions = JSON.parse(fs.readFileSync(predictionsPath, 'utf8'));
  } catch {
    return;
  }
  const horizon = Date.now() + 3 * 24 * 60 * 60 * 1000;
  const missing = games.filter((g) => new Date(g.commence_time).getTime() <= horizon && !(g.id in predictions));
  if (missing.length > 0) {
    console.warn(`⚠️ ${missing.length} NBA game(s) in the next 3 days have no matchPredictions.json entry:`);
    for (const g of missing) console.warn(`   ${g.id}  ${g.away_team} @ ${g.home_team}  (${g.commence_time})`);
  }
}

main().catch((e) => {
  console.error('⚠️ Unexpected error in NBA update — keeping existing data.', e);
});
