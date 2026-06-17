import fs from 'fs';
import path from 'path';

// Retrieve the API key from the environment.
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  console.error("❌ Error: GEMINI_API_KEY is not set in the environment.");
  process.exit(1);
}

const dbPath = path.resolve('src/data/aiTeamBaseline.json');
const standingsPath = path.resolve('src/data/worldCupStandings.json');

async function main() {
  console.log("⚽️ Starting Daily AI Stats Update via Gemini...");

  // Load current database
  if (!fs.existsSync(dbPath)) {
    console.error(`❌ Error: Database not found at ${dbPath}`);
    process.exit(1);
  }
  const dbStr = fs.readFileSync(dbPath, 'utf8');
  let db;
  try {
    db = JSON.parse(dbStr);
  } catch (e) {
    console.error("❌ Error parsing JSON database.", e);
    process.exit(1);
  }

  // Load all 48 teams
  const standingsStr = fs.readFileSync(standingsPath, 'utf8');
  const standings = JSON.parse(standingsStr);
  const allTeams = standings.flatMap(group => group.teams.map(t => t.name));

  // Chunk teams into batches of 2 to avoid huge outputs and timeouts
  const chunkSize = 2;
  for (let i = 0; i < allTeams.length; i += chunkSize) {
    const chunk = allTeams.slice(i, i + chunkSize);
    console.log(`\n🔍 Analyzing batch ${Math.floor(i / chunkSize) + 1} of ${Math.ceil(allTeams.length / chunkSize)}: ${chunk.join(', ')}...`);

    const prompt = `
You are a top-tier FIFA World Cup expert analyst. The current date is June 15, 2026. The 2026 FIFA World Cup has just started.
Evaluate the following national football teams based on their real-world current performances, international news, club form, and specifically their latest 2026 World Cup match results.
To ensure absolute factual accuracy, here is the CURRENT official World Cup Standings JSON data:
${standingsStr}

CRITICAL RULES FOR EVALUATION AND REASONING TEXT:
1. "reason_zh" MUST BE STRICTLY IN TRADITIONAL CHINESE (zh-TW, 繁體中文). ABSOLUTELY NO Simplified Chinese. Do NOT use words like "显示", "纪律性", "进攻". Use "顯示", "紀律性", "進攻".
2. DO NOT use mainland Chinese sports translations. For example, use "波士尼亞" instead of "波黑", "克羅埃西亞" instead of "克罗地亚", "沙烏地阿拉伯" instead of "沙特".
3. ONLY cite real match results exactly as they appear in the Standings JSON provided above. For example, if "w" is 0, "d" is 1, "l" is 0, it means they drew. DO NOT hallucinate a win or a clean sheet if they didn't have one.
4. **WEIGHTING ALGORITHM**: Calculate scores using a weighted system: 70% based on historical prestige, overall player value, and pre-tournament baseline form, and 30% based on recent 2026 World Cup match results from the JSON. DO NOT overreact to a single match. If a top team loses 1 match, drop their score slightly (e.g., -0.2), do not drop it drastically.
5. In your reason text, briefly mention this weighting (e.g. "儘管首戰失利，但考量其歷史底蘊與高昂身價，綜合評分僅微幅下修").
6. Keep the reason text concise and under 40 words per dimension.

Teams to evaluate: ${chunk.join(', ')}

Output ONLY a raw JSON object (no markdown formatting, no backticks, no comments) where the keys are the exact team names in English, and the values are their stats objects. 
Structure for each team:
{
  "atk": { "score": [float 1.0-10.0], "trend": "[+, -, or =]", "reason_zh": "[Detailed Traditional Chinese reason strictly based on facts]", "reason_en": "[Detailed English reason]" },
  "def": { "score": [float 1.0-10.0], "trend": "[+, -, or =]", "reason_zh": "[Detailed Traditional Chinese reason strictly based on facts]", "reason_en": "[Detailed English reason]" },
  "pos": { "score": [float 1.0-10.0], "trend": "[+, -, or =]", "reason_zh": "[Detailed Traditional Chinese reason strictly based on facts]", "reason_en": "[Detailed English reason]" },
  "dis": { "score": [float 1.0-10.0], "trend": "[+, -, or =]", "reason_zh": "[Detailed Traditional Chinese reason strictly based on facts]", "reason_en": "[Detailed English reason]" },
  "frm": { "score": [float 1.0-10.0], "trend": "[+, -, or =]", "reason_zh": "[Detailed Traditional Chinese reason strictly based on facts]", "reason_en": "[Detailed English reason]" }
}
`;

    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          tools: [{ googleSearch: {} }],
          generationConfig: { temperature: 0.3 }
        })
      });

      if (!response.ok) {
        console.error(`⚠️ Failed to fetch data for batch. Status: ${response.status}`);
        continue;
      }

      const resJson = await response.json();
      let aiText = resJson?.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (aiText) {
        // Clean up markdown block if present
        aiText = aiText.replace(/```json/g, '').replace(/```/g, '').trim();
        const updatedStats = JSON.parse(aiText);
        
        // Update database
        for (const [team, stats] of Object.entries(updatedStats)) {
          if (allTeams.includes(team)) {
            db[team] = stats;
          }
        }
        console.log(`✅ Successfully updated stats for batch.`);
      } else {
        console.error(`⚠️ Unexpected response format for batch.`);
      }

    } catch (e) {
      console.error(`⚠️ Exception during update for batch:`, e);
    }

    // Delay to respect free tier rate limits (15 RPM -> 4 seconds per request minimum)
    console.log("Waiting 5 seconds for rate limit...");
    await new Promise(r => setTimeout(r, 5000));
  }

  // Write updated DB back to file
  fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf8');
  console.log("\n💾 Database successfully updated and saved to aiTeamBaseline.json!");
}

main();
