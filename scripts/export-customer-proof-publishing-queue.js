const fs = require('fs');
const path = require('path');
const {
  buildCustomerProofEvidenceRows,
} = require('./export-customer-proof-evidence');
const {
  parseCsv,
} = require('./score-formspree-leads');

const HELP = `Usage:
  node scripts/export-customer-proof-publishing-queue.js path/to/formspree-export.csv [--out customer-proof-publishing-queue.csv] [--today YYYY-MM-DD] [--summary-only]

Exports approved customer proof submissions into page-ready publishing rows.
`;

const HEADERS = [
  'publish_priority',
  'restaurant_display_name',
  'slug',
  'draft_path',
  'canonical_url',
  'page_title',
  'meta_description',
  'hero_h1',
  'quote',
  'proof_summary',
  'jsonld_types',
  'internal_links',
  'tracker_command',
];

function parseArgs(argv) {
  const args = {
    input: '',
    out: '',
    today: new Date().toISOString().slice(0, 10),
    summaryOnly: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help' || arg === '-h') {
      args.help = true;
    } else if (arg === '--summary-only') {
      args.summaryOnly = true;
    } else if (arg === '--out') {
      args.out = argv[index + 1] || '';
      index += 1;
    } else if (arg === '--today') {
      args.today = argv[index + 1] || args.today;
      index += 1;
    } else if (!args.input) {
      args.input = arg;
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
    HEADERS.join(','),
    ...rows.map((row) => HEADERS.map((header) => csvEscape(row[header])).join(',')),
  ].join('\n');
}

function buildRecords(csvRows) {
  if (csvRows.length < 2) {
    throw new Error('CSV must include a header row and at least one proof row.');
  }

  const headers = csvRows[0].map((header) => header.trim());
  return csvRows.slice(1).map((row) => Object.fromEntries(
    headers.map((header, index) => [header, row[index] || '']),
  ));
}

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function permissionIsAnonymous(row) {
  return /anonymous/i.test(row.proof_permission || '');
}

function displayName(row) {
  if (permissionIsAnonymous(row)) {
    const type = row.restaurant_type || 'restaurant';
    return `Anonymous ${type} in ${row.restaurant_city || 'US market'}`;
  }
  return row.restaurant_name || `${row.restaurant_type || 'Restaurant'} in ${row.restaurant_city || 'US market'}`;
}

function cityPath(row) {
  if (!row.restaurant_city) return '';
  return `/service-areas/${slugify(row.restaurant_city)}-chinese-restaurant-ai-phone-ordering/`;
}

function posPath(row) {
  if (!row.pos_system) return '';
  return `/pos/${slugify(row.pos_system)}-ai-phone-ordering/`;
}

function buildCustomerProofPublishingRows(records, { today = new Date().toISOString().slice(0, 10) } = {}) {
  return buildCustomerProofEvidenceRows(records).map((row) => {
    const city = row.restaurant_city || 'US';
    const type = row.restaurant_type || 'restaurant';
    const pos = row.pos_system || 'POS';
    const slug = slugify(`${city} ${pos} ${type} ai phone ordering proof`);
    const canonicalUrl = `https://serviio.ai/customer-proof/${slug}/`;
    const internalLinks = [
      posPath(row),
      cityPath(row),
      '/customer-proof-request/',
      '/restaurant-missed-call-revenue-calculator/',
    ].filter(Boolean).join('; ');

    return {
      publish_priority: row.evidence_priority,
      restaurant_display_name: displayName(row),
      slug,
      draft_path: `customer-proof/${slug}/index.html`,
      canonical_url: canonicalUrl,
      page_title: `${city} ${pos} ${type} AI phone ordering proof | Serviio`,
      meta_description: `${city} ${type} proof for Serviio AI phone ordering with ${pos}, ${row.phone_orders_per_week || 'restaurant'} weekly phone orders, and ${row.main_pain || 'phone-order pain'}.`,
      hero_h1: `${city} ${type} using ${pos} for AI phone ordering`,
      quote: row.quote,
      proof_summary: `${city}, ${row.restaurant_state || 'US'} | ${type} | ${pos} | ${row.phone_orders_per_week || 'unknown'} weekly phone orders | ${row.main_pain || 'phone-order pain'}`,
      jsonld_types: 'Review; FAQPage; BreadcrumbList',
      internal_links: internalLinks,
      tracker_command: `npm run marketing:mark -- --target "Pilot restaurant testimonial" --status live --date ${today} --url "${canonicalUrl}" --note "${row.evidence_note}; published proof page"`,
    };
  });
}

function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help || !args.input) {
    process.stdout.write(HELP);
    process.exit(args.help ? 0 : 1);
  }

  const records = buildRecords(parseCsv(fs.readFileSync(path.resolve(args.input), 'utf8')));
  const rows = buildCustomerProofPublishingRows(records, { today: args.today });
  const summary = `Customer proof publishing rows: ${rows.length}`;

  if (args.summaryOnly) {
    process.stdout.write(`${summary}\n`);
    return;
  }

  const output = `${toCsv(rows)}\n`;
  if (args.out) {
    const outPath = path.resolve(args.out);
    fs.writeFileSync(outPath, output);
    process.stdout.write(`${summary}\n\nWrote customer proof publishing queue to ${outPath}\n`);
  } else {
    process.stdout.write(`${summary}\n\n${output}`);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  buildCustomerProofPublishingRows,
  parseArgs,
  toCsv,
};
