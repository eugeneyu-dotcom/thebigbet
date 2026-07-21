import fs from 'fs';
import path from 'path';

// Fetch MLB (baseball) moneyline odds from The Odds API and cache them to
// src/data/mlbMatches.json. Kept separate from the football matches.json so the
// two sports never clobber each other. Mirrors update_matches.mjs.

const keysStr = process.env.ODDS_API_KEY || '';
const API_KEYS = keysStr.split(',').map(k => k.trim()).filter(k => k.length > 0);

if (API_KEYS.length === 0) {
  console.error("❌ Error: ODDS_API_KEY is not set.");
  process.exit(1);
}

const matchesPath = path.resolve('src/data/mlbMatches.json');

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
  console.log("⚾️ Starting MLB odds cache update via The-Odds-API...");

  const SPORT_KEY = 'baseball_mlb';
  console.log("Fetching latest MLB moneyline odds...");
  const newMatches = await fetchWithKeyRotation(`https://api.the-odds-api.com/v4/sports/${SPORT_KEY}/odds/?apiKey={{API_KEY}}&regions=us&markets=h2h`);

  if (newMatches) {
    let existingMatches = [];
    if (fs.existsSync(matchesPath)) {
      try { existingMatches = JSON.parse(fs.readFileSync(matchesPath, 'utf8')); } catch (e) {}
    }
    // Keep existing odds if already cached for a match (don't overwrite once set).
    const merged = newMatches.map(nm => {
      const existing = existingMatches.find(m => m.id === nm.id);
      if (existing && existing.bookmakers && existing.bookmakers.length > 0) {
        return { ...nm, bookmakers: existing.bookmakers };
      }
      return nm;
    });
    fs.writeFileSync(matchesPath, JSON.stringify(merged, null, 2), 'utf8');
    console.log(`✅ Successfully cached ${merged.length} MLB matches to mlbMatches.json.`);
  } else {
    // Ensure the file exists (empty) so the site builds even with no data yet.
    if (!fs.existsSync(matchesPath)) {
      fs.writeFileSync(matchesPath, '[]', 'utf8');
      console.log("ℹ️ No data returned; wrote empty mlbMatches.json.");
    }
  }
}

main();
