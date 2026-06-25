const LANG_TIME_ZONES: Record<string, string> = {
  'zh-tw': 'Asia/Taipei',
  en: 'Asia/Manila',
  th: 'Asia/Bangkok',
};

export function getLangTimeZone(lang: string): string {
  return LANG_TIME_ZONES[lang] ?? 'Asia/Taipei';
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
