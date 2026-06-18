import fs from 'fs';
import path from 'path';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const ODDS_API_KEY = process.env.ODDS_API_KEY;

if (!GEMINI_API_KEY || !ODDS_API_KEY) {
  console.error("❌ Error: GEMINI_API_KEY or ODDS_API_KEY is not set.");
  process.exit(1);
}

const predictionsPath = path.resolve('src/data/matchPredictions.json');

// Helper to extract odds
const getOddsString = (bookmakers, teamName) => {
  if (!bookmakers || bookmakers.length === 0) return "TBD";
  const market = bookmakers[0].markets.find(m => m.key === 'h2h');
  if (!market) return "TBD";
  const outcome = market.outcomes.find(o => o.name === teamName);
  return outcome ? outcome.price : "TBD";
};

const getDrawOddsString = (bookmakers) => {
  if (!bookmakers || bookmakers.length === 0) return "TBD";
  const market = bookmakers[0].markets.find(m => m.key === 'h2h');
  if (!market) return "TBD";
  const outcome = market.outcomes.find(o => o.name === 'Draw');
  return outcome ? outcome.price : "TBD";
};

async function main() {
  console.log("💡 Starting Daily Match Predictions Update via Gemini...");

  // Load existing predictions if any
  let predictions = {};
  if (fs.existsSync(predictionsPath)) {
    try {
      predictions = JSON.parse(fs.readFileSync(predictionsPath, 'utf8'));
    } catch (e) {}
  }

  try {
    // 1. Load odds from local cache to avoid wasting API quota
    const matchesPath = path.resolve('src/data/matches.json');
    if (!fs.existsSync(matchesPath)) {
      console.error("⚠️ matches.json not found. Run update:matches first.");
      process.exit(1);
    }

    let matches = JSON.parse(fs.readFileSync(matchesPath, 'utf8'));
    
    for (const match of matches) {
      const homeTeam = match.home_team;
      const awayTeam = match.away_team;
      const homeOdds = getOddsString(match.bookmakers, homeTeam);
      const awayOdds = getOddsString(match.bookmakers, awayTeam);
      const drawOdds = getDrawOddsString(match.bookmakers);

      console.log(`\n🔮 Generating prediction for ${homeTeam} vs ${awayTeam}...`);

      const prompt = `
You are a professional sports betting analyst. The current date is June 15, 2026.
Analyze the upcoming 2026 FIFA World Cup match between ${homeTeam} and ${awayTeam}.
The current betting odds are:
${homeTeam} Win: ${homeOdds}
Draw: ${drawOdds}
${awayTeam} Win: ${awayOdds}

Write a short, engaging betting prediction (around 40-50 words) based on these odds and the teams' general strengths.
Output ONLY a raw JSON object (no markdown, no comments) with this exact structure:
{
  "prediction_zh": "[Traditional Chinese (zh-TW) prediction, strictly NO simplified Chinese. Do not use mainland translations like 波黑 or 爆冷门. Keep it under 50 words.]",
  "prediction_en": "[English prediction, under 50 words.]"
}
`;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.4 }
        })
      });

      if (!response.ok) {
        console.error(`⚠️ Failed to fetch prediction for ${match.id}. Status: ${response.status}`);
        continue;
      }

      const resJson = await response.json();
      let aiText = resJson?.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (aiText) {
        aiText = aiText.replace(/```json/g, '').replace(/```/g, '').trim();
        const pred = JSON.parse(aiText);
        predictions[match.id] = pred;
        console.log(`✅ Success: ${pred.prediction_zh}`);
      }

      // Delay to respect free tier rate limits
      await new Promise(r => setTimeout(r, 4000));
    }

    fs.writeFileSync(predictionsPath, JSON.stringify(predictions, null, 2), 'utf8');
    console.log("\n💾 Predictions successfully updated and saved to matchPredictions.json!");

  } catch (e) {
    console.error(`⚠️ Exception during predictions update:`, e);
  }
}

main();
