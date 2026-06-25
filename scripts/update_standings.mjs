import fs from 'fs';
import path from 'path';

// Retrieve the API key from the environment.
const FOOTBALL_DATA_ORG_TOKEN = process.env.FOOTBALL_DATA_ORG_TOKEN;

if (!FOOTBALL_DATA_ORG_TOKEN) {
  console.error("❌ Error: FOOTBALL_DATA_ORG_TOKEN is not set in the environment.");
  process.exit(1);
}

const standingsPath = path.resolve('src/data/worldCupStandings.json');

// Mapping dictionary to align football-data.org names with The-Odds-API / UI dictionary names
const teamNameMap = {
  "United States": "USA",
  "Korea Republic": "South Korea",
  "Czechia": "Czech Republic",
  "Bosnia-Herzegovina": "Bosnia & Herzegovina",
  "Congo DR": "DR Congo",
  "Cape Verde Islands": "Cape Verde"
};

async function main() {
  console.log("🏆 Starting Daily World Cup Standings Update via Football-Data.org...");

  try {
    // Competition 2000 is FIFA World Cup
    const response = await fetch("https://api.football-data.org/v4/competitions/WC/standings", {
      method: "GET",
      headers: {
        "X-Auth-Token": FOOTBALL_DATA_ORG_TOKEN
      }
    });

    if (!response.ok) {
      console.error(`⚠️ Failed to fetch standings from football-data.org. Status: ${response.status}`);
      process.exit(1);
    }

    const data = await response.json();
    
    if (!data.standings || data.standings.length === 0) {
      console.log("⚠️ No standings data found. Using fallback/empty state.");
      process.exit(0);
    }

    const formattedStandings = [];

    // football-data.org returns an array of groups in data.standings
    for (const group of data.standings) {
      // Only process TOTAL standings (ignore HOME/AWAY partials if any)
      if (group.type !== "TOTAL") continue;
      
      const groupName = group.group; // e.g. "Group A"
      if (!groupName) continue;
      
      const teams = group.table.map(teamInfo => {
        let name = teamInfo.team.name;
        // Apply name mapping if necessary
        if (teamNameMap[name]) {
          name = teamNameMap[name];
        }

        // 1st/2nd auto-qualify, 4th is eliminated, once the group's 3 matches are done.
        // 3rd place is left "active" here — its fate depends on the best-8-of-12
        // third-place ranking across ALL groups, resolved in the cross-group pass below.
        let status = "active";

        if (teamInfo.playedGames === 3) {
          if (teamInfo.position <= 2) status = "qualified";
          else if (teamInfo.position === 4) status = "eliminated";
        }

        return {
          name: name,
          mp: teamInfo.playedGames,
          w: teamInfo.won,
          d: teamInfo.draw,
          l: teamInfo.lost,
          gf: teamInfo.goalsFor,
          ga: teamInfo.goalsAgainst,
          gd: teamInfo.goalDifference,
          pts: teamInfo.points,
          position: teamInfo.position,
          status: status
        };
      });

      formattedStandings.push({
        group: groupName,
        teams: teams
      });
    }

    // Best-8-of-12 third place ranking: only resolvable once every group has
    // finished all 3 matches. Until then, 3rd place teams stay "active".
    const allGroupsFinished = formattedStandings.every(g =>
      g.teams.every(t => t.mp === 3)
    );

    if (allGroupsFinished) {
      const thirdPlaceTeams = formattedStandings
        .map(g => g.teams.find(t => t.position === 3))
        .filter(Boolean)
        .sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf);

      thirdPlaceTeams.forEach((team, idx) => {
        team.status = idx < 8 ? "qualified" : "eliminated";
      });
    }

    // Strip the internal `position` field before writing — not part of the UI schema.
    formattedStandings.forEach(g => g.teams.forEach(t => delete t.position));

    fs.writeFileSync(standingsPath, JSON.stringify(formattedStandings, null, 2), 'utf8');
    console.log(`✅ Successfully updated worldCupStandings.json with ${formattedStandings.length} groups.`);

  } catch (e) {
    console.error(`⚠️ Exception during standings update:`, e);
  }
}

main();
