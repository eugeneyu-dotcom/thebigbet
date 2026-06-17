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

        // Determine status
        // Since WC 2026 format: 1st and 2nd advance. Some 3rd place teams also advance.
        // For simplicity in group stage representation:
        // Assume qualified if points are very high or mp == 3 and top 2.
        // Currently, without official API status flags, we'll assign "active"
        // unless mathematical certainty is reached (which is complex). 
        // For visual purposes, we'll mark them active, and let a future phase calculate status.
        let status = "active";
        
        // As a very basic placeholder for demonstration (this can be improved):
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
          status: status
        };
      });

      formattedStandings.push({
        group: groupName,
        teams: teams
      });
    }

    fs.writeFileSync(standingsPath, JSON.stringify(formattedStandings, null, 2), 'utf8');
    console.log(`✅ Successfully updated worldCupStandings.json with ${formattedStandings.length} groups.`);

  } catch (e) {
    console.error(`⚠️ Exception during standings update:`, e);
  }
}

main();
