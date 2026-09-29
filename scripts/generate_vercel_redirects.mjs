// Regenerates vercel.json from the shared redirect map so old URLs get a
// real HTTP 301/308 at Vercel's edge instead of only Astro's client-side
// meta-refresh fallback pages (which return 200 + noindex + a JS/meta
// redirect — Google has to fetch and parse them to find the destination,
// instead of reading it straight off the response headers).
//
// Also sets "trailingSlash": true, matching this site's existing canonical
// URL convention (every real page's <link rel="canonical"> ends in a slash),
// so a request without the trailing slash gets redirected instead of served
// as a second crawlable copy of the same page.
import fs from 'node:fs';
import { buildRedirects } from './redirect-map.mjs';

const redirectMap = buildRedirects();

// GSC's crawl data shows Google actually requested/indexed these old URLs
// WITH a trailing slash (Astro's static build serves folder-style routes
// that way). Emit both the slash and no-slash source form for each rule so
// the redirect fires regardless of which one a real request/crawl uses —
// Vercel's `redirects` are matched against the raw incoming path, before its
// own trailingSlash normalization runs. Destination always gets the slash
// (this site's canonical form) so it's a single hop, not source-normalize
// then a second trailingSlash redirect.
const redirects = [];
for (const [source, destination] of Object.entries(redirectMap)) {
  const canonicalDest = destination.endsWith('/') ? destination : `${destination}/`;
  const bareSource = source.endsWith('/') ? source.slice(0, -1) : source;
  redirects.push({ source: bareSource, destination: canonicalDest, permanent: true });
  redirects.push({ source: `${bareSource}/`, destination: canonicalDest, permanent: true });
}

const vercelConfig = {
  trailingSlash: true,
  redirects,
};

fs.writeFileSync('vercel.json', JSON.stringify(vercelConfig, null, 2) + '\n');
console.log(`✅ Wrote vercel.json with trailingSlash: true and ${redirects.length} redirect rules.`);
