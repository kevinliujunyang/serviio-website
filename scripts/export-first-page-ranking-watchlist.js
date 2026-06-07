const fs = require('fs');
const path = require('path');

const SCORECARD_PATH = 'docs/google-search-console-scorecard.md';
const DEFAULT_OUT = 'docs/first-page-ranking-watchlist.csv';
const SITE_ORIGIN = 'https://serviio.ai';
const HEADERS = [
  'priority',
  'cluster',
  'query',
  'target_page',
  'target_url',
  'target_position',
  'current_position',
  'current_clicks',
  'current_impressions',
  'current_ctr',
  'last_checked',
  'status',
  'next_action',
  'authority_target',
];

function parseArgs(argv) {
  const args = {
    out: DEFAULT_OUT,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help' || arg === '-h') {
      args.help = true;
    } else if (arg === '--out') {
      args.out = argv[index + 1] || DEFAULT_OUT;
      index += 1;
    } else {
      throw new Error(`Unexpected argument: ${arg}`);
    }
  }

  return args;
}

function extractSection(markdown, heading) {
  const match = markdown.match(new RegExp(`## ${heading}\\n([\\s\\S]*?)(?:\\n## |\\n$)`));
  return match ? match[1] : '';
}

function extractPriorityQueries(markdown) {
  return [...extractSection(markdown, 'Priority Queries').matchAll(/^- (.+)$/gm)]
    .map((match) => match[1].trim())
    .filter(Boolean);
}

function posName(query) {
  const match = String(query || '').match(/39\s*miles|menusifu|menu\s*sifu|chowbus|mealkeyway|square|toast|clover/i);
  if (!match) return '';
  return match[0]
    .replace(/\b39\s*miles\b/i, '39 Miles')
    .replace(/\bmenu\s*sifu\b/i, 'MenuSifu')
    .replace(/\bmenusifu\b/i, 'MenuSifu')
    .replace(/\bchowbus\b/i, 'Chowbus')
    .replace(/\bmealkeyway\b/i, 'Mealkeyway')
    .replace(/\bsquare\b/i, 'Square')
    .replace(/\btoast\b/i, 'Toast')
    .replace(/\bclover\b/i, 'Clover');
}

function posSlug(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/\s+/g, '-');
}

function clusterFor(query) {
  const text = String(query || '').toLowerCase();
  if (/39\s*miles|menusifu|menu\s*sifu|chowbus|mealkeyway|square|toast|clover/.test(text)) return 'Named POS';
  if (/boston|massachusetts|philadelphia|pennsylvania|california|new york|new jersey|texas/.test(text)) return 'Local service area';
  if (/best pos|without pos|no pos|pos system|takeout pos/.test(text)) return 'POS system research';
  if (/pos|integration|connect phone orders/.test(text)) return 'POS integration';
  if (/chinese|mandarin|cantonese|takeout/.test(text)) return 'Chinese restaurant';
  if (/answering|receptionist|missed call|call answering/.test(text)) return 'Phone answering';
  if (/order taker|order taking|phone order|phone ordering|ordering system/.test(text)) return 'Order taking';
  return 'Restaurant AI category';
}

function targetPageFor(query) {
  const text = String(query || '').toLowerCase();
  const namedPos = posName(query);
  if (namedPos) return `/pos/${posSlug(namedPos)}-ai-phone-ordering/`;
  if (/boston/.test(text)) return '/service-areas/boston-restaurant-ai-phone-ordering/';
  if (/philadelphia/.test(text)) return '/service-areas/philadelphia-restaurant-ai-phone-ordering/';
  if (/massachusetts/.test(text)) return '/service-areas/massachusetts-restaurant-ai-phone-ordering/';
  if (/pennsylvania/.test(text)) return '/service-areas/pennsylvania-restaurant-ai-phone-ordering/';
  if (/best pos|without pos|no pos/.test(text)) return '/best-pos-for-chinese-restaurant-phone-orders/';
  if (/chinese restaurant pos system|chinese takeout.*pos|takeout.*pos/.test(text)) return '/chinese-restaurant-pos-system/';
  if (/connect phone orders to pos|how to connect phone orders/.test(text)) return '/guides/connect-phone-orders-to-pos/';
  if (/pos|integration/.test(text)) return '/restaurant-pos-phone-order-integration/';
  if (/phone answering|answering service|call answering|receptionist|missed call/.test(text) && /chinese/.test(text)) return '/chinese-restaurant-phone-answering-service/';
  if (/phone answering|answering service|call answering|receptionist|missed call/.test(text)) return '/restaurant-phone-answering-service/';
  if (/voice assistant|voice ai|voice ordering/.test(text)) return '/ai-voice-assistant-for-restaurants/';
  if (/order taker|order taking/.test(text)) return '/restaurant-ai-phone-order-taker/';
  if (/restaurant tech|technology/.test(text)) return '/restaurant-tech-ai-phone-ordering/';
  if (/customer service|customer support/.test(text)) return '/restaurant-customer-service-ai/';
  if (/automation/.test(text)) return '/restaurant-phone-order-automation/';
  if (/mandarin|cantonese|bilingual/.test(text)) return '/mandarin-cantonese-ai-phone-ordering/';
  if (/chinese|takeout/.test(text)) return '/chinese-restaurant-ai-phone-ordering/';
  return '/restaurant-ai-assistant/';
}

