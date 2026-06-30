import fs from 'fs';
import path from 'path';

const FOOTBALL_DATA_ORG_TOKEN = process.env.FOOTBALL_DATA_ORG_TOKEN;

if (!FOOTBALL_DATA_ORG_TOKEN) {
  console.error("❌ Error: FOOTBALL_DATA_ORG_TOKEN is not set in the environment.");
  process.exit(1);
}

const outputPath = path.resolve('src/data/knockoutResults.json');

// Same mapping used by update_standings.mjs to align football-data.org names
// with the names used across the rest of the site.
const teamNameMap = {
  "United States": "USA",
  "Korea Republic": "South Korea",
  "Czechia": "Czech Republic",
  "Bosnia-Herzegovina": "Bosnia & Herzegovina",
  "Congo DR": "DR Congo",
  "Cape Verde Islands": "Cape Verde"
};

const mapName = (name) => teamNameMap[name] || name;

async function main() {
  console.log("🏆 Fetching knockout-stage bracket results from Football-Data.org...");

  try {
    const response = await fetch("https://api.football-data.org/v4/competitions/WC/matches", {
      headers: { "X-Auth-Token": FOOTBALL_DATA_ORG_TOKEN }
    });

    if (!response.ok) {
      console.error(`⚠️ Failed to fetch matches from football-data.org. Status: ${response.status}`);
      process.exit(1);
    }

    const data = await response.json();
    const knockoutMatches = (data.matches || []).filter(m => m.stage !== "GROUP_STAGE");

    // Once both teams in a fixture are known, football-data.org fills them
    // in even before kickoff (e.g. the R32 draw is published in full once
    // the group stage and wildcard slots are settled, and later rounds get
    // filled in progressively as earlier matches conclude). homeTeam/awayTeam
    // are null until that team is confirmed.
    const results = knockoutMatches
      .filter(m => m.homeTeam?.name && m.awayTeam?.name)
      .map(m => {
        const homeTeam = mapName(m.homeTeam.name);
        const awayTeam = mapName(m.awayTeam.name);
        let winner = null;
        if (m.status === "FINISHED" && m.score?.winner) {
          winner = m.score.winner === "HOME_TEAM" ? homeTeam
            : m.score.winner === "AWAY_TEAM" ? awayTeam
            : null; // knockout matches always have a winner once finished, but guard anyway
        }
        return { stage: m.stage, homeTeam, awayTeam, status: m.status, winner };
      });

    fs.writeFileSync(outputPath, JSON.stringify(results, null, 2), 'utf8');
    console.log(`✅ Successfully wrote ${results.length} knockout-stage fixtures to knockoutResults.json.`);

  } catch (e) {
    console.error(`⚠️ Exception during bracket results update:`, e);
  }
}

main();
