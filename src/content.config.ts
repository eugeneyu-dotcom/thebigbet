import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const analysis = defineCollection({
  loader: glob({ base: './src/content/analysis', pattern: '**/*.{md,mdx}' }),
  schema: z.object({
    title: z.string(),
    pubDate: z.coerce.date(),
    match: z.string(),
    odds: z.string(),
    prediction: z.string(),
    confidence: z.number().min(1).max(5),
    h2hData: z.array(z.number()),
    teamAForm: z.array(z.number()),
    teamBForm: z.array(z.number()),
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

export const collections = { analysis, casinos, promotions };
