import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const analysis = defineCollection({
  loader: glob({ base: './src/content/analysis', pattern: '**/*.{md,mdx}' }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    pubDate: z.coerce.date(),
    // Which sport this analysis covers. Drives the detail-page template:
    // 'football' and 'cricket' each get their own radar-chart layout;
    // 'basketball' / 'baseball' use a two-way (no-draw) layout with a simple
    // H2H + recent-form block. Defaults to football so existing articles are
    // unaffected.
    sport: z.enum(['football', 'basketball', 'baseball', 'cricket']).default('football'),
    // Competition/league this article belongs to. Drives the top-nav category
    // routing: world-cup + club-football live under Football; nba/cricket are
    // their own categories. Defaults to world-cup so existing football articles
    // map to the 2026 World Cup section without edits.
    league: z.enum(['world-cup', 'club-football', 'nba', 'cricket']).default('world-cup'),
    match: z.string(),
    odds: z.string(),
    prediction: z.string(),
    confidence: z.number().min(1).max(5),
    // Football-only extras — optional so non-football sports can omit them.
    // h2hData is [homeWins, draws, awayWins] for football, or
    // [homeWins, awayWins] for two-way sports (basketball/baseball).
    h2hData: z.array(z.number()).optional(),
    teamAForm: z.array(z.number()).optional(),
    teamBForm: z.array(z.number()).optional(),
    // Excludes the entry from all listing pages and the homepage "latest"
    // feed (e.g. template/sample articles). The detail page route is also
    // skipped so it never builds. Defaults to false so existing articles
    // are unaffected.
    draft: z.boolean().default(false),
  }),
});

// Team/season trend analysis — commentary on a single team's outlook (squad,
// form, competition landscape), not a single-match preview. Kept separate
// from `analysis` because it has no opponent, odds, or per-game prediction —
// forcing it into that schema would mean fabricating a fake match.
const trends = defineCollection({
  loader: glob({ base: './src/content/trends', pattern: '**/*.{md,mdx}' }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    pubDate: z.coerce.date(),
    sport: z.enum(['football', 'basketball', 'baseball', 'cricket']),
    // Drives top-nav category routing, same values as `analysis.league`.
    league: z.enum(['world-cup', 'club-football', 'nba', 'cricket']),
    // The team this piece is about (shown as a badge instead of a match VS card).
    team: z.string(),
  }),
});

// Betting knowledge & strategy — evergreen how-to/explainer content, kept in
// its own section (separate from match-focused `guides`). Same simple shape.
const strategy = defineCollection({
  loader: glob({ base: './src/content/strategy', pattern: '**/*.{md,mdx}' }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    pubDate: z.coerce.date(),
  }),
});

const guides = defineCollection({
  loader: glob({ base: './src/content/guides', pattern: '**/*.{md,mdx}' }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    pubDate: z.coerce.date(),
    // Drives which category's guides page/index a guide shows up under.
    // Defaults to football so all existing (World Cup) guides are unaffected.
    sport: z.enum(['football', 'cricket', 'basketball']).default('football'),
    // Football-only: distinguishes World Cup guides from Top 5 Leagues guides,
    // which live under separate nav sections. Ignored for other sports.
    // Defaults to world-cup so all existing football guides are unaffected.
    league: z.enum(['world-cup', 'club-football']).default('world-cup'),
  }),
});

// Multi-match prediction round-ups — quick picks across several upcoming
// fixtures in one article (e.g. "this matchweek's 6 focus-club predictions").
// Kept separate from `trends` (a single team's season outlook, no picks) and
// from `analysis` (one structured match with odds/h2h/confidence) — this is
// forward-looking, multi-match, and informal, so forcing it into either
// existing schema would be a poor fit. Same shape as `trends` since it also
// has no single opponent to build a match VS card from.
const predictions = defineCollection({
  loader: glob({ base: './src/content/predictions', pattern: '**/*.{md,mdx}' }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    pubDate: z.coerce.date(),
    sport: z.enum(['football', 'basketball', 'baseball', 'cricket']),
    // Drives top-nav category routing, same values as `analysis.league`.
    league: z.enum(['world-cup', 'club-football', 'nba', 'cricket']),
    // Shown as a badge instead of a match VS card — e.g. "Premier League".
    team: z.string(),
  }),
});

// Prediction track record — looking back at a batch of previously-published
// predictions against what actually happened. Kept separate from
// `predictions` (forward-looking picks, no outcome yet) even though the
// shape is identical, since mixing settled/verified results into the same
// listing as still-open picks would be confusing.
const verification = defineCollection({
  loader: glob({ base: './src/content/verification', pattern: '**/*.{md,mdx}' }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    pubDate: z.coerce.date(),
    sport: z.enum(['football', 'basketball', 'baseball', 'cricket']),
    // Drives top-nav category routing, same values as `analysis.league`.
    league: z.enum(['world-cup', 'club-football', 'nba', 'cricket']),
    // Shown as a badge instead of a match VS card — e.g. "Premier League".
    team: z.string(),
  }),
});

const casinos = defineCollection({
  loader: glob({ base: './src/content/casinos', pattern: '**/*.{md,mdx}' }),
  schema: z.object({
    title: z.string(),
    draft: z.boolean().default(false),
  }),
});

const promotions = defineCollection({
  loader: glob({ base: './src/content/promotions', pattern: '**/*.{md,mdx}' }),
  schema: z.object({
    title: z.string(),
    draft: z.boolean().default(false),
  }),
});

export const collections = { analysis, trends, predictions, verification, strategy, guides, casinos, promotions };
