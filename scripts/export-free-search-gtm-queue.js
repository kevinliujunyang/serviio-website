const fs = require('fs');
const path = require('path');
const { followUpRows } = require('./print-free-search-follow-ups');
const {
  opportunityScore,
  packetFor,
  parseCsv,
} = require('./print-free-search-submission-packets');
const {
  nextActionRows,
  packetHint,
  researchQueries,
} = require('./print-free-search-next-actions');

const CSV_PATH = 'docs/free-search-marketing-tracker.csv';
const DEFAULT_READY_LIMIT = 10;
const DEFAULT_RESEARCH_LIMIT = 5;
const DEFAULT_FOLLOW_UP_LIMIT = 10;
const HEADERS = [
  'action_type',
  'opportunity_score',
  'priority',
  'channel',
  'target',
  'status',
  'contact_url',
  'landing_url',
  'utm_url',
  'anchor_or_listing_phrase',
  'subject',
  'message_or_query',
  'next_step',
  'tracker_command',
  'notes',
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
    out: '',
    today: todayIso(),
    readyLimit: DEFAULT_READY_LIMIT,
    researchLimit: DEFAULT_RESEARCH_LIMIT,
    followUpLimit: DEFAULT_FOLLOW_UP_LIMIT,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help' || arg === '-h') {
      args.help = true;
    } else if (arg === '--out') {
      args.out = argv[index + 1] || '';
      index += 1;
    } else if (arg === '--today') {
      args.today = argv[index + 1] || '';
      index += 1;
    } else if (arg === '--ready-limit') {
      args.readyLimit = parsePositiveInteger('--ready-limit', argv[index + 1]);
      index += 1;
    } else if (arg === '--research-limit') {
      args.researchLimit = parsePositiveInteger('--research-limit', argv[index + 1]);
      index += 1;
    } else if (arg === '--follow-up-limit') {
      args.followUpLimit = parsePositiveInteger('--follow-up-limit', argv[index + 1]);
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

function trackerCommand(row, status, note) {
  return `npm run marketing:mark -- --target ${quoteShell(row.target)} --status ${quoteShell(status)} --note ${quoteShell(note)}`;
}

function commonFields(row) {
  const score = opportunityScore(row);
  return {
    opportunity_score: score.score,
    priority: row.priority,
    channel: row.channel,
    target: row.target,
    status: row.status,
    contact_url: row.url,
    landing_url: row.landing_url,
    utm_url: row.utm_url,
    anchor_or_listing_phrase: row.anchor_or_listing_phrase,
    notes: row.notes,
  };
}

function followUpQueueRow(row) {
  return {
    action_type: 'follow_up',
    ...commonFields(row),
    subject: `Follow up: ${row.anchor_or_listing_phrase}`,
    message_or_query: `Follow up on ${row.channel} submission. Contact URL: ${row.url}`,
    next_step: 'Follow up, ask for listing/backlink/referral status, then record reply or live URL.',
    tracker_command: trackerCommand(row, 'follow-up needed', 'Followed up; waiting for reply or live listing.'),
  };
}

function readyQueueRow(row) {
  const packet = packetFor(row);
  return {
    action_type: 'submit_or_contact',
    ...commonFields(row),
    subject: packet.subject || packet.title,
    message_or_query: packet.longDescription,
    next_step: `${packetHint(row)} After action, mark submitted with confirmation details.`,
    tracker_command: trackerCommand(row, 'submitted', 'Submitted/contacted; add confirmation or next follow-up detail.'),
  };
}

function researchQueueRow(row) {
  return {
    action_type: 'research_target',
    ...commonFields(row),
    subject: `Research target: ${row.target}`,
    message_or_query: researchQueries(row).join(' | '),
    next_step: 'Find a real submission/contact URL, update tracker URL, or mark rejected/not relevant in notes.',
    tracker_command: trackerCommand(row, 'not_started', 'Researched target; update URL or notes with result.'),
  };
}

function buildGtmQueueRows(rows, {
  today = todayIso(),
  followUpLimit = DEFAULT_FOLLOW_UP_LIMIT,
  readyLimit = DEFAULT_READY_LIMIT,
  researchLimit = DEFAULT_RESEARCH_LIMIT,
} = {}) {
  const followUps = followUpRows(rows, { today, limit: followUpLimit }).map(followUpQueueRow);
  const nextRows = nextActionRows(rows, { readyLimit, researchLimit });
  return [
    ...followUps,
    ...nextRows.readyRows.map(readyQueueRow),
    ...nextRows.researchRows.map(researchQueueRow),
  ];
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
    console.log('Usage: node scripts/export-free-search-gtm-queue.js [--out gtm-queue.csv] [--today YYYY-MM-DD] [--follow-up-limit 10] [--ready-limit 10] [--research-limit 5]');
    return;
  }

  const rows = parseCsv(fs.readFileSync(CSV_PATH, 'utf8'));
  const queueRows = buildGtmQueueRows(rows, args);
  const output = `${toCsv(queueRows)}\n`;

  if (args.out) {
    const outPath = path.resolve(args.out);
    fs.writeFileSync(outPath, output);
    process.stdout.write(`Wrote ${queueRows.length} GTM queue rows to ${outPath}\n`);
  } else {
    process.stdout.write(output);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  buildGtmQueueRows,
  parseArgs,
  toCsv,
};
