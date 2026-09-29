// @ts-check

import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { defineConfig, fontProviders } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';
import { buildRedirects } from './scripts/redirect-map.mjs';

// Client-side fallback redirects from the old (pre-restructure) URLs to the
// new category routes. The real HTTP 301/308s for these live in vercel.json
// (see scripts/generate_vercel_redirects.mjs) — this static build has no
// server, so these Astro-generated pages are a meta-refresh fallback in case
// a request ever reaches origin instead of being caught at Vercel's edge.
const redirects = buildRedirects();

// https://astro.build/config
export default defineConfig({
  site: 'https://www.thebigbet.org',
  redirects,
  i18n: {
    defaultLocale: 'zh-tw',
    locales: ['zh-tw', 'en', 'th', 'bn'],
  },
  integrations: [mdx(), sitemap()],

  fonts: [
      {
          provider: fontProviders.local(),
          name: 'Atkinson',
          cssVariable: '--font-atkinson',
          fallbacks: ['sans-serif'],
          options: {
              variants: [
                  {
                      src: ['./src/assets/fonts/atkinson-regular.woff'],
                      weight: 400,
                      style: 'normal',
                      display: 'swap',
                  },
                  {
                      src: ['./src/assets/fonts/atkinson-bold.woff'],
                      weight: 700,
                      style: 'normal',
                      display: 'swap',
                  },
              ],
          },
      },
	],

  vite: {
    plugins: [tailwindcss()],
  },
});