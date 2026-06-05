const fs = require('fs');
const path = require('path');
const {
  opportunityScore,
  packetFor,
  parseCsv,
  readySubmissionRows,
} = require('./print-free-search-submission-packets');

const CSV_PATH = 'docs/free-search-marketing-tracker.csv';
const HELP = `Usage:
  node scripts/export-free-search-outreach-csv.js [--out outreach.csv] [--limit 25] [--all]

Exports ready Serviio free-search marketing rows as outreach-ready CSV.
Default output focuses on partner/referral, POS-specific, community, association, and restaurant-tech opportunities.
Use --all to include business profiles, AI directories, startup directories, and webmaster rows.
`;

const DEFAULT_CHANNELS = new Set([
  'Asian chamber',
  'Chinese business association',
  'Community post',
  'Educational resource listing',
  'Partner outreach',
  'POS-specific outreach',
  'Restaurant technology directory',
]);

const HEADERS = [
  'opportunity_score',
  'opportunity_reasons',
  'priority',
  'channel',
  'target',
  'submission_contact_url',
  'landing_url',
  'utm_url',
  'anchor_or_listing_phrase',
  'subject',
  'title',
  'tagline',
  'short_description',
  'message',
  'follow_up',
  'approved_post',
  'categories',
  'features',
  'pricing',
  'contact_email',
  'after_action',
];

function parseArgs(argv) {
  const args = { out: '', limit: 0, includeAll: false, help: false };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help' || arg === '-h') {
      args.help = true;
    } else if (arg === '--out') {
      args.out = argv[index + 1] || '';
      index += 1;
    } else if (arg === '--limit') {
      args.limit = Number(argv[index + 1] || 0);
      index += 1;
    } else if (arg === '--all') {
      args.includeAll = true;
    } else {
      throw new Error(`Unexpected argument: ${arg}`);
    }
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

function toCsv(rows) {
  return [
    HEADERS.map(csvEscape).join(','),
    ...rows.map((row) => HEADERS.map((header) => csvEscape(row[header])).join(',')),
  ].join('\n');
}

function isDefaultOutreachRow(row) {
  return DEFAULT_CHANNELS.has(row.channel);
}

function outreachRow(row) {
  const packet = packetFor(row);
  const opportunity = opportunityScore(row);
  return {
    opportunity_score: opportunity.score,
    opportunity_reasons: opportunity.reasons,
    priority: row.priority,
    channel: row.channel,
    target: row.target,
    submission_contact_url: row.url,
    landing_url: row.landing_url,
    utm_url: row.utm_url,
    anchor_or_listing_phrase: row.anchor_or_listing_phrase,
    subject: packet.subject || packet.title,
    title: packet.title,
    tagline: packet.tagline,
    short_description: packet.shortDescription,
    message: packet.longDescription,
    follow_up: packet.followUp || '',
    approved_post: packet.approvedPost || '',
    categories: packet.categories,
    features: packet.features,
    pricing: packet.pricing,
    contact_email: 'info@serviio.ai',
    after_action: 'After action, set status=submitted, owner, date_submitted, and notes in docs/free-search-marketing-tracker.csv.',
  };
}

function buildOutreachRows(rows, { includeAll = false, limit = 0 } = {}) {
  const outputRows = readySubmissionRows(rows)
    .filter((row) => includeAll || isDefaultOutreachRow(row))
    .map(outreachRow);

  return limit > 0 ? outputRows.slice(0, limit) : outputRows;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    process.stdout.write(HELP);
    return;
  }

  const rows = parseCsv(fs.readFileSync(CSV_PATH, 'utf8'));
  const outreachRows = buildOutreachRows(rows, {
    includeAll: args.includeAll,
    limit: args.limit,
  });
  const output = `${toCsv(outreachRows)}\n`;

  if (args.out) {
    const outPath = path.resolve(args.out);
    fs.writeFileSync(outPath, output);
    process.stdout.write(`Wrote ${outreachRows.length} outreach rows to ${outPath}\n`);
  } else {
    process.stdout.write(output);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  buildOutreachRows,
  outreachRow,
  parseArgs,
  toCsv,
};
