// Anonymous per-sport desk names shown in the article byline and reused as the
// `author` in the Article JSON-LD, so the structured data always matches what
// readers see. The site is run by a small anonymous team — never a person.
const desks: Record<string, Record<string, string>> = {
  'zh-tw': { football: 'The Big Bet 足球組', basketball: 'The Big Bet 籃球組', cricket: 'The Big Bet 板球組', general: 'The Big Bet 編輯部' },
  en: { football: 'The Big Bet Football Desk', basketball: 'The Big Bet Basketball Desk', cricket: 'The Big Bet Cricket Desk', general: 'The Big Bet Editorial Desk' },
  th: { football: 'ทีมฟุตบอล The Big Bet', basketball: 'ทีมบาสเกตบอล The Big Bet', cricket: 'ทีมคริกเก็ต The Big Bet', general: 'กองบรรณาธิการ The Big Bet' },
  bn: { football: 'The Big Bet ফুটবল ডেস্ক', basketball: 'The Big Bet বাস্কেটবল ডেস্ক', cricket: 'The Big Bet ক্রিকেট ডেস্ক', general: 'The Big Bet সম্পাদকীয় ডেস্ক' },
};

export function getDeskName(lang: string, sport?: string): string {
  const deskSet = desks[lang] ?? desks.en;
  return deskSet[sport ?? 'general'] ?? deskSet.general;
}
