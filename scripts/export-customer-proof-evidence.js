const fs = require('fs');
const path = require('path');
const { parseCsv } = require('./score-formspree-leads');

const HELP = `Usage:
  node scripts/export-customer-proof-evidence.js path/to/formspree-export.csv [--out customer-proof-evidence.csv] [--summary-only]

Exports customer proof submissions that can be used as evidence for the Pilot restaurant testimonial authority target.
`;

const HEADERS = [
  'evidence_priority',
  'restaurant_name',
  'restaurant_city',
  'restaurant_state',
  'restaurant_type',
  'contact_name',
  'contact_email',
  'contact_phone',
  'pos_system',
  'phone_orders_per_week',
  'main_pain',
  'proof_permission',
  'quote',
  'lead_source',
  'landing_page',
  'authority_tracker_target',
  'evidence_note',
  'tracker_command',
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

function isProofSubmission(record) {
  const sourceText = [
    record.conversion_offer,
    record.lead_source,
    record.landing_page,
    record.current_page,
  ].join(' ');
  return /customer[_\s-]?proof/i.test(sourceText);
}

function hasPublishablePermission(record) {
  return !/internal\s+reference\s+only/i.test(record.proof_permission || '');
}

function evidencePriority(record) {
  if (/public\s+quote\s+with\s+restaurant\s+name|public\s+with\s+restaurant/i.test(record.proof_permission || '')) return 'P0';
  if (/public\s+anonymous|anonymous/i.test(record.proof_permission || '')) return 'P1';
  return 'P2';
}

function evidenceNote(record) {
  const cityState = [record.restaurant_city, record.restaurant_state].filter(Boolean).join(', ');
  return [
    `Customer proof received for ${record.restaurant || record.restaurant_name || 'restaurant'}`,
    cityState ? `market: ${cityState}` : '',
    record.restaurant_type ? `type: ${record.restaurant_type}` : '',
    record.pos_system ? `POS: ${record.pos_system}` : '',
    record.phone_orders_per_week ? `phone orders: ${record.phone_orders_per_week}` : '',
    record.main_pain ? `pain: ${record.main_pain}` : '',
    record.proof_permission ? `permission: ${record.proof_permission}` : '',
  ].filter(Boolean).join('; ');
}

function trackerCommand(row) {
  return `npm run marketing:mark -- --target "Pilot restaurant testimonial" --status submitted --date YYYY-MM-DD --note "${row.evidence_note}; evidence: FORM_OR_REPLY_URL"`;
}

function buildCustomerProofEvidenceRows(records) {
  return records
    .filter(isProofSubmission)
    .filter(hasPublishablePermission)
    .filter((record) => String(record.quote || '').trim())
    .map((record) => {
      const row = {
        evidence_priority: evidencePriority(record),
        restaurant_name: record.restaurant || record.restaurant_name || '',
        restaurant_city: record.restaurant_city || '',
        restaurant_state: record.restaurant_state || '',
        restaurant_type: record.restaurant_type || '',
        contact_name: record.name || record.contact_name || '',
        contact_email: record.email || record.contact_email || '',
        contact_phone: record.phone || record.contact_phone || '',
        pos_system: record.pos_system || '',
        phone_orders_per_week: record.phone_orders_per_week || '',
        main_pain: record.main_pain || '',
        proof_permission: record.proof_permission || '',
        quote: record.quote || '',
        lead_source: record.lead_source || '',
        landing_page: record.landing_page || '',
        authority_tracker_target: 'Pilot restaurant testimonial',
        evidence_note: evidenceNote(record),
      };
      return {
        ...row,
        tracker_command: trackerCommand(row),
      };
    })
    .sort((a, b) => {
      const priorityDiff = a.evidence_priority.localeCompare(b.evidence_priority);
      if (priorityDiff) return priorityDiff;
      return a.restaurant_name.localeCompare(b.restaurant_name);
    });
}

function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help || !args.input) {
    process.stdout.write(HELP);
    process.exit(args.help ? 0 : 1);
  }

  const records = buildRecords(parseCsv(fs.readFileSync(path.resolve(args.input), 'utf8')));
  const proofRows = buildCustomerProofEvidenceRows(records);
  const summary = `Customer proof evidence rows: ${proofRows.length}`;

  if (args.summaryOnly) {
    process.stdout.write(`${summary}\n`);
    return;
  }

  const output = `${toCsv(proofRows)}\n`;
  if (args.out) {
    const outPath = path.resolve(args.out);
    fs.writeFileSync(outPath, output);
    process.stdout.write(`${summary}\n\nWrote customer proof evidence to ${outPath}\n`);
  } else {
    process.stdout.write(`${summary}\n\n${output}`);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  buildCustomerProofEvidenceRows,
  parseArgs,
  toCsv,
};
