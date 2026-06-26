import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';

const csvPath = path.resolve('EXPERT_PREDICTIONS.csv');
const jsonPath = path.resolve('src/data/humanPredictions.json');

async function main() {
  console.log("📝 Generating/Updating Expert Predictions CSV...");

  // Merge predictions from both JSON and CSV so neither source can cause data loss.
  // JSON is loaded first (represents last committed state), then CSV overlays it
  // (CSV takes priority since it reflects the latest manual edits).
  let existingPredictions = {};

  if (fs.existsSync(jsonPath)) {
    try {
      const jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
      Object.entries(jsonData).forEach(([id, pred]) => {
        if (pred.prediction_zh?.trim() || pred.prediction_en?.trim()) {
          existingPredictions[id] = pred;
        }
      });
    } catch (e) {}
  }

  if (fs.existsSync(csvPath)) {
    const fileContent = fs.readFileSync(csvPath, 'utf8');
    const records = parse(fileContent, { columns: true, skip_empty_lines: true });
    records.forEach(row => {
      const zh = row.Prediction_ZH?.trim();
      const en = row.Prediction_EN?.trim();
      if (!zh && !en) return;
      // Merge field-by-field rather than replacing the whole entry — a CSV
      // row with only one language filled in must not wipe out a good
      // translation already on file for the other language.
      const existing = existingPredictions[row.Match_ID] || {};
      existingPredictions[row.Match_ID] = {
        prediction_zh: zh || existing.prediction_zh || '',
        prediction_en: en || existing.prediction_en || ''
      };
    });
  }

  // Load matches from local cache (populated by update:matches)
  const matchesPath = path.resolve('src/data/matches.json');
  if (!fs.existsSync(matchesPath)) {
    console.error("⚠️ matches.json not found. Run npm run update:matches first.");
    process.exit(1);
  }
  const matches = JSON.parse(fs.readFileSync(matchesPath, 'utf8'));
  
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
