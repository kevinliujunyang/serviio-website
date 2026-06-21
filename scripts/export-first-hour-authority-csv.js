const fs = require('fs');
const path = require('path');
const { authorityScore } = require('./audit-seo-authority');
const { packetFor, parseCsv } = require('./print-free-search-submission-packets');
const {
  evidenceNeeded,
  executionChecklist,
  trackerCommand,
} = require('./export-authority-submission-log');
const {
  leadAcquisitionChannel,
  leadPriority,
  leadRoute,
  primaryKpi,
} = require('./lead-routing');

const CSV_PATH = 'docs/free-search-marketing-tracker.csv';
const DEFAULT_OUT = 'docs/first-hour-authority-execution.csv';
const FIRST_HOUR_TARGETS = [
  'Google Business Profile',
  'MenuSifu restaurant consultants',
  '39 Miles restaurant consultants',
  'Pilot restaurant testimonial',
];
const HEADERS = [
  'position',
  'action_type',
  'priority',
  'channel',
  'target',
  'projected_authority_delta',
  'projected_authority_score',
  'contact_url',
  'landing_url',
  'utm_url',
  'anchor_or_listing_phrase',
  'subject',
  'copy_paste_payload',
  'execution_checklist',
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

function parseArgs(argv) {
  const args = {
    out: DEFAULT_OUT,
    today: todayIso(),
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
    } else {
      throw new Error(`Unexpected argument: ${arg}`);
    }
  }

  if (!args.help && !/^\d{4}-\d{2}-\d{2}$/.test(args.today)) {
    throw new Error('--today must use YYYY-MM-DD');
  }

  return args;
}

function addDaysIso(date, days) {
  const parsed = new Date(`${date}T00:00:00Z`);
  parsed.setUTCDate(parsed.getUTCDate() + days);
  return parsed.toISOString().slice(0, 10);
}

function csvEscape(value) {
  const text = String(value ?? '');
  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function copyPastePayload(row) {
  const packet = packetFor(row);
  return [
    packet.subject ? `Subject: ${packet.subject}` : '',
    packet.title ? `Title: ${packet.title}` : '',
    packet.tagline ? `Tagline: ${packet.tagline}` : '',
    packet.shortDescription ? `Short description: ${packet.shortDescription}` : '',
    packet.longDescription,
    packet.followUp ? `Follow-up: ${packet.followUp}` : '',
  ].filter(Boolean).join('\n\n');
}

function projectedAuthorityImpact(rows, target, { today = todayIso() } = {}) {
  const current = authorityScore(rows).score;
  const projectedRows = rows.map((row) => {
    if (row.target !== target) return { ...row };
    return {
      ...row,
      status: 'submitted',
      owner: row.owner || 'Serviio',
      date_submitted: row.date_submitted || today,
      notes: row.notes || 'Projected first-hour authority submission.',
    };
  });
  const projected = authorityScore(projectedRows).score;
  return {
    projected_authority_delta: projected - current,
    projected_authority_score: projected,
  };
}

function buildFirstHourAuthorityRows(rows, { today = todayIso() } = {}) {
  const followUpDate = addDaysIso(today, 7);
  return FIRST_HOUR_TARGETS.map((target, index) => {
    const row = rows.find((candidate) => candidate.target === target);
    if (!row) {
      throw new Error(`Missing first-hour authority target: ${target}`);
    }
    const packet = packetFor(row);
    const projected = projectedAuthorityImpact(rows, row.target, { today });
    return {
      position: index + 1,
      action_type: 'submit_or_contact',
      priority: row.priority,
      channel: row.channel,
      target: row.target,
      projected_authority_delta: projected.projected_authority_delta,
      projected_authority_score: projected.projected_authority_score,
      contact_url: row.url,
      landing_url: row.landing_url,
      utm_url: row.utm_url,
      anchor_or_listing_phrase: row.anchor_or_listing_phrase,
      subject: packet.subject || packet.title,
      copy_paste_payload: copyPastePayload(row),
      execution_checklist: executionChecklist(row),
      proof_fields: evidenceNeeded(row),
      lead_priority: leadPriority(row),
      lead_route: leadRoute(row),
      primary_kpi: primaryKpi(row),
      expected_lead_acquisition_channel: leadAcquisitionChannel(row),
      tracker_command: trackerCommand(row, today, followUpDate),
    };
  });
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
    console.log('Usage: node scripts/export-first-hour-authority-csv.js [--out docs/first-hour-authority-execution.csv] [--today YYYY-MM-DD]');
    return;
  }

  const rows = parseCsv(fs.readFileSync(CSV_PATH, 'utf8'));
  const firstHourRows = buildFirstHourAuthorityRows(rows, args);
  const outPath = path.resolve(args.out || DEFAULT_OUT);
  fs.writeFileSync(outPath, `${toCsv(firstHourRows)}\n`);
  process.stdout.write(`Wrote ${firstHourRows.length} first-hour authority rows to ${outPath}\n`);
}

if (require.main === module) {
  main();
}

module.exports = {
  buildFirstHourAuthorityRows,
  parseArgs,
  toCsv,
};
