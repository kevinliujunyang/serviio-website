const fs = require('fs');
const path = require('path');
const { parseCsv, scoreLead, summarize } = require('./score-formspree-leads');

const HELP = `Usage:
  node scripts/export-customer-proof-followups.js path/to/formspree-export.csv [--out customer-proof-followups.csv] [--summary-only]

Exports POS-ready restaurant leads that should be asked for customer proof after a demo, pilot, or successful setup.
`;

const PROOF_URL = 'https://serviio.ai/customer-proof-request/';
const PROOF_HEADERS = [
  'proof_priority',
  'restaurant_name',
  'restaurant_city',
  'restaurant_state',
  'contact_name',
  'contact_email',
  'contact_phone',
  'pos_system',
  'phone_orders_per_week',
  'main_pain',
  'lead_source',
  'landing_path',
  'lead_score',
  'buyer_profile',
  'proof_request_url',
  'proof_angle',
  'suggested_message',
  'authority_tracker_target',
  'authority_tracker_note',
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
    PROOF_HEADERS.join(','),
    ...rows.map((row) => PROOF_HEADERS.map((header) => csvEscape(row[header])).join(',')),
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

function proofPriority(row) {
  if (row.lead_route === 'call_now' && Number(row.lead_score) >= 70) return 'P0';
  if (['call_now', 'demo_queue'].includes(row.lead_route)) return 'P1';
  return 'P2';
}

function proofAngle(row) {
  const parts = [];
  if (row.restaurant_city && row.restaurant_state) parts.push(`${row.restaurant_city}, ${row.restaurant_state}`);
  if (row.pos_system) parts.push(row.pos_system);
  if (row.phone_orders_per_week) parts.push(`${row.phone_orders_per_week} weekly phone orders`);
  if (row.pain_signal && row.pain_signal !== 'unknown') parts.push(row.pain_signal.replace(/\+/g, ', '));
  return parts.join(' | ') || 'restaurant AI phone ordering proof';
}

function suggestedMessage(row) {
  const name = row.contact_name || 'there';
  const restaurant = row.restaurant_name || 'your restaurant';
  const pos = row.pos_system || 'your POS';
  const pain = row.main_pain || 'phone-order workflow';
  return [
    `Hi ${name},`,
    `After the Serviio pilot or demo for ${restaurant}, could you share a short proof note about ${pain}?`,
    `The most useful version mentions your city, restaurant type, ${pos}, phone-order volume, and whether the main impact was fewer missed calls, better bilingual handling, or less manual POS entry.`,
    `You can submit it here: ${PROOF_URL}`,
  ].join(' ');
}

function buildCustomerProofRows(scoredRows) {
  return scoredRows
    .filter((row) =>
      row.serviio_fit_status === 'serviio_demo_fit' &&
      ['call_now', 'demo_queue'].includes(row.lead_route)
    )
    .sort((a, b) => {
      const priorityDiff = proofPriority(a).localeCompare(proofPriority(b));
      if (priorityDiff) return priorityDiff;
      return Number(b.lead_score) - Number(a.lead_score);
    })
    .map((row) => ({
      proof_priority: proofPriority(row),
      restaurant_name: row.restaurant_name,
      restaurant_city: row.restaurant_city,
      restaurant_state: row.restaurant_state,
      contact_name: row.contact_name,
      contact_email: row.contact_email,
      contact_phone: row.contact_phone,
      pos_system: row.pos_system,
      phone_orders_per_week: row.phone_orders_per_week,
      main_pain: row.main_pain,
      lead_source: row.lead_source,
      landing_path: row.landing_path,
      lead_score: row.lead_score,
      buyer_profile: row.buyer_profile,
      proof_request_url: PROOF_URL,
      proof_angle: proofAngle(row),
      suggested_message: suggestedMessage(row),
      authority_tracker_target: 'Pilot restaurant testimonial',
      authority_tracker_note: `Ask ${row.restaurant_name || 'restaurant lead'} for proof: ${proofAngle(row)}`,
    }));
}

function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help || !args.input) {
    process.stdout.write(HELP);
    process.exit(args.help ? 0 : 1);
  }

  const records = buildRecords(parseCsv(fs.readFileSync(path.resolve(args.input), 'utf8')));
  const scoredRows = records.map(scoreLead);
  const proofRows = buildCustomerProofRows(scoredRows);
  const summary = [
    summarize(scoredRows),
    '',
    `Customer proof follow-ups: ${proofRows.length}`,
  ].join('\n');

  if (args.summaryOnly) {
    process.stdout.write(`${summary}\n`);
    return;
  }

  const output = `${toCsv(proofRows)}\n`;
  if (args.out) {
    const outPath = path.resolve(args.out);
    fs.writeFileSync(outPath, output);
    process.stdout.write(`${summary}\n\nWrote customer proof follow-ups to ${outPath}\n`);
  } else {
    process.stdout.write(`${summary}\n\n${output}`);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  buildCustomerProofRows,
  parseArgs,
  toCsv,
};
