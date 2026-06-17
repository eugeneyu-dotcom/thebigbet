import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';

const csvPath = path.resolve('EXPERT_PREDICTIONS.csv');
const jsonPath = path.resolve('src/data/humanPredictions.json');

function main() {
  console.log("🔄 Syncing Expert Predictions from CSV to JSON...");

  if (!fs.existsSync(csvPath)) {
    console.log("⚠️ EXPERT_PREDICTIONS.csv not found. Skipping sync.");
    return;
  }

  try {
    const fileContent = fs.readFileSync(csvPath, 'utf8');
    const records = parse(fileContent, { columns: true, skip_empty_lines: true });
    
    const predictions = {};
    
    records.forEach(row => {
      // Only sync if there is actually some text filled in
      if (row.Prediction_ZH?.trim() || row.Prediction_EN?.trim()) {
        predictions[row.Match_ID] = {
          prediction_zh: row.Prediction_ZH.trim(),
          prediction_en: row.Prediction_EN.trim()
        };
      }
    });

    fs.writeFileSync(jsonPath, JSON.stringify(predictions, null, 2), 'utf8');
    console.log(`✅ Successfully synced ${Object.keys(predictions).length} predictions to humanPredictions.json!`);
  } catch (e) {
    console.error("❌ Error parsing CSV file:", e);
    process.exit(1);
  }
}

main();
