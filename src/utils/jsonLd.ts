import { useTranslations, ui } from '../i18n/ui';
import { getDeskName } from './desks';

const SITE_NAME = 'The Big Bet';
const LOCALES = ['zh-tw', 'en', 'th', 'bn'];
const IN_LANGUAGE: Record<string, string> = { 'zh-tw': 'zh-TW', en: 'en', th: 'th', bn: 'bn' };

// URL path segments that appear in breadcrumbs and the label each one shows.
// A segment not listed here (an article slug, or a page like /about/) is the
// last crumb and takes the page title instead.
const SEGMENT_LABEL_KEYS: Record<string, keyof typeof ui['en']> = {
  football: 'nav.football',
  cricket: 'nav.cricket',
  leagues: 'nav.leagues',
  'champions-league': 'nav.championsLeague',
  'world-cup': 'nav.worldcup',
  predictions: 'nav.predictions',
  verification: 'nav.verification',
  trends: 'nav.trends',
  guides: 'nav.guides',
  analysis: 'nav.analysis',
  strategy: 'nav.strategy',
  schedule: 'nav.schedule',
  'group-stage': 'nav.groupStage',
  bracket: 'nav.bracket',
};

const publisher = (site: URL) => ({
  '@type': 'Organization',
  name: SITE_NAME,
  url: new URL('/', site).href,
});

interface BuildOptions {
  site: URL;
  pathname: string;
  lang: string;
  // Page title without the " | The Big Bet" suffix.
  title: string;
  description?: string;
  isArticle: boolean;
  datePublished?: Date;
  sport?: string;
}

export function buildJsonLd(opts: BuildOptions): object[] {
  const { site, pathname, lang, title, description, isArticle, datePublished, sport } = opts;
  const t = useTranslations(lang as any);
  const pageUrl = new URL(pathname, site).href;
  const segments = pathname.split('/').filter(Boolean);
  const blocks: object[] = [];

  // Home page of a locale: describe the site itself.
  if (segments.length === 1 && LOCALES.includes(segments[0])) {
    blocks.push({
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: SITE_NAME,
      url: pageUrl,
      inLanguage: IN_LANGUAGE[lang] ?? 'en',
    });
    blocks.push({ '@context': 'https://schema.org', ...publisher(site) });
    return blocks;
  }

  // Breadcrumbs: Home › known section segments › (page title, if the path ends
  // in an article slug or a standalone page).
  const rest = segments.slice(1);
  const crumbs: { name: string; url: string }[] = [
    { name: t('nav.home'), url: new URL(`/${segments[0]}/`, site).href },
  ];
  let acc = `/${segments[0]}`;
  for (const seg of rest) {
    acc += `/${seg}`;
    const key = SEGMENT_LABEL_KEYS[seg];
    if (seg === 'nba') {
      crumbs.push({ name: 'NBA', url: new URL(`${acc}/`, site).href });
    } else if (key) {
      crumbs.push({ name: t(key), url: new URL(`${acc}/`, site).href });
    } else {
      crumbs.push({ name: title, url: pageUrl });
      break;
    }
  }
  if (crumbs.length > 1) {
    blocks.push({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: crumbs.map((c, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: c.name,
        item: c.url,
      })),
    });
  }

  if (isArticle && datePublished) {
    blocks.push({
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: title,
      ...(description ? { description } : {}),
      // Frontmatter dates are date-only, so emit a date-only value rather than
      // implying a time of day.
      datePublished: datePublished.toISOString().slice(0, 10),
      inLanguage: IN_LANGUAGE[lang] ?? 'en',
      mainEntityOfPage: { '@type': 'WebPage', '@id': pageUrl },
      author: { '@type': 'Organization', name: getDeskName(lang, sport), url: new URL('/', site).href },
      publisher: publisher(site),
    });
  }

  return blocks;
}
