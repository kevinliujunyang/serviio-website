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
const {
  evidenceNeeded,
  executionChecklist,
} = require('./export-authority-submission-log');
const {
  leadAcquisitionChannel,
  leadPriority,
  leadRoute,
  primaryKpi,
} = require('./lead-routing');

const CSV_PATH = 'docs/free-search-marketing-tracker.csv';
const DEFAULT_OUT = 'docs/free-search-gtm-queue.csv';
const DEFAULT_READY_LIMIT = 15;
const DEFAULT_RESEARCH_LIMIT = 5;
const DEFAULT_FOLLOW_UP_LIMIT = 10;
const HEADERS = [
  'action_type',
  'opportunity_score',
  'lead_priority',
  'lead_route',
  'primary_kpi',
  'expected_lead_acquisition_channel',
  'priority',
  'channel',
  'target',
  'status',
  'contact_url',
  'landing_url',
  'utm_url',
  'anchor_or_listing_phrase',
  'evidence_needed',
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
    out: DEFAULT_OUT,
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
      args.out = argv[index + 1] || DEFAULT_OUT;
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
  return `npm run marketing:mark -- --target ${quoteShell(row.target)} --status ${quoteShell(status)} --date ${row.today} --note ${quoteShell(note)}`;
}

function commonFields(row) {
  const score = opportunityScore(row);
  return {
    opportunity_score: score.score,
    lead_priority: leadPriority(row),
    lead_route: leadRoute(row),
    primary_kpi: primaryKpi(row),
    expected_lead_acquisition_channel: leadAcquisitionChannel(row),
    priority: row.priority,
    channel: row.channel,
    target: row.target,
    status: row.status,
    contact_url: row.url,
    landing_url: row.landing_url,
    utm_url: row.utm_url,
    anchor_or_listing_phrase: row.anchor_or_listing_phrase,
    evidence_needed: evidenceNeeded(row),
    notes: row.notes,
  };
}

function withToday(row, today) {
  return { ...row, today };
}

function liveListingMessage(row) {
  if (row.target === 'Product Hunt Serviio listing') {
    return [
      'Product Hunt update checklist',
      `Live URL: ${row.url}`,
      `Website: ${row.utm_url}`,
      'Tagline: AI phone ordering for restaurants using POS systems.',
      'Categories: AI agents, Voice AI, Restaurant technology, Food and beverage',
      'Logo: https://serviio.ai/assets/logo.svg',
      'Cover/social image: https://serviio.ai/assets/og-image.png',
      'Description: Serviio answers restaurant phone calls 24/7, takes phone orders in natural conversation, supports English and Chinese, and helps POS-ready restaurants route orders toward kitchen workflows.',
      'Confirm the listing mentions Chinese restaurants, 39 Miles, Square, Toast, Clover, MenuSifu, Chowbus, and POS-ready phone orders.',
      'Evidence: record account or owner confirmation, updated listing screenshot, and the live Product Hunt URL before treating the optimization as complete.',
    ].join('\n');
  }

  return `Claim or update ${row.channel} listing. Live URL: ${row.url}`;
}

function followUpQueueRow(row) {
  if (row.follow_up_reason === 'live listing optimization') {
    return {
      action_type: 'optimize_live_listing',
      ...commonFields(row),
      subject: `Optimize live listing: ${row.anchor_or_listing_phrase}`,
      message_or_query: liveListingMessage(row),
      next_step: 'Claim or update the live listing, improve restaurant AI phone ordering/POS copy, then record owner/account confirmation or updated screenshot.',
      tracker_command: trackerCommand(row, 'live', 'Claimed or updated live listing; recorded proof or owner/account confirmation.'),
    };
  }

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
  const checklist = executionChecklist(row);
  const nextStepPrefix = /business profile/i.test(row.channel)
    ? checklist
    : packetHint(row);
  return {
    action_type: 'submit_or_contact',
    ...commonFields(row),
    subject: packet.subject || packet.title,
    message_or_query: packet.longDescription,
    next_step: `${nextStepPrefix} After action, mark submitted with confirmation details.`,
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

function pendingBusinessProfileRows(rows) {
  return rows.filter((row) =>
    row.status === 'not_started' &&
    /business profile/i.test(row.channel) &&
    row.priority === 'P0' &&
    row.url
  );
}

function pendingCustomerProofRows(rows) {
  return rows.filter((row) =>
    row.status === 'not_started' &&
    /customer proof/i.test(row.channel) &&
    row.url
  );
}

function buildGtmQueueRows(rows, {
  today = todayIso(),
  followUpLimit = DEFAULT_FOLLOW_UP_LIMIT,
  readyLimit = DEFAULT_READY_LIMIT,
  researchLimit = DEFAULT_RESEARCH_LIMIT,
} = {}) {
  const followUps = followUpRows(rows, { today, limit: followUpLimit }).map((row) => followUpQueueRow(withToday(row, today)));
  const nextRows = nextActionRows(rows, { readyLimit, researchLimit });
  const readyRows = nextRows.readyRows.map((row) => readyQueueRow(withToday(row, today)));
  const queuedTargets = new Set([
    ...followUps.map((row) => row.target),
    ...readyRows.map((row) => row.target),
    ...nextRows.researchRows.map((row) => row.target),
  ]);
  const businessProfileRows = pendingBusinessProfileRows(rows)
    .filter((row) => !queuedTargets.has(row.target))
    .map((row) => readyQueueRow(withToday(row, today)));
  const missingCustomerProof = pendingCustomerProofRows(rows)
    .find((row) => !queuedTargets.has(row.target));
  const customerProofRows = missingCustomerProof
    ? [readyQueueRow(withToday(missingCustomerProof, today))]
    : [];
  return [
    ...followUps,
    ...readyRows,
    ...businessProfileRows,
    ...customerProofRows,
    ...nextRows.researchRows.map((row) => researchQueueRow(withToday(row, today))),
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
    console.log('Usage: node scripts/export-free-search-gtm-queue.js [--out docs/free-search-gtm-queue.csv] [--today YYYY-MM-DD] [--follow-up-limit 10] [--ready-limit 10] [--research-limit 5]');
    return;
  }

  const rows = parseCsv(fs.readFileSync(CSV_PATH, 'utf8'));
  const queueRows = buildGtmQueueRows(rows, args);
  const output = `${toCsv(queueRows)}\n`;

  const outPath = path.resolve(args.out || DEFAULT_OUT);
  fs.writeFileSync(outPath, output);
  process.stdout.write(`Wrote ${queueRows.length} GTM queue rows to ${outPath}\n`);
}

if (require.main === module) {
  main();
}

module.exports = {
  buildGtmQueueRows,
  parseArgs,
  toCsv,
};
