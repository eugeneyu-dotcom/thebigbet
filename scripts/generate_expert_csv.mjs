import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';

const ODDS_API_KEY = process.env.ODDS_API_KEY;

if (!ODDS_API_KEY) {
  console.error("❌ Error: ODDS_API_KEY is not set.");
  process.exit(1);
}

const csvPath = path.resolve('EXPERT_PREDICTIONS.csv');
const jsonPath = path.resolve('src/data/humanPredictions.json');

async function main() {
  console.log("📝 Generating/Updating Expert Predictions CSV...");

  // Load existing predictions from CSV if it exists
  let existingPredictions = {};
  if (fs.existsSync(csvPath)) {
    const fileContent = fs.readFileSync(csvPath, 'utf8');
    const records = parse(fileContent, { columns: true, skip_empty_lines: true });
    records.forEach(row => {
      // Keep existing predictions if they are not empty
      if (row.Prediction_ZH?.trim() || row.Prediction_EN?.trim()) {
        existingPredictions[row.Match_ID] = {
          prediction_zh: row.Prediction_ZH,
          prediction_en: row.Prediction_EN
        };
      }
    });
  } else if (fs.existsSync(jsonPath)) {
    // Fallback: load from JSON if CSV doesn't exist yet
    try {
      existingPredictions = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    } catch (e) {}
  }

  // Fetch upcoming matches
  const SPORT_KEY = 'soccer_fifa_world_cup';
  const response = await fetch(`https://api.the-odds-api.com/v4/sports/${SPORT_KEY}/odds/?apiKey=${ODDS_API_KEY}&regions=eu&markets=h2h`);
  
  if (!response.ok) {
    console.error(`⚠️ Failed to fetch matches for CSV generation. Status: ${response.status}`);
    process.exit(1);
  }
  
  const matches = await response.json();
  
  // Create CSV records
  const csvRecords = matches.map(match => {
    const matchTime = new Date(match.commence_time).toLocaleString();
    const existing = existingPredictions[match.id] || {};
    
    return {
      Match_ID: match.id,
      Home_Team: match.home_team,
      Away_Team: match.away_team,
      Match_Time: matchTime,
      Prediction_ZH: existing.prediction_zh || '',
      Prediction_EN: existing.prediction_en || ''
    };
  });

  // Stringify and write to file
  const csvOutput = stringify(csvRecords, { header: true });
  fs.writeFileSync(csvPath, csvOutput, 'utf8');
  
  // Also sync it immediately to JSON just to be safe
  fs.writeFileSync(jsonPath, JSON.stringify(existingPredictions, null, 2), 'utf8');

  console.log(`✅ Successfully generated EXPERT_PREDICTIONS.csv with ${matches.length} matches!`);
}

main();
