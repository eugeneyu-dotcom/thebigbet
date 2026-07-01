import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';

const csvPath = path.resolve('EXPERT_PREDICTIONS.csv');
const jsonPath = path.resolve('src/data/humanPredictions.json');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

async function translateToEnglish(chineseText) {
  if (!GEMINI_API_KEY) {
    console.warn("⚠️ GEMINI_API_KEY not found. Skipping auto-translation.");
    return "";
  }

  const prompt = `Translate the following sports betting prediction from Traditional Chinese to professional, engaging English. Return ONLY the English translation without any quotes or markdown.\n\nText: ${chineseText}`;

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2 }
      })
    });

    if (response.ok) {
      const resJson = await response.json();
      const text = resJson?.candidates?.[0]?.content?.parts?.[0]?.text;
      return text ? text.trim() : "";
    }
  } catch (e) {
    console.error("Translation error:", e);
  }
  return "";
}

async function main() {
  console.log("🔄 Syncing Expert Predictions from CSV to JSON...");

  if (!fs.existsSync(csvPath)) {
    console.log("⚠️ EXPERT_PREDICTIONS.csv not found. Skipping sync.");
    return;
  }

  try {
    // Load the existing JSON first — it's the fallback for any field the
    // CSV leaves blank, so a CSV row with only one language filled in can
    // never wipe out a good translation already on file for the other.
    let existingPredictions = {};
    if (fs.existsSync(jsonPath)) {
      try {
        existingPredictions = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
      } catch (e) {}
    }

    const fileContent = fs.readFileSync(csvPath, 'utf8');
    const records = parse(fileContent, { columns: true, skip_empty_lines: true });

    const predictions = {};
    let needsCsvUpdate = false;

    for (const row of records) {
      const zh = row.Prediction_ZH?.trim();
      let en = row.Prediction_EN?.trim();
      const existing = existingPredictions[row.Match_ID] || {};

      if (zh || en || existing.prediction_zh || existing.prediction_en) {
        // Auto translate if ZH is provided but EN is empty, and there's no
        // existing English translation to fall back on either.
        if (zh && !en && !existing.prediction_en) {
          console.log(`🌍 Translating prediction for match ${row.Match_ID} to English...`);
          en = await translateToEnglish(zh);
          row.Prediction_EN = en;
          needsCsvUpdate = true;
          // small delay to respect API limits
          await new Promise(r => setTimeout(r, 1000));
        }

        predictions[row.Match_ID] = {
          prediction_zh: zh || existing.prediction_zh || '',
          prediction_en: en || existing.prediction_en || ''
        };
      }
    }

    // Merge: keep any existing JSON entries that have content but weren't in
    // the CSV (e.g. completed matches that have since been dropped from the
    // Odds API feed). CSV entries take priority when both are present.
    const merged = { ...existingPredictions };
    for (const [id, pred] of Object.entries(predictions)) {
      merged[id] = pred;
    }

    // Write to JSON
    fs.writeFileSync(jsonPath, JSON.stringify(merged, null, 2), 'utf8');
    console.log(`✅ Successfully synced ${Object.keys(merged).length} predictions to humanPredictions.json!`);

    // If we auto-translated anything, overwrite the CSV to keep it updated for the expert
    if (needsCsvUpdate) {
      const csvOutput = stringify(records, { header: true });
      fs.writeFileSync(csvPath, csvOutput, 'utf8');
      console.log(`✅ EXPERT_PREDICTIONS.csv has been updated with automatic English translations.`);
    }

  } catch (e) {
    console.error("❌ Error parsing CSV file:", e);
    process.exit(1);
  }
}

main();
