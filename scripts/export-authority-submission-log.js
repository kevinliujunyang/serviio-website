const fs = require('fs');
const path = require('path');
const {
  opportunityScore,
  packetFor,
  parseCsv,
  readySubmissionRows,
} = require('./print-free-search-submission-packets');

const CSV_PATH = 'docs/free-search-marketing-tracker.csv';
const DEFAULT_OUT = 'docs/authority-submission-log.csv';
const DEFAULT_LIMIT = 15;
const HEADERS = [
  'action_status',
  'priority',
  'channel',
  'target',
  'opportunity_score',
  'opportunity_reasons',
  'submission_url',
  'clean_url',
  'utm_url',
  'anchor_or_listing_phrase',
  'title_or_subject',
  'tagline',
  'message_or_listing_copy',
  'evidence_url',
  'account_or_login',
  'confirmation_note',
  'submitted_date',
  'live_date',
  'follow_up_date',
  'tracker_command',
];

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function addDaysIso(date, days) {
  const parsed = new Date(`${date}T00:00:00Z`);
  parsed.setUTCDate(parsed.getUTCDate() + days);
  return parsed.toISOString().slice(0, 10);
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
    limit: DEFAULT_LIMIT,
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
    } else if (arg === '--limit') {
      args.limit = parsePositiveInteger('--limit', argv[index + 1]);
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

function quoteShell(text) {
  return `"${String(text).replace(/"/g, '\\"')}"`;
}

function trackerCommand(row, today, followUpDate) {
  return `npm run marketing:mark -- --target ${quoteShell(row.target)} --status submitted --date ${today} --note "Submitted/contacted; add confirmation URL and account used. Follow up: ${followUpDate}."`;
}

function messageOrListingCopy(packet) {
  return [
    packet.subject ? `Subject: ${packet.subject}` : '',
    `Title: ${packet.title}`,
    packet.tagline ? `Tagline: ${packet.tagline}` : '',
    packet.shortDescription ? `Short description: ${packet.shortDescription}` : '',
    packet.longDescription,
    packet.followUp ? `Follow-up: ${packet.followUp}` : '',
  ].filter(Boolean).join(' | ').replace(/\s+/g, ' ').trim();
}

function buildAuthoritySubmissionLogRows(rows, { limit = DEFAULT_LIMIT, today = todayIso() } = {}) {
  const followUpDate = addDaysIso(today, 7);
  return readySubmissionRows(rows).slice(0, limit).map((row) => {
    const packet = packetFor(row);
    const score = opportunityScore(row);
    return {
      action_status: '',
      priority: row.priority,
      channel: row.channel,
      target: row.target,
      opportunity_score: score.score,
      opportunity_reasons: score.reasons,
      submission_url: row.url,
      clean_url: row.landing_url,
      utm_url: row.utm_url,
      anchor_or_listing_phrase: row.anchor_or_listing_phrase,
      title_or_subject: packet.subject || packet.title,
      tagline: packet.tagline,
      message_or_listing_copy: messageOrListingCopy(packet),
      evidence_url: '',
      account_or_login: '',
      confirmation_note: '',
      submitted_date: '',
      live_date: '',
      follow_up_date: followUpDate,
      tracker_command: trackerCommand(row, today, followUpDate),
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
    console.log('Usage: node scripts/export-authority-submission-log.js [--out docs/authority-submission-log.csv] [--limit 15] [--today YYYY-MM-DD]');
    return;
  }

  const rows = parseCsv(fs.readFileSync(CSV_PATH, 'utf8'));
  const logRows = buildAuthoritySubmissionLogRows(rows, { limit: args.limit, today: args.today });
  const outPath = path.resolve(args.out);
  fs.writeFileSync(outPath, `${toCsv(logRows)}\n`);
  console.log(`Wrote ${logRows.length} authority submission log rows to ${outPath}`);
}

if (require.main === module) {
  main();
}

module.exports = {
  addDaysIso,
  buildAuthoritySubmissionLogRows,
  parseArgs,
  toCsv,
};
