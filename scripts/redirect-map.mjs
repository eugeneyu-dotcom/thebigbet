// Shared source of truth for the old (pre-restructure) URL -> new URL mapping.
// Used by astro.config.mjs (Astro's own client-side redirect pages, kept as a
// fallback) and scripts/generate_vercel_redirects.mjs (real HTTP 301/308s via
// vercel.json, which is what Google actually follows without extra crawl cost).
import fs from 'node:fs';
import path from 'node:path';

export const LANGS = ['zh-tw', 'en', 'th', 'bn'];

export function buildRedirects() {
  const r = {};
  for (const lang of LANGS) {
    r[`/${lang}/analysis`] = `/${lang}/football/world-cup/analysis`;
    r[`/${lang}/guides`] = `/${lang}/football/world-cup/guides`;
    r[`/${lang}/bracket`] = `/${lang}/football/world-cup/bracket`;
    r[`/${lang}/group-stage`] = `/${lang}/football/world-cup/group-stage`;
    r[`/${lang}/schedule`] = `/${lang}/football/world-cup/schedule`;
    // MLB was retired in favor of cricket — send any already-indexed old URLs
    // to their closest new equivalent.
    r[`/${lang}/mlb`] = `/${lang}/cricket`;
    r[`/${lang}/mlb/guides`] = `/${lang}/cricket/guides`;

    // These two started out in `trends` before match-specific analysis was
    // split into its own `matchAnalysis` collection/route — redirect their
    // old URLs in case they were already shared or indexed.
    for (const slug of ['epl-matchweek-1-review', 'man-city-matchweek-2-analysis']) {
      r[`/${lang}/football/leagues/trends/${slug}`] = `/${lang}/football/leagues/analysis/${slug}`;
    }

    const aDir = path.resolve(`src/content/analysis/${lang}`);
    if (fs.existsSync(aDir)) {
      for (const file of fs.readdirSync(aDir)) {
        if (!/\.(md|mdx)$/.test(file)) continue;
        const slug = file.replace(/\.(md|mdx)$/, '');
        const src = fs.readFileSync(path.join(aDir, file), 'utf8');
        if (/^draft:\s*true/m.test(src)) continue;
        const m = src.match(/^league:\s*(\S+)/m);
        const league = m ? m[1] : 'world-cup';
        const dest = league === 'nba' ? `/${lang}/nba/analysis/${slug}`
          : league === 'cricket' ? `/${lang}/cricket/analysis/${slug}`
          : `/${lang}/football/world-cup/analysis/${slug}`;
        r[`/${lang}/analysis/${slug}`] = dest;
      }
    }
    const gDir = path.resolve(`src/content/guides/${lang}`);
    if (fs.existsSync(gDir)) {
      for (const file of fs.readdirSync(gDir)) {
        if (!/\.(md|mdx)$/.test(file)) continue;
        const slug = file.replace(/\.(md|mdx)$/, '');
        const src = fs.readFileSync(path.join(gDir, file), 'utf8');
        const m = src.match(/^sport:\s*(\S+)/m);
        const sport = m ? m[1] : 'football';
        const lm = src.match(/^league:\s*(\S+)/m);
        const guideLeague = lm ? lm[1] : 'world-cup';
        const dest = sport === 'cricket' ? `/${lang}/cricket/guides/${slug}`
          : sport === 'basketball' ? `/${lang}/nba/guides/${slug}`
          : guideLeague === 'club-football' ? `/${lang}/football/leagues/guides/${slug}`
          : guideLeague === 'champions-league' ? `/${lang}/football/champions-league/guides/${slug}`
          : `/${lang}/football/world-cup/guides/${slug}`;
        r[`/${lang}/guides/${slug}`] = dest;
      }
    }
  }
  return r;
}
