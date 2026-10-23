import fs from 'fs';
import path from 'path';

// Cache finished-match results from football-data.org into
// src/data/footballResults.json. The "prediction vs result" box on analysis
// pages (src/components/PredictionResult.astro) looks matches up here by team
// names and date, so results show up without hand-entering anything.
//
// Free tier covers these competitions (10 requests/minute): WC = World Cup,
// PL = Premier League, CL = Champions League, PD = La Liga. Add more codes to COMPETITIONS
// when a new competition needs the result box.
//
// Like update_nba.mjs, this never exits non-zero: update:all is an `&&` chain
// and a failure here must not stop the rest of the daily update. If a
// competition fails to fetch, its previously cached results are kept.

const TOKEN = process.env.FOOTBALL_DATA_ORG_TOKEN || '';
const OUT = path.resolve('src/data/footballResults.json');
const COMPETITIONS = ['WC', 'PL', 'CL', 'PD'];

function slim(m, code) {
  const s = m.score ?? {};
  return {
    competition: code,
    id: m.id,
    utcDate: m.utcDate,
    stage: m.stage,
    homeTeam: m.homeTeam?.name,
    awayTeam: m.awayTeam?.name,
    winner: s.winner ?? null, // HOME_TEAM | AWAY_TEAM | DRAW
    duration: s.duration ?? 'REGULAR', // REGULAR | EXTRA_TIME | PENALTY_SHOOTOUT
    fullTime: s.fullTime ?? null,
    halfTime: s.halfTime ?? null,
    regularTime: s.regularTime ?? null,
    extraTime: s.extraTime ?? null,
    penalties: s.penalties ?? null,
  };
}

async function fetchCompetition(code) {
  const res = await fetch(`https://api.football-data.org/v4/competitions/${code}/matches?status=FINISHED`, {
    headers: { 'X-Auth-Token': TOKEN },
  });
  if (!res.ok) {
    console.warn(`⚠️ ${code}: request failed with status ${res.status} — keeping cached results.`);
    return null;
  }
  const data = await res.json();
  return (data.matches ?? []).map((m) => slim(m, code));
}

async function main() {
  console.log('⚽ Updating cached football results (football-data.org)...');
  if (!TOKEN) {
    console.warn('⚠️ FOOTBALL_DATA_ORG_TOKEN is not set — skipping, keeping existing results.');
    return;
  }

  let cached = [];
  try {
    cached = JSON.parse(fs.readFileSync(OUT, 'utf8'));
  } catch {}

  let results = cached;
  for (const code of COMPETITIONS) {
    try {
      const fresh = await fetchCompetition(code);
      if (fresh) {
        results = results.filter((m) => m.competition !== code).concat(fresh);
        console.log(`✅ ${code}: ${fresh.length} finished matches`);
      }
    } catch (e) {
      console.warn(`⚠️ ${code}: ${e.message} — keeping cached results.`);
    }
    // stay well under the free tier's 10 requests/minute
    await new Promise((r) => setTimeout(r, 1500));
  }

  results.sort((a, b) => new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime());
  fs.writeFileSync(OUT, JSON.stringify(results) + '\n');
  console.log(`✅ Saved ${results.length} results to src/data/footballResults.json`);
}

main().catch((e) => console.warn('⚠️ Unexpected error in results update — keeping existing data.', e));
