const fs = require('fs');
const path = require('path');
const { followUpRows } = require('./print-free-search-follow-ups');
const { parseCsv } = require('./print-free-search-submission-packets');
const {
  leadAcquisitionChannel,
  leadPriority,
  leadRoute,
  primaryKpi,
} = require('./lead-routing');

const CSV_PATH = 'docs/free-search-marketing-tracker.csv';
const DEFAULT_OUT = 'docs/live-listing-optimization.csv';
const DEFAULT_LIMIT = 10;
const HEADERS = [
  'action_type',
  'priority',
  'channel',
  'target',
  'live_url',
  'website_url',
  'tagline',
  'categories',
  'logo_url',
  'cover_image_url',
  'description',
  'update_checklist',
  'proof_fields',
  'lead_priority',
  'lead_route',
  'primary_kpi',
  'expected_lead_acquisition_channel',
  'tracker_command',
];

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function parsePositiveInteger(name, value) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error(`${name} must be a positive integer`);
  }
  return parsed;
}

function parseArgs(argv) {
  const args = {
    out: DEFAULT_OUT,
    today: todayIso(),
    limit: DEFAULT_LIMIT,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help' || arg === '-h') {
      args.help = true;
    } else if (arg === '--out') {
      args.out = argv[index + 1] || DEFAULT_OUT;
      index += 1;
    } else if (arg === '--today') {
      args.today = argv[index + 1] || args.today;
      index += 1;
    } else if (arg === '--limit') {
      args.limit = parsePositiveInteger('--limit', argv[index + 1]);
      index += 1;
    } else {
      throw new Error(`Unexpected argument: ${arg}`);
    }
  }

  if (!args.help && !/^\d{4}-\d{2}-\d{2}$/.test(args.today)) {
    throw new Error('--today must use YYYY-MM-DD');
  }

  return args;
}

function csvEscape(value) {
  const text = String(value ?? '');
  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function quoteShell(text) {
  return `"${String(text).replace(/"/g, '\\"')}"`;
}

function productHuntFields(row, today) {
  return {
    action_type: 'optimize_live_listing',
    priority: row.priority,
    channel: row.channel,
    target: row.target,
    live_url: row.url,
    website_url: row.utm_url,
    tagline: 'AI phone ordering for restaurants using POS systems.',
    categories: 'AI agents; Voice AI; Restaurant technology; Food and beverage',
    logo_url: 'https://serviio.ai/assets/logo.svg',
    cover_image_url: 'https://serviio.ai/assets/og-image.png',
    description: 'Serviio answers restaurant phone calls 24/7, takes phone orders in natural conversation, supports English and Chinese, and helps POS-ready restaurants route orders toward kitchen workflows.',
    update_checklist: 'Claim or verify owner access. Update tagline, categories, website URL, logo, cover image, and description. Confirm the listing mentions Chinese restaurants, 39 Miles, Square, Toast, Clover, MenuSifu, Chowbus, and POS-ready phone orders.',
    proof_fields: 'Record account or owner confirmation, updated listing screenshot, and the live Product Hunt URL before treating the optimization as complete.',
    lead_priority: leadPriority(row),
    lead_route: leadRoute(row),
    primary_kpi: primaryKpi(row),
    expected_lead_acquisition_channel: leadAcquisitionChannel(row),
    tracker_command: `npm run marketing:mark -- --target ${quoteShell(row.target)} --status "live" --date ${today} --note "Claimed or updated live listing; recorded proof or owner/account confirmation."`,
  };
}

function genericLiveListingFields(row, today) {
  return {
    action_type: 'optimize_live_listing',
    priority: row.priority,
    channel: row.channel,
    target: row.target,
    live_url: row.url,
    website_url: row.utm_url || row.landing_url,
    tagline: row.anchor_or_listing_phrase,
    categories: row.channel,
    logo_url: 'https://serviio.ai/assets/logo.svg',
    cover_image_url: 'https://serviio.ai/assets/og-image.png',
    description: 'Serviio answers restaurant phone calls, captures takeout orders, and qualifies POS-ready restaurant workflows.',
    update_checklist: 'Claim or update the live listing, strengthen restaurant AI phone ordering and POS integration copy, then record owner/account confirmation or updated screenshot.',
    proof_fields: 'Record updated listing screenshot, account or owner confirmation, and the live URL that changed.',
    lead_priority: leadPriority(row),
    lead_route: leadRoute(row),
    primary_kpi: primaryKpi(row),
    expected_lead_acquisition_channel: leadAcquisitionChannel(row),
    tracker_command: `npm run marketing:mark -- --target ${quoteShell(row.target)} --status "live" --date ${today} --note "Claimed or updated live listing; recorded proof or owner/account confirmation."`,
  };
}

function buildLiveListingOptimizationRows(rows, { today = todayIso(), limit = DEFAULT_LIMIT } = {}) {
  return followUpRows(rows, { today, limit: Number.isInteger(limit) ? limit : DEFAULT_LIMIT })
    .filter((row) => row.follow_up_reason === 'live listing optimization')
    .map((row) => row.target === 'Product Hunt Serviio listing'
      ? productHuntFields(row, today)
      : genericLiveListingFields(row, today));
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
    console.log('Usage: node scripts/export-live-listing-optimization-csv.js [--out docs/live-listing-optimization.csv] [--today YYYY-MM-DD] [--limit 10]');
    return;
  }

  const rows = parseCsv(fs.readFileSync(CSV_PATH, 'utf8'));
  const optimizationRows = buildLiveListingOptimizationRows(rows, args);
  const outPath = path.resolve(args.out || DEFAULT_OUT);
  fs.writeFileSync(outPath, `${toCsv(optimizationRows)}\n`);
  process.stdout.write(`Wrote ${optimizationRows.length} live listing optimization rows to ${outPath}\n`);
}

if (require.main === module) {
  main();
}

module.exports = {
  buildLiveListingOptimizationRows,
  parseArgs,
  toCsv,
};
