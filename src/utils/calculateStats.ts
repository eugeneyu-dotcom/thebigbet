import baselineData from '../data/aiTeamBaseline.json';

export interface ScoreData {
  id: string;
  sport_title: string;
  commence_time: string;
  completed: boolean;
  home_team: string;
  away_team: string;
  scores: Array<{ name: string; score: string }> | null;
}

export interface StatDetail {
  score: number;
  trend: string;
  reason_zh: string;
  reason_en: string;
}

export interface DetailedTeamStats {
  atk: StatDetail;
  def: StatDetail;
  pos: StatDetail;
  dis: StatDetail;
  frm: StatDetail;
}

/**
 * Calculate dynamic stats and return detailed reasoning
 */
export function getDetailedTeamStats(teamName: string, recentMatches: ScoreData[]): DetailedTeamStats {
  const baseline = baselineData[teamName as keyof typeof baselineData] || baselineData.default;
  
  // Clone to avoid mutating static JSON
  const stats: DetailedTeamStats = JSON.parse(JSON.stringify(baseline));

  const teamMatches = recentMatches.filter(m => 
    m.completed && 
    m.scores && 
    (m.home_team === teamName || m.away_team === teamName)
  );

  if (teamMatches.length > 0) {
    let goalsScored = 0;
    let goalsConceded = 0;
    let wins = 0;
    let losses = 0;

    teamMatches.forEach(match => {
      const myScoreObj = match.scores?.find(s => s.name === teamName);
      const oppScoreObj = match.scores?.find(s => s.name !== teamName);

      if (myScoreObj && oppScoreObj) {
        const myScore = parseInt(myScoreObj.score, 10);
        const oppScore = parseInt(oppScoreObj.score, 10);

        if (!isNaN(myScore)) goalsScored += myScore;
        if (!isNaN(oppScore)) goalsConceded += oppScore;

        if (myScore > oppScore) wins++;
        else if (myScore < oppScore) losses++;
      }
    });

    const matchCount = teamMatches.length;
    const avgGoalsScored = goalsScored / matchCount;
    const avgGoalsConceded = goalsConceded / matchCount;
    const winRate = wins / matchCount;
    const lossRate = losses / matchCount;

    // Adjust Attack (ATK)
    if (avgGoalsScored >= 2) {
      stats.atk.score = Math.min(10, stats.atk.score + 0.5);
      stats.atk.trend = "+";
      stats.atk.reason_zh += " (動態更新：近期賽事場均進球超過2球，火力全開)";
      stats.atk.reason_en += " (Dynamic Update: Averaging over 2 goals per game recently, offense is on fire.)";
    } else if (avgGoalsScored < 1) {
      stats.atk.score = Math.max(1, stats.atk.score - 0.5);
      stats.atk.trend = "-";
      stats.atk.reason_zh += " (動態更新：近期賽事鋒線啞火，進球效率低下)";
      stats.atk.reason_en += " (Dynamic Update: Low scoring efficiency in recent matches.)";
    }

    // Adjust Defense (DEF)
    if (avgGoalsConceded > 1.5) {
      stats.def.score = Math.max(1, stats.def.score - 0.8);
      stats.def.trend = "-";
      stats.def.reason_zh += " (動態更新：防線崩盤，近期失球過多)";
      stats.def.reason_en += " (Dynamic Update: Defense collapsing, conceding too many goals recently.)";
    } else if (avgGoalsConceded <= 0.5) {
      stats.def.score = Math.min(10, stats.def.score + 0.5);
      stats.def.trend = "+";
      stats.def.reason_zh += " (動態更新：防守密不透風，屢保不失)";
      stats.def.reason_en += " (Dynamic Update: Watertight defense, keeping clean sheets.)";
    }

    // Adjust Form (FRM)
    if (winRate > 0.5) {
      stats.frm.score = Math.min(10, stats.frm.score + 1.0);
      stats.frm.trend = "+";
      stats.frm.reason_zh += " (動態更新：近期勝率極高，球隊處於連勝氣勢中)";
      stats.frm.reason_en += " (Dynamic Update: High win rate recently, riding a winning streak.)";
    } else if (lossRate > 0.5) {
      stats.frm.score = Math.max(1, stats.frm.score - 1.5);
      stats.frm.trend = "-";
      stats.frm.reason_zh += " (動態更新：近期連敗，士氣與狀態大受打擊)";
      stats.frm.reason_en += " (Dynamic Update: Recent losing streak, morale and form took a hit.)";
    }
  }

  // Format to 1 decimal
  stats.atk.score = Number(stats.atk.score.toFixed(1));
  stats.def.score = Number(stats.def.score.toFixed(1));
  stats.pos.score = Number(stats.pos.score.toFixed(1));
  stats.dis.score = Number(stats.dis.score.toFixed(1));
  stats.frm.score = Number(stats.frm.score.toFixed(1));

  return stats;
}

/**
 * Return simple number array for radar chart [ATK, DEF, POS, DIS, FRM]
 */
export function getDynamicTeamStats(teamName: string, recentMatches: ScoreData[]): number[] {
  const detailed = getDetailedTeamStats(teamName, recentMatches);
  return [
    detailed.atk.score,
    detailed.def.score,
    detailed.pos.score,
    detailed.dis.score,
    detailed.frm.score
  ];
}
