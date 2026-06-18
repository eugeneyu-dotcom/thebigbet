import fs from 'fs';
import path from 'path';

const keysStr = process.env.ODDS_API_KEY || '';
const API_KEYS = keysStr.split(',').map(k => k.trim()).filter(k => k.length > 0);

if (API_KEYS.length === 0) {
  console.error("❌ Error: ODDS_API_KEY is not set.");
  process.exit(1);
}

const matchesPath = path.resolve('src/data/matches.json');
const scoresPath = path.resolve('src/data/scores.json');

async function fetchWithKeyRotation(urlTemplate) {
  for (let i = 0; i < API_KEYS.length; i++) {
    const key = API_KEYS[i];
    const url = urlTemplate.replace('{{API_KEY}}', key);
    try {
      const res = await fetch(url);
      if (res.ok) {
        return await res.json();
      }
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
  console.log("⚽️ Starting Match & Score Cache Update via The-Odds-API...");

  const SPORT_KEY = 'soccer_fifa_world_cup';
  
  // Fetch Odds
  console.log("Fetching latest odds...");
  const newMatches = await fetchWithKeyRotation(`https://api.the-odds-api.com/v4/sports/${SPORT_KEY}/odds/?apiKey={{API_KEY}}&regions=eu&markets=h2h`);
  
  if (newMatches) {
    let existingMatches = [];
    if (fs.existsSync(matchesPath)) {
      try {
        existingMatches = JSON.parse(fs.readFileSync(matchesPath, 'utf8'));
      } catch (e) {}
    }

    // Merge logic: Do not overwrite odds if they already exist
    const mergedMatches = newMatches.map(newMatch => {
      const existing = existingMatches.find(m => m.id === newMatch.id);
      if (existing && existing.bookmakers && existing.bookmakers.length > 0) {
        // Keep existing odds
        return { ...newMatch, bookmakers: existing.bookmakers };
      }
      return newMatch;
    });

    fs.writeFileSync(matchesPath, JSON.stringify(mergedMatches, null, 2), 'utf8');
    console.log(`✅ Successfully cached ${mergedMatches.length} matches to matches.json.`);
  }

  // Fetch Scores
  console.log("Fetching latest scores...");
  const newScores = await fetchWithKeyRotation(`https://api.the-odds-api.com/v4/sports/${SPORT_KEY}/scores/?apiKey={{API_KEY}}&daysFrom=3`);
  
  if (newScores) {
    fs.writeFileSync(scoresPath, JSON.stringify(newScores, null, 2), 'utf8');
    console.log(`✅ Successfully cached ${newScores.length} scores to scores.json.`);
  }
}

main();
