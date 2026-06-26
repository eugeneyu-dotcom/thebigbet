const LANG_TIME_ZONES: Record<string, string> = {
  'zh-tw': 'Asia/Taipei',
  en: 'Asia/Manila',
  th: 'Asia/Bangkok',
};

// Both zones are fixed UTC+8/+7 year-round (no DST), so a static label is safe.
const LANG_TIME_ZONE_LABELS: Record<string, string> = {
  'zh-tw': '台北時間 (UTC+8)',
  en: 'Manila Time (UTC+8)',
  th: 'เวลากรุงเทพ (UTC+7)',
};

export function getLangTimeZone(lang: string): string {
  return LANG_TIME_ZONES[lang] ?? 'Asia/Taipei';
}

export function getTimeZoneLabel(lang: string): string {
  return LANG_TIME_ZONE_LABELS[lang] ?? LANG_TIME_ZONE_LABELS['zh-tw'];
}

export function formatMatchTime(commenceTime: string, lang: string): string {
  return new Date(commenceTime).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: getLangTimeZone(lang),
  });
}

export function formatMatchDateTime(commenceTime: string, lang: string): string {
  return new Date(commenceTime).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: getLangTimeZone(lang),
  });
}

const EN_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const TH_MONTHS = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];

// For dates known only as a calendar day (no kickoff time published yet) —
// e.g. the knockout bracket, where FIFA's wallchart gives a date but not a
// time. Formats the YYYY-MM-DD string directly instead of going through
// Date/timeZone conversion, which would be meaningless (and risk an
// off-by-one day) without an actual time-of-day to anchor it.
export function formatFullDateLabel(isoDate: string, lang: string): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  if (lang === 'zh-tw') return `${y}年${m}月${d}日`;
  if (lang === 'th') return `${d} ${TH_MONTHS[m - 1]} ${y}`;
  return `${EN_MONTHS[m - 1]} ${d}, ${y}`;
}
