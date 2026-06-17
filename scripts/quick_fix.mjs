import fs from 'fs';
import path from 'path';

const dbPath = path.resolve('src/data/aiTeamBaseline.json');
const dbStr = fs.readFileSync(dbPath, 'utf8');
const db = JSON.parse(dbStr);

db["Canada"] = {
  "atk": { "score": 8.0, "trend": "=", "reason_zh": "在對陣波士尼亞的比賽中展現出不錯的把握能力，最終以 1-1 戰平對手。", "reason_en": "Showed decent finishing in their 1-1 draw against Bosnia." },
  "def": { "score": 7.5, "trend": "-", "reason_zh": "防線表現尚可，但在面對波士尼亞的進攻時仍丟失一球，無法保持不失球。", "reason_en": "Defense was acceptable but conceded a goal against Bosnia, failing to keep a clean sheet." },
  "pos": { "score": 7.8, "trend": "=", "reason_zh": "中場控球率與對手平分秋色，能夠創造出一定的威脅。", "reason_en": "Shared possession equally with their opponents and managed to create some threats." },
  "dis": { "score": 8.0, "trend": "=", "reason_zh": "全場紀律維持良好，沒有出現嚴重的無謂犯規。", "reason_en": "Maintained good discipline throughout the match without serious unnecessary fouls." },
  "frm": { "score": 8.0, "trend": "=", "reason_zh": "首戰踢平，狀態平穩，球隊士氣沒有受到太大打擊。", "reason_en": "Drew their first match, keeping their form and morale stable." }
};

db["Bosnia & Herzegovina"] = {
  "atk": { "score": 7.5, "trend": "=", "reason_zh": "面對加拿大的防線成功取得進球，展現了一定的得分能力。", "reason_en": "Successfully scored against Canada's defense, demonstrating scoring capability." },
  "def": { "score": 7.5, "trend": "-", "reason_zh": "防守端在比賽中出現漏洞，導致最終被對手以 1-1 逼平。", "reason_en": "Defensive gaps during the match led to them being held to a 1-1 draw." },
  "pos": { "score": 7.5, "trend": "=", "reason_zh": "在中場爭奪中沒有取得絕對優勢，控球表現中規中矩。", "reason_en": "Did not gain absolute dominance in midfield battles; average possession performance." },
  "dis": { "score": 7.8, "trend": "=", "reason_zh": "球員戰術執行確實，比賽中並未出現嚴重的脫序行為。", "reason_en": "Solid tactical execution by players with no major disciplinary issues." },
  "frm": { "score": 7.8, "trend": "=", "reason_zh": "在世界盃首戰取得平局，後續仍需加強進攻火力以爭取晉級。", "reason_en": "Achieved a draw in their World Cup opener; needs to boost offensive firepower to advance." }
};

fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf8');
console.log("✅ Successfully fixed Canada and Bosnia stats!");
