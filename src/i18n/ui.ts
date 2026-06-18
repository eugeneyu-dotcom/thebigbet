export const languages = {
  en: 'English',
  'zh-tw': '繁體中文',
};

export const defaultLang = 'en';

export const ui = {
  'zh-tw': {
    'nav.home': '首頁',
    'nav.analysis': '賽事分析',
    'nav.schedule': '賽事日程',
    'odds.home': '主勝',
    'odds.draw': '平手',
    'odds.away': '客勝',
    'label.home': '主場',
    'label.away': '客場',
    'analysis.tag': '賽事深度分析',
    'analysis.confidence': '信心',
    'analysis.prediction': '本場預測',
    'analysis.aiSection': 'AI 深度分析',
    'schedule.viewOdds': '查看賠率',
    'home.title': '2026 世界盃運彩分析中心',
    'home.tbd': '提示：目前尚未載入賠率緩存，顯示為 TBD 佔位資料。請執行 npm run update:all 來抓取最新賠率與戰績。',
    'trend.up': '上升',
    'trend.down': '下降',
    'trend.flat': '持平',
    'stats.title': '查看 AI 戰力深度解析表',
    'stats.dim': '維度',
    'stats.trend': '趨勢',
    'stats.reason': 'AI 綜合解析原因',
    'stats.badge': 'AI 綜合戰力演算',
    'prediction.ai': 'AI 賠率預測分析',
    'prediction.ai_pending': '系統正在結算最新賠率分析中...',
    'prediction.human': '人類專家預測',
    'prediction.human_empty': '目前專家尚未發布本場比賽的分析，請稍後再回來查看。',
    'status.qualified': '確定出線',
    'status.eliminated': '確定淘汰',
    'dim.atk': '攻擊 (ATK)',
    'dim.def': '防守 (DEF)',
    'dim.pos': '控球 (POS)',
    'dim.dis': '紀律 (DIS)',
    'dim.frm': '狀態 (FRM)',
  },
  en: {
    'nav.home': 'Home',
    'nav.analysis': 'Analysis',
    'nav.schedule': 'Schedule',
    'odds.home': 'Home Win',
    'odds.draw': 'Draw',
    'odds.away': 'Away Win',
    'label.home': 'Home',
    'label.away': 'Away',
    'analysis.tag': 'In-Depth Analysis',
    'analysis.confidence': 'Confidence',
    'analysis.prediction': 'Prediction',
    'analysis.aiSection': 'AI Deep Analysis',
    'schedule.viewOdds': 'View Odds',
    'home.title': '2026 World Cup Betting Analysis',
    'home.tbd': 'Note: Odds cache not loaded yet — displaying placeholder data. Run npm run update:all to fetch the latest odds.',
    'trend.up': 'Rising',
    'trend.down': 'Falling',
    'trend.flat': 'Stable',
    'stats.title': 'View AI Deep Analysis Report',
    'stats.dim': 'Dimension',
    'stats.trend': 'Trend',
    'stats.reason': 'AI Analysis Reasoning',
    'stats.badge': 'AI Computed Stats',
    'prediction.ai': 'AI Odds Prediction',
    'prediction.ai_pending': 'Calculating latest odds analysis...',
    'prediction.human': 'Expert Prediction',
    'prediction.human_empty': 'Our experts have not yet published an analysis for this match. Check back later.',
    'status.qualified': 'Qualified',
    'status.eliminated': 'Eliminated',
    'dim.atk': 'Attack (ATK)',
    'dim.def': 'Defense (DEF)',
    'dim.pos': 'Possession (POS)',
    'dim.dis': 'Discipline (DIS)',
    'dim.frm': 'Form (FRM)',
  },
} as const;

