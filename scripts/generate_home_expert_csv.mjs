import fs from 'fs';
import path from 'path';
import { stringify } from 'csv-stringify/sync';
import { parse } from 'csv-parse/sync';

// Homepage expert predictions span both cricket and football (World Cup)
// matches, and are intentionally kept separate from EXPERT_PREDICTIONS.csv /
// humanPredictions.json — that file is the World-Cup-article-only pipeline
// and must not be touched by this one.
const csvPath = path.resolve('HOME_EXPERT_PREDICTIONS.csv');
const jsonPath = path.resolve('src/data/homeHumanPredictions.json');

async function main() {
  console.log("📝 Generating/Updating Home Expert Predictions CSV...");

  // Merge predictions from both JSON and CSV so neither source can cause data loss.
  let existingPredictions = {};

  if (fs.existsSync(jsonPath)) {
    try {
      const jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
      Object.entries(jsonData).forEach(([id, pred]) => {
        if (pred.prediction_zh?.trim() || pred.prediction_en?.trim() || pred.prediction_th?.trim()) {
          existingPredictions[id] = pred;
        }
      });
    } catch (e) {}
  }

  if (fs.existsSync(csvPath)) {
    const fileContent = fs.readFileSync(csvPath, 'utf8');
    const records = parse(fileContent, { columns: true, skip_empty_lines: true });
    records.forEach(row => {
      const zh = row.Prediction_ZH?.trim();
      const en = row.Prediction_EN?.trim();
      const th = row.Prediction_TH?.trim();
      if (!zh && !en && !th) return;
      const existing = existingPredictions[row.Match_ID] || {};
      existingPredictions[row.Match_ID] = {
        prediction_zh: zh || existing.prediction_zh || '',
        prediction_en: en || existing.prediction_en || '',
        prediction_th: th || existing.prediction_th || ''
      };
    });
  }

  // Load upcoming matches from all sports' local caches
  const matchesPath = path.resolve('src/data/matches.json');
  const leaguesPath = path.resolve('src/data/leagueMatches.json');
  const cricketPath = path.resolve('src/data/cricketMatches.json');
  const football = fs.existsSync(matchesPath) ? JSON.parse(fs.readFileSync(matchesPath, 'utf8')) : [];
  const leagues = fs.existsSync(leaguesPath) ? JSON.parse(fs.readFileSync(leaguesPath, 'utf8')) : [];
  const cricket = fs.existsSync(cricketPath) ? JSON.parse(fs.readFileSync(cricketPath, 'utf8')) : [];

  const allMatches = [
    ...football.map(m => ({ ...m, _sport: 'Football (World Cup)' })),
    ...leagues.map(m => ({ ...m, _sport: 'Football (Top 5 Leagues)' })),
    ...cricket.map(m => ({ ...m, _sport: 'Cricket' })),
  ];
  const upcomingMatchIds = new Set(allMatches.map(m => m.id));

  const csvRecords = [];
  for (const match of allMatches) {
    const matchTime = new Date(match.commence_time).toLocaleString();
    const existing = existingPredictions[match.id] || {};
    csvRecords.push({
      Match_ID: match.id,
      Sport: match._sport,
      Home_Team: match.home_team,
      Away_Team: match.away_team,
      Match_Time: matchTime,
      Prediction_ZH: existing.prediction_zh || '',
      Prediction_EN: existing.prediction_en || '',
      Prediction_TH: existing.prediction_th || ''
    });
  }

  // Append matches no longer in the cache but that already have predictions,
  // so historical/manually-entered content is never silently dropped.
  for (const [id, pred] of Object.entries(existingPredictions)) {
    if (!upcomingMatchIds.has(id) && (pred.prediction_zh || pred.prediction_en || pred.prediction_th)) {
      csvRecords.push({
        Match_ID: id,
        Sport: '',
        Home_Team: '',
        Away_Team: '',
        Match_Time: '',
        Prediction_ZH: pred.prediction_zh || '',
        Prediction_EN: pred.prediction_en || '',
        Prediction_TH: pred.prediction_th || ''
      });
    }
  }

  const csvOutput = stringify(csvRecords, { header: true });
  fs.writeFileSync(csvPath, csvOutput, 'utf8');
  fs.writeFileSync(jsonPath, JSON.stringify(existingPredictions, null, 2), 'utf8');

  console.log(`✅ Successfully generated HOME_EXPERT_PREDICTIONS.csv with ${allMatches.length} upcoming matches (+ ${csvRecords.length - allMatches.length} historical)!`);
}

main();
