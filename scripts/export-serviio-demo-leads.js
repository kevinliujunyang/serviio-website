const fs = require('fs');
const path = require('path');
const { parseCsv, scoreLead, summarize } = require('./score-formspree-leads');

const HELP = `Usage:
  node scripts/export-serviio-demo-leads.js path/to/formspree-export.csv [--out demo-leads.csv] [--summary-only]

Exports POS-ready restaurant owners for Serviio demo follow-up. No-POS POS referral leads stay in the POS partner export.
`;

const DEMO_HEADERS = [
  'demo_priority',
  'lead_priority',
  'lead_route',
  'restaurant_name',
  'restaurant_city',
  'restaurant_state',
  'contact_name',
  'contact_email',
  'contact_phone',
  'pos_system',
  'pos_focus',
  'phone_orders_per_week',
  'main_pain',
  'conversion_offer',
  'lead_source',
  'landing_path',
  'buyer_profile',
  'lead_score',
  'lead_reason',
  'lead_next_action',
  'call_script',
];

function parseArgs(argv) {
  const args = { input: '', out: '', summaryOnly: false };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help' || arg === '-h') {
      args.help = true;
    } else if (arg === '--summary-only') {
      args.summaryOnly = true;
    } else if (arg === '--out') {
      args.out = argv[index + 1] || '';
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
    DEMO_HEADERS.join(','),
    ...rows.map((row) => DEMO_HEADERS.map((header) => csvEscape(row[header])).join(',')),
  ].join('\n');
}

function buildRecords(csvRows) {
  if (csvRows.length < 2) {
    throw new Error('CSV must include a header row and at least one lead row.');
  }

  const headers = csvRows[0].map((header) => header.trim());
  return csvRows.slice(1).map((row) => Object.fromEntries(
    headers.map((header, index) => [header, row[index] || '']),
  ));
}

function routeRank(route) {
  return { call_now: 0, demo_queue: 1 }[route] ?? 9;
}

function buildCallScript(row) {
  const pos = row.pos_system || row.pos_focus || 'their current POS';
  const volume = row.phone_orders_per_week || 'their weekly phone-order volume';
  const pain = row.main_pain || 'missed calls, manual entry, or rush-hour pressure';
  return [
    `Confirm they still use ${pos} and receive ${volume} phone orders per week.`,
    `Ask where calls break today: ${pain}.`,
    'Confirm whether orders should flow into the POS, kitchen workflow, or SMS confirmation first.',
    'Position Serviio as AI phone ordering for POS-ready restaurants at 2% per completed order, with no monthly fee or setup cost.',
    'Close for a POS workflow review and live menu/order-taking demo.',
  ].join(' ');
}

function buildDemoQueueRows(scoredRows) {
  return scoredRows
    .filter((row) =>
      row.serviio_fit_status === 'serviio_demo_fit' &&
      ['call_now', 'demo_queue'].includes(row.lead_route)
    )
    .sort((a, b) => {
      const routeDiff = routeRank(a.lead_route) - routeRank(b.lead_route);
      if (routeDiff) return routeDiff;
      return Number(b.lead_score) - Number(a.lead_score);
    })
    .map((row) => ({
      demo_priority: row.lead_route,
      lead_priority: row.lead_priority,
      lead_route: row.lead_route,
      restaurant_name: row.restaurant_name,
      restaurant_city: row.restaurant_city,
      restaurant_state: row.restaurant_state,
      contact_name: row.contact_name,
      contact_email: row.contact_email,
      contact_phone: row.contact_phone,
      pos_system: row.pos_system,
      pos_focus: row.pos_focus,
      phone_orders_per_week: row.phone_orders_per_week,
      main_pain: row.main_pain,
      conversion_offer: row.conversion_offer,
      lead_source: row.lead_source,
      landing_path: row.landing_path,
      buyer_profile: row.buyer_profile,
      lead_score: row.lead_score,
      lead_reason: row.lead_reason,
      lead_next_action: row.lead_next_action,
      call_script: buildCallScript(row),
    }));
}

function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help || !args.input) {
    process.stdout.write(HELP);
    process.exit(args.help ? 0 : 1);
  }

  const inputPath = path.resolve(args.input);
  const records = buildRecords(parseCsv(fs.readFileSync(inputPath, 'utf8')));
  const scoredRows = records.map(scoreLead);
  const demoRows = buildDemoQueueRows(scoredRows);
  const summary = [
    summarize(scoredRows),
    '',
    `Serviio demo leads: ${demoRows.length}`,
  ].join('\n');

  if (args.summaryOnly) {
    process.stdout.write(`${summary}\n`);
    return;
  }

  const output = `${toCsv(demoRows)}\n`;
  if (args.out) {
    const outPath = path.resolve(args.out);
    fs.writeFileSync(outPath, output);
    process.stdout.write(`${summary}\n\nWrote Serviio demo leads to ${outPath}\n`);
  } else {
    process.stdout.write(`${summary}\n\n${output}`);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  buildDemoQueueRows,
  parseArgs,
  toCsv,
};
