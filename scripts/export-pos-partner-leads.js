const fs = require('fs');
const path = require('path');
const { parseCsv, scoreLead, summarize } = require('./score-formspree-leads');

const HELP = `Usage:
  node scripts/export-pos-partner-leads.js path/to/formspree-export.csv [--out pos-partner-leads.csv] [--summary-only]

Exports only no-POS restaurant owners who asked for POS recommendations, packaged for POS partner follow-up.
`;

const HANDOFF_HEADERS = [
  'pos_partner_lead_type',
  'partner_referral_priority',
  'restaurant_name',
  'restaurant_city',
  'restaurant_state',
  'contact_name',
  'contact_email',
  'contact_phone',
  'phone_orders_per_week',
  'main_pain',
  'pos_recommendation_interest',
  'pos_purchase_timeline',
  'pos_purchase_timeline_urgency',
  'lead_source',
  'landing_path',
  'serviio_fit_status',
  'partner_next_action',
  'handoff_summary',
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
    HANDOFF_HEADERS.join(','),
    ...rows.map((row) => HANDOFF_HEADERS.map((header) => csvEscape(row[header])).join(',')),
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

function priorityRank(priority) {
  return { hot: 0, warm: 1 }[priority] ?? 9;
}

function buildPosPartnerRows(scoredRows) {
  return scoredRows
    .filter((row) => row.pos_partner_lead_status === 'qualified_for_pos_partner')
    .sort((a, b) => {
      const priorityDiff = priorityRank(a.partner_referral_priority) - priorityRank(b.partner_referral_priority);
      if (priorityDiff) return priorityDiff;
      return Number(b.lead_score) - Number(a.lead_score);
    })
    .map((row) => ({
      pos_partner_lead_type: row.pos_partner_lead_type,
      partner_referral_priority: row.partner_referral_priority,
      restaurant_name: row.restaurant_name,
      restaurant_city: row.restaurant_city,
      restaurant_state: row.restaurant_state,
      contact_name: row.contact_name,
      contact_email: row.contact_email,
      contact_phone: row.contact_phone,
      phone_orders_per_week: row.phone_orders_per_week,
      main_pain: row.main_pain,
      pos_recommendation_interest: row.pos_recommendation_interest,
      pos_purchase_timeline: row.pos_purchase_timeline,
      pos_purchase_timeline_urgency: row.pos_purchase_timeline_urgency,
      lead_source: row.lead_source,
      landing_path: row.landing_path,
      serviio_fit_status: row.serviio_fit_status,
      partner_next_action: row.partner_next_action,
      handoff_summary: row.pos_partner_lead_package,
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
  const partnerRows = buildPosPartnerRows(scoredRows);
  const summary = [
    summarize(scoredRows),
    '',
    `POS partner handoff leads: ${partnerRows.length}`,
  ].join('\n');

  if (args.summaryOnly) {
    process.stdout.write(`${summary}\n`);
    return;
  }

  const output = `${toCsv(partnerRows)}\n`;
  if (args.out) {
    const outPath = path.resolve(args.out);
    fs.writeFileSync(outPath, output);
    process.stdout.write(`${summary}\n\nWrote POS partner leads to ${outPath}\n`);
  } else {
    process.stdout.write(`${summary}\n\n${output}`);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  buildPosPartnerRows,
  parseArgs,
  toCsv,
};