export const teamTranslations: Record<string, Record<string, string>> = {
  'zh-tw': {
    // English Premier League
    'Arsenal': '兵工廠',
    'Aston Villa': '阿斯頓維拉',
    'Bournemouth': '伯恩茅斯',
    'Brentford': '布倫特福德',
    'Brighton': '布萊頓',
    'Burnley': '伯恩利',
    'Chelsea': '切爾西',
    'Crystal Palace': '水晶宮',
    'Everton': '艾佛頓',
    'Fulham': '富勒姆',
    'Liverpool': '利物浦',
    'Luton': '盧頓',
    'Manchester City': '曼城',
    'Manchester United': '曼聯',
    'Newcastle United': '紐卡索聯',
    'Nottingham Forest': '諾丁漢森林',
    'Sheffield United': '謝菲爾德聯',
    'Tottenham Hotspur': '熱刺',
    'West Ham United': '西漢姆聯',
    'Wolverhampton Wanderers': '狼隊',
    // La Liga
    'Real Madrid': '皇家馬德里',
    'Barcelona': '巴塞隆納',
    'Atletico Madrid': '馬德里競技',
    // Serie A
    'Juventus': '尤文圖斯',
    'AC Milan': 'AC米蘭',
    'Inter Milan': '國際米蘭',
    // Bundesliga
    'Bayern Munich': '拜仁慕尼黑',
    'Borussia Dortmund': '多特蒙德',
    // Ligue 1
    'Paris Saint Germain': '巴黎聖日耳曼',
    // Countries
    'Argentina': '阿根廷',
    'France': '法國',
    'Brazil': '巴西',
    'England': '英格蘭',
    'Spain': '西班牙',
    'Germany': '德國',
    'Italy': '義大利',
    'Portugal': '葡萄牙',
    'Netherlands': '荷蘭',
    'Belgium': '比利時',
    'Uruguay': '烏拉圭',
    'Colombia': '哥倫比亞',
    'Croatia': '克羅埃西亞',
    'Switzerland': '瑞士',
    'Denmark': '丹麥',
    'Morocco': '摩洛哥',
    'Senegal': '塞內加爾',
    'Japan': '日本',
    'USA': '美國',
    'Mexico': '墨西哥',
    'Canada': '加拿大',
    'Ecuador': '厄瓜多',
    'Chile': '智利',
    'Peru': '秘魯',
    'Serbia': '塞爾維亞',
    'Poland': '波蘭',
    'Ukraine': '烏克蘭',
    'Austria': '奧地利',
    'Sweden': '瑞典',
    'Wales': '威爾斯',
    'Egypt': '埃及',
    'Nigeria': '奈及利亞',
    'Ivory Coast': '象牙海岸',
    'Algeria': '阿爾及利亞',
    'Cameroon': '喀麥隆',
    'Tunisia': '突尼西亞',
    'Ghana': '迦納',
    'Iran': '伊朗',
    'South Korea': '南韓',
    'Australia': '澳洲',
    'Saudi Arabia': '沙烏地阿拉伯',
    'Qatar': '卡達',
    'Uzbekistan': '烏茲別克',
    'Iraq': '伊拉克',
    'Costa Rica': '哥斯大黎加',
    'Panama': '巴拿馬',
    'Jamaica': '牙買加',
    'New Zealand': '紐西蘭',
    'Paraguay': '巴拉圭',
    'Bosnia & Herzegovina': '波士尼亞',
    'DR Congo': '剛果民主共和國',
    'Cape Verde': '維德角',
    'Jordan': '約旦',
    'Curaçao': '庫拉索',
    'Turkey': '土耳其',
    'Norway': '挪威',
    'Scotland': '蘇格蘭',
    'Haiti': '海地',
    'Czech Republic': '捷克',
    'South Africa': '南非',
    'Honduras': '宏都拉斯',
    'El Salvador': '薩爾瓦多',
    'United Arab Emirates': '阿聯'
  }
};

export const sportTranslations: Record<string, Record<string, string>> = {
  'zh-tw': {
    'Soccer': '足球',
    'EPL': '英超',
    'La Liga': '西甲',
    'Serie A': '義甲',
    'Bundesliga': '德甲',
    'Ligue 1': '法甲',
    'UEFA Champions League': '歐冠',
    'UEFA Europa League': '歐霸',
    'FIFA World Cup': '世界盃',
  }
};

export function getLangFromUrl(url: URL) {
  const [, lang] = url.pathname.split('/');
  if (lang in ui) return lang as keyof typeof ui;
  return defaultLang;
}

export function useTranslations(lang: keyof typeof ui) {
  return function t(key: keyof typeof ui[typeof defaultLang]) {
    return ui[lang]?.[key] || ui[defaultLang][key];
  }
}

export function useTeamTranslations(lang: keyof typeof ui) {
  return function translateTeam(teamName: string) {
    if (lang === 'zh-tw') {
      return teamTranslations['zh-tw'][teamName] || teamName;
    }
    return teamName;
  }
}

export function useSportTranslations(lang: keyof typeof ui) {
  return function translateSport(sportName: string) {
    if (lang === 'zh-tw') {
      // API might return "Soccer - EPL"
      let translated = sportName;
      Object.keys(sportTranslations['zh-tw']).forEach(key => {
        translated = translated.replace(key, sportTranslations['zh-tw'][key]);
      });
      return translated;
    }
    return sportName;
  }
}
