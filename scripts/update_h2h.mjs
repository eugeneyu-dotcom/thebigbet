import fs from 'fs';
import path from 'path';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  console.error("❌ Error: GEMINI_API_KEY is not set.");
  process.exit(1);
}

const matchesPath = path.resolve('src/data/matches.json');
const h2hPath = path.resolve('src/data/h2hData.json');

async function main() {
  console.log("📊 Starting H2H History Update via Gemini + Google Search...");

  if (!fs.existsSync(matchesPath)) {
    console.error("⚠️ matches.json not found. Run npm run update:matches first.");
    process.exit(1);
  }

  const matches = JSON.parse(fs.readFileSync(matchesPath, 'utf8'));

  // Load existing H2H data to avoid redundant API calls
  let h2hData = {};
  if (fs.existsSync(h2hPath)) {
    try { h2hData = JSON.parse(fs.readFileSync(h2hPath, 'utf8')); } catch (e) {}
  }

  for (const match of matches) {
    const matchKey = `${match.home_team} vs ${match.away_team}`;

    if (h2hData[matchKey] && h2hData[matchKey].some(v => v > 0)) {
      console.log(`✓ Skipping ${matchKey} (data already exists)`);
      continue;
    }

    console.log(`\n🔍 Fetching H2H history: ${matchKey}...`);

    const prompt = `Search for the all-time head-to-head record between the ${match.home_team} and ${match.away_team} national football (soccer) teams in all official FIFA matches (World Cup, qualifiers, continental tournaments, friendlies).

Report the total across all-time history:
- How many times ${match.home_team} has won
- How many matches ended in a draw  
- How many times ${match.away_team} has won

Output ONLY a raw JSON array with exactly 3 integers: [homeWins, draws, awayWins]
Example: [5, 3, 2]
No markdown, no explanation, no backticks.`;

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.1 }
          })
        }
      );

      if (!response.ok) {
        console.error(`⚠️ API error for ${matchKey}: ${response.status}`);
        continue;
      }

      const resJson = await response.json();
      let aiText = resJson?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (aiText) {
        aiText = aiText.replace(/```json/g, '').replace(/```/g, '').trim();
        const result = JSON.parse(aiText);
        if (Array.isArray(result) && result.length === 3 && result.every(v => typeof v === 'number')) {
          h2hData[matchKey] = result;
          console.log(`✅ ${matchKey}: ${match.home_team} ${result[0]}W - ${result[1]}D - ${result[2]}W ${match.away_team}`);
        } else {
          console.error(`⚠️ Unexpected format for ${matchKey}:`, aiText);
        }
      }
    } catch (e) {
      console.error(`⚠️ Exception for ${matchKey}:`, e);
    }

    await new Promise(r => setTimeout(r, 3000));
  }

  fs.writeFileSync(h2hPath, JSON.stringify(h2hData, null, 2), 'utf8');
  console.log("\n💾 H2H data saved to src/data/h2hData.json!");
}

main();
