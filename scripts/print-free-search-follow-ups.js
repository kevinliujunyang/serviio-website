const fs = require('fs');
const { opportunityScore, parseCsv } = require('./print-free-search-submission-packets');

const CSV_PATH = 'docs/free-search-marketing-tracker.csv';
const DEFAULT_OUT = '';
const DEFAULT_DAYS = 7;
const DEFAULT_LIMIT = 12;
const AUTHORITY_MEDIA_KIT_URL = 'https://serviio.ai/authority-media-kit/';
const CUSTOMER_PROOF_REQUEST_URL = 'https://serviio.ai/customer-proof-request/';
const ACTIVE_STATUSES = new Set(['submitted', 'follow-up needed']);
const FOLLOW_UP_CHANNELS = new Set([
  'AI directory',
  'Asian chamber',
  'Business profile',
  'Chinese business association',
  'Community post',
  'Customer proof',
  'Educational resource listing',
  'Partner outreach',
  'POS-specific outreach',
  'Restaurant technology directory',
  'Startup directory',
]);
const LIVE_OPTIMIZATION_PATTERN = /\bclaim(?:ed|ing)?\b.*\bpending\b|\bupdate(?:d|ing)?\b.*\bpending\b|\bclaim\/update access still pending\b/i;

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function parseArgs(argv) {
  const args = {
    csvPath: CSV_PATH,
    today: todayIso(),
    days: DEFAULT_DAYS,
    limit: DEFAULT_LIMIT,
    out: DEFAULT_OUT,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help' || arg === '-h') {
      args.help = true;
    } else if (arg === '--csv') {
      args.csvPath = argv[index + 1];
      index += 1;
    } else if (arg === '--today') {
      args.today = argv[index + 1];
      index += 1;
    } else if (arg === '--days') {
      args.days = Number(argv[index + 1]);
      index += 1;
    } else if (arg === '--limit') {
      args.limit = Number(argv[index + 1]);
      index += 1;
    } else if (arg === '--out') {
      args.out = argv[index + 1] || DEFAULT_OUT;
      index += 1;
    } else {
      throw new Error(`Unexpected argument: ${arg}`);
    }
  }

  if (args.help) return args;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(args.today)) throw new Error('--today must use YYYY-MM-DD');
  if (!Number.isInteger(args.days) || args.days < 1) throw new Error('--days must be a positive integer');
  if (!Number.isInteger(args.limit) || args.limit < 1) throw new Error('--limit must be a positive integer');
  return args;
}

function addDays(dateText, days) {
  const date = new Date(`${dateText}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function daysBetween(startText, endText) {
  const start = new Date(`${startText}T00:00:00Z`);
  const end = new Date(`${endText}T00:00:00Z`);
  return Math.floor((end - start) / 86400000);
}

function needsLiveOptimization(row) {
  return row.status === 'live' &&
    row.date_live &&
    FOLLOW_UP_CHANNELS.has(row.channel) &&
    LIVE_OPTIMIZATION_PATTERN.test(row.notes || '');
}

function submittedFollowUpRow(row, today, days) {
  const followUpDelay = row.status === 'follow-up needed' ? 0 : days;
  const dueDate = addDays(row.date_submitted, followUpDelay);
  return {
    ...row,
    follow_up_reason: row.status === 'follow-up needed' ? 'manual follow-up' : 'submitted listing follow-up',
    due_date: dueDate,
    days_waiting: daysBetween(row.date_submitted, today),
    overdue_days: Math.max(0, daysBetween(dueDate, today)),
  };
}

function liveOptimizationRow(row, today) {
  return {
    ...row,
    follow_up_reason: 'live listing optimization',
    due_date: row.date_live,
    days_waiting: daysBetween(row.date_live, today),
    overdue_days: Math.max(0, daysBetween(row.date_live, today)),
  };
}

function followUpRows(rows, { today = todayIso(), days = DEFAULT_DAYS, limit } = {}) {
  const dueRows = rows
    .filter((row) => FOLLOW_UP_CHANNELS.has(row.channel))
    .map((row) => {
      if (ACTIVE_STATUSES.has(row.status) && row.date_submitted && !row.date_live) {
        return submittedFollowUpRow(row, today, days);
      }
      if (needsLiveOptimization(row)) return liveOptimizationRow(row, today);
      return null;
    })
    .filter(Boolean)
    .filter((row) => row.due_date <= today)
    .sort((a, b) => {
      const statusDiff = Number(b.status === 'follow-up needed') - Number(a.status === 'follow-up needed');
      if (statusDiff) return statusDiff;
      const overdueDiff = b.overdue_days - a.overdue_days;
      if (overdueDiff) return overdueDiff;
      return opportunityScore(b).score - opportunityScore(a).score;
    });

  return Number.isInteger(limit) ? dueRows.slice(0, limit) : dueRows;
}

function quoteShell(text) {
  return `"${String(text).replace(/"/g, '\\"')}"`;
}

function renderFollowUpReport(rows) {
  const lines = [
    '# Serviio Free Search Follow-Up Queue',
    '',
    'Use this queue after manual outreach sessions to turn submitted rows into replies, live backlinks, partner referral paths, or clear rejections.',
    '',
  ];

  if (!rows.length) {
    lines.push('No follow-ups are due.');
    return `${lines.join('\n')}\n`;
  }

  for (const [index, row] of rows.entries()) {
    const score = opportunityScore(row);
    lines.push(`## ${index + 1}. ${row.target}`);
    lines.push(`Status: ${row.status}`);
    lines.push(`Channel: ${row.channel}`);
    lines.push(`Opportunity score: ${score.score}/100 (${score.reasons})`);
    lines.push(`Submitted: ${row.date_submitted}`);
    lines.push(`Due: ${row.due_date}`);
    lines.push(`Days waiting: ${row.days_waiting}`);
    lines.push(`Reason: ${row.follow_up_reason}`);
    lines.push(`Contact URL: ${row.url}`);
    lines.push(`Landing URL: ${row.landing_url}`);
    lines.push(`UTM URL: ${row.utm_url}`);
    lines.push(`Anchor/listing phrase: ${row.anchor_or_listing_phrase}`);
    lines.push(`Authority media kit: ${AUTHORITY_MEDIA_KIT_URL}`);
    lines.push(`Customer proof request: ${CUSTOMER_PROOF_REQUEST_URL}`);
    if (row.follow_up_reason === 'live listing optimization') {
      lines.push('Next step: Claim or update the live listing, strengthen restaurant AI phone ordering and POS integration copy, then record proof.');
      lines.push(`Next tracker command: npm run marketing:mark -- --target ${quoteShell(row.target)} --status "live" --note "Claimed or updated live listing; recorded proof or owner/account confirmation."`);
    } else {
      lines.push(`Next tracker command: npm run marketing:mark -- --target ${quoteShell(row.target)} --status "follow-up needed" --note "Followed up; waiting for reply or live listing."`);
    }
    lines.push('');
  }

  return `${lines.join('\n')}\n`;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log('Usage: node scripts/print-free-search-follow-ups.js [--days 7] [--today YYYY-MM-DD] [--limit 12] [--out docs/free-search-follow-up-queue.md]');
    return;
  }

  const rows = parseCsv(fs.readFileSync(args.csvPath, 'utf8'));
  const report = renderFollowUpReport(followUpRows(rows, args));
  if (args.out) {
    fs.writeFileSync(args.out, report);
    console.log(`Wrote ${args.out}`);
  } else {
    process.stdout.write(report);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  followUpRows,
  needsLiveOptimization,
  parseArgs,
  renderFollowUpReport,
};
