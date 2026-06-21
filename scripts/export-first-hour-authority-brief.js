const fs = require('fs');
const { parseCsv } = require('./print-free-search-submission-packets');

const DEFAULT_LOG = 'docs/authority-first-hour-submission-log.csv';
const DEFAULT_OUT = 'docs/first-hour-authority-brief.md';

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function parseArgs(argv) {
  const args = {
    log: DEFAULT_LOG,
    out: DEFAULT_OUT,
    today: todayIso(),
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help' || arg === '-h') {
      args.help = true;
    } else if (arg === '--log') {
      args.log = argv[index + 1] || DEFAULT_LOG;
      index += 1;
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

function compactCopy(text) {
  return String(text || '')
    .split(/\s*\|\s*/)
    .map((part) => part.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join('\n');
}

function buildFirstHourAuthorityBrief(rows, { today = todayIso() } = {}) {
  const lines = [
    '# Serviio First-Hour Authority Brief',
    '',
    `Generated: ${today}`,
    '',
    'Use this brief for the next manual authority block. Complete the external action first, then fill the evidence fields before syncing anything back to the tracker.',
    '',
    '## Evidence Rule',
    '',
    '- Do not mark a row submitted until there is a submitted form confirmation, sent-message proof, dashboard screenshot, written approval, or live URL.',
    '- Keep no-POS restaurant owners as POS partner referral leads; prioritize restaurants already using 39 Miles, Square, Toast, Clover, MenuSifu, Chowbus, Mealkeyway, or another POS.',
    '',
  ];

  rows.forEach((row, index) => {
    lines.push(
      `## ${index + 1}. ${row.target}`,
      '',
      `- Channel: ${row.channel}`,
      `- Lead priority: ${row.lead_priority}`,
      `- Contact URL: ${row.submission_url}`,
      `- Clean URL: ${row.clean_url}`,
      `- UTM URL: ${row.utm_url}`,
      `- Subject or title: ${row.title_or_subject}`,
      `- Expected lead channel: ${row.expected_lead_acquisition_channel}`,
      `- Evidence needed: ${row.evidence_needed}`,
      '',
      'Execution checklist:',
      '',
      `- ${row.execution_checklist}`,
      '',
      'Copy-paste payload:',
      '',
      '```text',
      compactCopy(row.message_or_listing_copy),
      '```',
      '',
      'Evidence fields to fill after the action:',
      '',
      '- action_status: submitted',
      '- evidence_url',
      '- account_or_login',
      '- confirmation_note',
      '- submitted_date',
      `- follow_up_date: ${row.follow_up_date}`,
      '',
      'Tracker command after evidence exists:',
      '',
      '```bash',
      row.tracker_command,
      '```',
      ''
    );
  });

  lines.push(`Generated ${rows.length} first-hour authority actions from ${DEFAULT_LOG}.`, '');
  return lines.join('\n');
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log('Usage: node scripts/export-first-hour-authority-brief.js [--log docs/authority-first-hour-submission-log.csv] [--out docs/first-hour-authority-brief.md] [--today YYYY-MM-DD]');
    return;
  }

  const rows = parseCsv(fs.readFileSync(args.log, 'utf8'));
  fs.writeFileSync(args.out, buildFirstHourAuthorityBrief(rows, { today: args.today }));
  console.log(`Wrote ${args.out}`);
}

if (require.main === module) {
  main();
}

module.exports = {
  buildFirstHourAuthorityBrief,
  parseArgs,
};
