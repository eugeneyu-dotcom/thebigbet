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

// Load + filter a matches cache to only fixtures that haven't kicked off yet —
// the cache can still contain recently-finished fixtures for a short window,
// and we never want to write "predicted" language for a result already in.
function loadUpcoming(cachePath) {
  if (!fs.existsSync(cachePath)) return [];
  let matches;
  try {
    matches = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
  } catch (e) {
    return [];
  }
  const now = new Date();
  return matches.filter(m => new Date(m.commence_time) > now);
}

function buildFootballPrompt(match, todayStr) {
  const homeTeam = match.home_team;
  const awayTeam = match.away_team;
  const homeOdds = getOddsString(match.bookmakers, homeTeam);
  const awayOdds = getOddsString(match.bookmakers, awayTeam);
  const drawOdds = getDrawOddsString(match.bookmakers);

  return `
You are a professional sports betting analyst. The current date is ${todayStr}.
Analyze the upcoming 2026 FIFA World Cup match between ${homeTeam} and ${awayTeam}.
Do not assume or imply which match number this is in the tournament for either team (e.g. do not call it an "opener," "tournament debut," or similar) — you do not know each team's match history, so avoid any language that presumes this is their first match or any other specific stage of their campaign.
This is a knockout-stage match — it is single-elimination, not a group-stage match played for league points. Do NOT use group-stage "points" framing (e.g. "secure three points," "全取三分," "穩取三分"). Frame the prediction around winning and advancing instead.
The current betting odds are:
${homeTeam} Win: ${homeOdds}
Draw: ${drawOdds}
${awayTeam} Win: ${awayOdds}

Write a short, engaging betting prediction (around 40-50 words) based on these odds and the teams' general strengths.
Output ONLY a raw JSON object (no markdown, no comments) with this exact structure:
{
  "prediction_zh": "[Traditional Chinese (zh-TW) prediction, strictly NO simplified Chinese. Do not use mainland translations like 波黑 or 爆冷门. Keep it under 50 words.]",
  "prediction_en": "[English prediction, under 50 words.]",
  "prediction_th": "[Thai prediction, under 50 words.]"
}
`;
}

function buildLeaguePrompt(match, todayStr) {
  const homeTeam = match.home_team;
  const awayTeam = match.away_team;
  const homeOdds = getOddsString(match.bookmakers, homeTeam);
  const awayOdds = getOddsString(match.bookmakers, awayTeam);
  const drawOdds = getDrawOddsString(match.bookmakers);
  const league = match.sport_title || 'a top European league';

  return `
You are a professional sports betting analyst. The current date is ${todayStr}.
Analyze the upcoming ${league} match between ${homeTeam} and ${awayTeam}.
This is a domestic league match (not a cup/knockout tie) — normal league-points framing is fine.
The current betting odds are:
${homeTeam} Win: ${homeOdds}
Draw: ${drawOdds}
${awayTeam} Win: ${awayOdds}

Write a short, engaging betting prediction (around 40-50 words) based on these odds and the teams' general strengths.
Output ONLY a raw JSON object (no markdown, no comments) with this exact structure:
{
  "prediction_zh": "[Traditional Chinese (zh-TW) prediction, strictly NO simplified Chinese. Keep it under 50 words.]",
  "prediction_en": "[English prediction, under 50 words.]",
  "prediction_th": "[Thai prediction, under 50 words.]"
}
`;
}

function buildCricketPrompt(match, todayStr) {
  const homeTeam = match.home_team;
  const awayTeam = match.away_team;
  const homeOdds = getOddsString(match.bookmakers, homeTeam);
  const awayOdds = getOddsString(match.bookmakers, awayTeam);
  const league = match.sport_title || 'cricket';

  return `
You are a professional sports betting analyst. The current date is ${todayStr}.
Analyze the upcoming ${league} cricket match between ${homeTeam} and ${awayTeam}.
This is a match-winner (moneyline) market — there is no draw outcome.
The current betting odds are:
${homeTeam} Win: ${homeOdds}
${awayTeam} Win: ${awayOdds}

Write a short, engaging betting prediction (around 40-50 words) based on these odds and the teams' general strengths (batting depth, bowling attack, current form).
Output ONLY a raw JSON object (no markdown, no comments) with this exact structure:
{
  "prediction_zh": "[Traditional Chinese (zh-TW) prediction, strictly NO simplified Chinese. Keep it under 50 words.]",
  "prediction_en": "[English prediction, under 50 words.]",
  "prediction_th": "[Thai prediction, under 50 words.]"
}
`;
}

async function generateForMatches(matches, predictions, buildPrompt, todayStr) {
  for (const match of matches) {
    console.log(`\n🔮 Generating prediction for ${match.home_team} vs ${match.away_team}...`);
    const prompt = buildPrompt(match, todayStr);

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
}

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
    const footballMatches = loadUpcoming(path.resolve('src/data/matches.json'));
    const leagueMatches = loadUpcoming(path.resolve('src/data/leagueMatches.json'));
    const cricketMatches = loadUpcoming(path.resolve('src/data/cricketMatches.json'));

    if (footballMatches.length === 0 && leagueMatches.length === 0 && cricketMatches.length === 0) {
      console.error("⚠️ No upcoming matches found in matches.json, leagueMatches.json or cricketMatches.json.");
    }

    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    await generateForMatches(footballMatches, predictions, buildFootballPrompt, todayStr);
    await generateForMatches(leagueMatches, predictions, buildLeaguePrompt, todayStr);
    await generateForMatches(cricketMatches, predictions, buildCricketPrompt, todayStr);

    fs.writeFileSync(predictionsPath, JSON.stringify(predictions, null, 2), 'utf8');
    console.log("\n💾 Predictions successfully updated and saved to matchPredictions.json!");

  } catch (e) {
    console.error(`⚠️ Exception during predictions update:`, e);
  }
}

main();
