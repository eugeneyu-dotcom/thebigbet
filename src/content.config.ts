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
    // 'football' keeps the original radar/H2H charts (fed by scores.json);
    // 'basketball' / 'baseball' use a two-way (no-draw) layout with a simple
    // H2H + recent-form block. Defaults to football so existing articles are
    // unaffected.
    sport: z.enum(['football', 'basketball', 'baseball']).default('football'),
    // Competition/league this article belongs to. Drives the top-nav category
    // routing: world-cup + club-football live under Football; nba/mlb are their
    // own categories. Defaults to world-cup so existing football articles map
    // to the 2026 World Cup section without edits.
    league: z.enum(['world-cup', 'club-football', 'nba', 'mlb']).default('world-cup'),
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

export const collections = { analysis, strategy, guides, casinos, promotions };
