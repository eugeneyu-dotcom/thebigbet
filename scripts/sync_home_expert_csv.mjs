import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';

// Separate from sync_expert_csv.mjs (World-Cup-only) — this syncs the
// cricket + football homepage prediction widget's own CSV/JSON pair.
const csvPath = path.resolve('HOME_EXPERT_PREDICTIONS.csv');
const jsonPath = path.resolve('src/data/homeHumanPredictions.json');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

async function translate(text, targetLangLabel) {
  if (!GEMINI_API_KEY) {
    console.warn(`⚠️ GEMINI_API_KEY not found. Skipping auto-translation to ${targetLangLabel}.`);
    return "";
  }

  const prompt = `Translate the following sports betting prediction from Traditional Chinese to professional, engaging ${targetLangLabel}. Return ONLY the translation without any quotes or markdown.\n\nText: ${text}`;

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
  console.log("🔄 Syncing Home Expert Predictions from CSV to JSON...");

  if (!fs.existsSync(csvPath)) {
    console.log("⚠️ HOME_EXPERT_PREDICTIONS.csv not found. Skipping sync.");
    return;
  }

  try {
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
      let th = row.Prediction_TH?.trim();
      const existing = existingPredictions[row.Match_ID] || {};

      if (!zh && !en && !th && !existing.prediction_zh && !existing.prediction_en && !existing.prediction_th) continue;

      // Auto-translate whichever languages are blank, using ZH as the source.
      if (zh && !en && !existing.prediction_en) {
        console.log(`🌍 Translating prediction for match ${row.Match_ID} to English...`);
        en = await translate(zh, 'English');
        row.Prediction_EN = en;
        needsCsvUpdate = true;
        await new Promise(r => setTimeout(r, 1000));
      }
      if (zh && !th && !existing.prediction_th) {
        console.log(`🌍 Translating prediction for match ${row.Match_ID} to Thai...`);
        th = await translate(zh, 'Thai');
        row.Prediction_TH = th;
        needsCsvUpdate = true;
        await new Promise(r => setTimeout(r, 1000));
      }

      predictions[row.Match_ID] = {
        prediction_zh: zh || existing.prediction_zh || '',
        prediction_en: en || existing.prediction_en || '',
        prediction_th: th || existing.prediction_th || ''
      };
    }

    // Merge: keep any existing JSON entries that have content but weren't in
    // the CSV (e.g. completed matches dropped from the odds feed).
    const merged = { ...existingPredictions };
    for (const [id, pred] of Object.entries(predictions)) {
      merged[id] = pred;
    }

    fs.writeFileSync(jsonPath, JSON.stringify(merged, null, 2), 'utf8');
    console.log(`✅ Successfully synced ${Object.keys(merged).length} predictions to homeHumanPredictions.json!`);

    if (needsCsvUpdate) {
      const csvOutput = stringify(records, { header: true });
      fs.writeFileSync(csvPath, csvOutput, 'utf8');
      console.log(`✅ HOME_EXPERT_PREDICTIONS.csv has been updated with automatic translations.`);
    }

  } catch (e) {
    console.error("❌ Error parsing CSV file:", e);
    process.exit(1);
  }
}

main();
