// Team pairs for a prediction / verification article, used to draw the crest
// banner on the article page, list pages and the homepage cards.
//
// - `predictions` entries list their fixtures in `matches:` (same club names as
//   leagueMatches.json), so the pairs come straight from there.
// - `verification` entries point at their prediction guide through `verifies`.
// - Articles without a structured match list (e.g. an NBA opening-night guide)
//   can name teams in an optional `banner:` list; consecutive names form a pair.
//
// Only pairs where both crests are known are returned, so a banner never shows
// a half-empty matchup.
import { getEntry } from 'astro:content';
import teamLogosData from '../data/teamLogos.json';

const teamLogos = teamLogosData as Record<string, string>;

export interface TeamPair {
  home: string;
  away: string;
}

export function logoFor(team: string): string | undefined {
  return teamLogos[team];
}

export async function getEntryPairs(entry: any, lang: string): Promise<TeamPair[]> {
  const collection = entry.collection;
  if (collection !== 'predictions' && collection !== 'verification') return [];

  let source = entry;
  if (collection === 'verification' && entry.data.verifies) {
    source = (await getEntry('predictions', `${lang}/${entry.data.verifies}`)) ?? null;
    if (!source) return [];
  }

  let pairs: TeamPair[] = [];
  if (source.data.matches?.length) {
    pairs = source.data.matches.map((m: any) => ({ home: m.home, away: m.away }));
  } else if (source.data.banner?.length) {
    const names: string[] = source.data.banner;
    for (let i = 0; i + 1 < names.length; i += 2) pairs.push({ home: names[i], away: names[i + 1] });
  }
  return pairs.filter((p) => logoFor(p.home) && logoFor(p.away));
}