function authorityTargetFor(cluster, query) {
  const namedPos = posName(query);
  if (namedPos) return `${namedPos} restaurant consultants`;
  if (cluster === 'Local service area') return 'Local restaurant associations and business profiles';
  if (cluster === 'POS system research') return 'POS consultants';
  if (cluster === 'POS integration') return 'Restaurant POS and automation directories';
  if (cluster === 'Chinese restaurant') return 'Chinese restaurant POS consultants';
  if (cluster === 'Phone answering') return 'Restaurant website agencies';
  return 'Restaurant POS and automation directories';
}

function nextActionFor(cluster) {
  if (cluster === 'Named POS') return 'Track in Search Console; build one POS-specific partner/backlink path and one exact-anchor internal link.';
  if (cluster === 'Local service area') return 'Track local impressions; add local association/profile proof before creating more city pages.';
  if (cluster === 'POS system research') return 'Use as POS referral lead path; connect no-POS leads to partner follow-up.';
  if (cluster === 'POS integration') return 'Add exact-anchor internal links and prioritize POS directory/consultant authority.';
  return 'Track weekly position and CTR; use query as anchor text for the target page.';
}

function priorityFor(cluster, query) {
  if (cluster === 'Named POS') return 'P0';
  if (/chinese|pos|phone order|phone ordering/i.test(query)) return 'P1';
  return 'P2';
}

function buildWatchlistRows(queries) {
  return queries.map((query) => {
    const cluster = clusterFor(query);
    const targetPage = targetPageFor(query);
    return {
      priority: priorityFor(cluster, query),
      cluster,
      query,
      target_page: targetPage,
      target_url: `${SITE_ORIGIN}${targetPage}`,
      target_position: '1-10',
      current_position: '',
      current_clicks: '',
      current_impressions: '',
      current_ctr: '',
      last_checked: '',
      status: 'needs_search_console_data',
      next_action: nextActionFor(cluster),
      authority_target: authorityTargetFor(cluster, query),
    };
  });
}

function csvEscape(value) {
  const text = String(value ?? '');
  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function toCsv(rows) {
  return [
    HEADERS.join(','),
    ...rows.map((row) => HEADERS.map((header) => csvEscape(row[header])).join(',')),
  ].join('\n');
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log('Usage: node scripts/export-first-page-ranking-watchlist.js [--out docs/first-page-ranking-watchlist.csv]');
    return;
  }

  const markdown = fs.readFileSync(SCORECARD_PATH, 'utf8');
  const queries = extractPriorityQueries(markdown);
  if (queries.length === 0) {
    throw new Error(`${SCORECARD_PATH}: no priority queries found`);
  }

  const rows = buildWatchlistRows(queries);
  const outPath = path.resolve(args.out || DEFAULT_OUT);
  fs.writeFileSync(outPath, `${toCsv(rows)}\n`);
  console.log(`Wrote ${rows.length} first-page ranking watchlist rows to ${outPath}`);
}

if (require.main === module) {
  main();
}

module.exports = {
  buildWatchlistRows,
  clusterFor,
  extractPriorityQueries,
  parseArgs,
  targetPageFor,
  toCsv,
};
