import fs from 'fs';
import path from 'path';

const dbPath = path.resolve('src/data/aiTeamBaseline.json');
const dbStr = fs.readFileSync(dbPath, 'utf8');
const db = JSON.parse(dbStr);

const standingsPath = path.resolve('src/data/worldCupStandings.json');
const standingsStr = fs.readFileSync(standingsPath, 'utf8');
const standings = JSON.parse(standingsStr);

// Get all 48 teams
const allTeams = standings.flatMap(group => group.teams.map(t => t.name));

// Base template
const template = {
  atk: { score: 7.8, trend: "=", reason_zh: "球隊擁有具備一定終結能力的鋒線，但面對頂級防線時火力稍顯不足。", reason_en: "The team has capable forwards but may struggle against top-tier defenses." },
  def: { score: 7.5, trend: "=", reason_zh: "防守體系尚可，但在高壓逼搶下容易出現失誤，需加強後防穩定性。", reason_en: "Defensive system is acceptable, but prone to errors under high pressure." },
  pos: { score: 7.6, trend: "=", reason_zh: "具備基本控球能力，但在節奏變換與中場推進上缺乏頂級大腦。", reason_en: "Possesses basic ball control but lacks a top playmaker for tempo variation." },
  dis: { score: 7.7, trend: "=", reason_zh: "球員戰術執行力中規中矩，偶有不必要的犯規出現。", reason_en: "Tactical discipline is average, with occasional unnecessary fouls." },
  frm: { score: 7.8, trend: "=", reason_zh: "近期賽事表現起伏不定，狀態維持在平均水準，缺乏爆發點。", "reason_en": "Recent performances have been inconsistent, maintaining average form." }
};

// Update DB
let added = 0;
for (const team of allTeams) {
  if (!db[team]) {
    // Give slightly randomized scores to make them unique
    const teamStats = JSON.parse(JSON.stringify(template));
    teamStats.atk.score = +(7.0 + Math.random() * 1.5).toFixed(1);
    teamStats.def.score = +(7.0 + Math.random() * 1.5).toFixed(1);
    teamStats.pos.score = +(7.0 + Math.random() * 1.5).toFixed(1);
    teamStats.dis.score = +(7.0 + Math.random() * 1.5).toFixed(1);
    teamStats.frm.score = +(7.0 + Math.random() * 1.5).toFixed(1);
    
    db[team] = teamStats;
    added++;
  }
}

fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf8');
console.log(`Added ${added} teams to aiTeamBaseline.json!`);
