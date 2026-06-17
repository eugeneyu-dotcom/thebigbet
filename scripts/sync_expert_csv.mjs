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
    const fileContent = fs.readFileSync(csvPath, 'utf8');
    const records = parse(fileContent, { columns: true, skip_empty_lines: true });
    
    const predictions = {};
    let needsCsvUpdate = false;

    for (const row of records) {
      const zh = row.Prediction_ZH?.trim();
      let en = row.Prediction_EN?.trim();

      if (zh || en) {
        // Auto translate if ZH is provided but EN is empty
        if (zh && !en) {
          console.log(`🌍 Translating prediction for match ${row.Match_ID} to English...`);
          en = await translateToEnglish(zh);
          row.Prediction_EN = en;
          needsCsvUpdate = true;
          // small delay to respect API limits
          await new Promise(r => setTimeout(r, 1000));
        }

        predictions[row.Match_ID] = {
          prediction_zh: zh,
          prediction_en: en
        };
      }
    }

    // Write to JSON
    fs.writeFileSync(jsonPath, JSON.stringify(predictions, null, 2), 'utf8');
    console.log(`✅ Successfully synced ${Object.keys(predictions).length} predictions to humanPredictions.json!`);

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
