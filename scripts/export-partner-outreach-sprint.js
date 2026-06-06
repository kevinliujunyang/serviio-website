const fs = require('fs');
const {
  opportunityScore,
  packetFor,
  parseCsv,
} = require('./print-free-search-submission-packets');
const { sprintRows } = require('./print-partner-outreach-sprint');

const CSV_PATH = 'docs/free-search-marketing-tracker.csv';
const DEFAULT_OUT = 'docs/partner-outreach-sprint.md';
const DEFAULT_LIMIT = 8;

function todayIso() {
  return new Date().toISOString().slice(0, 10);
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
      args.limit = Number(argv[index + 1] || DEFAULT_LIMIT);
      index += 1;
    } else if (arg === '--today') {
      args.today = argv[index + 1] || args.today;
      index += 1;
    } else {
      throw new Error(`Unexpected argument: ${arg}`);
    }
  }

  if (!Number.isInteger(args.limit) || args.limit < 1) {
    throw new Error('--limit must be a positive integer');
  }

  return args;
}

function trackerCommand(row, today) {
  return `npm run marketing:mark -- --target "${row.target}" --status submitted --date ${today} --note "Submitted outreach/contact form; follow up in 7 days or record live link/reply."`;
}

function buildPartnerSprintMarkdown(rows, { limit = DEFAULT_LIMIT, today = todayIso() } = {}) {
  const sprint = sprintRows(rows, { limit });
  const lines = [
    '# Serviio Partner Outreach Sprint',
    '',
    `Generated: ${today}`,
    '',
    'Goal: create backlinks, referral paths, and POS-ready Chinese restaurant leads from the highest-score off-site opportunities.',
    'Authority score is still blocked until submitted rows become live links, profiles, partner replies, or documented customer proof.',
    '',
    'Use each UTM URL when possible. If a form rejects tracking parameters, use the clean landing URL and still record the UTM in notes.',
    '',
  ];

  for (const [index, row] of sprint.entries()) {
    const packet = packetFor(row);
    const score = opportunityScore(row);
    lines.push(
      `## ${index + 1}. ${row.target}`,
      '',
      `- Score: ${score.score}/100 (${score.reasons})`,
      `- Channel: ${row.channel}`,
      `- Contact URL: ${row.url}`,
      `- UTM URL: ${row.utm_url}`,
      `- Clean URL: ${row.landing_url}`,
      `- Anchor/listing phrase: ${row.anchor_or_listing_phrase}`,
      `- Subject: ${packet.subject || packet.title}`,
      '',
      'Message:',
      '',
      packet.longDescription,
      ''
    );

    if (packet.followUp) {
      lines.push('Follow-up:', '', packet.followUp, '');
    }

    lines.push('Tracker update command:', '', '```bash', trackerCommand(row, today), '```', '');
  }

  lines.push(`Generated ${sprint.length} sprint actions from ${CSV_PATH}.`, '');
  return lines.join('\n');
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log('Usage: node scripts/export-partner-outreach-sprint.js [--out docs/partner-outreach-sprint.md] [--limit 8] [--today YYYY-MM-DD]');
    return;
  }

  const rows = parseCsv(fs.readFileSync(CSV_PATH, 'utf8'));
  const markdown = buildPartnerSprintMarkdown(rows, { limit: args.limit, today: args.today });
  fs.writeFileSync(args.out, markdown);
  console.log(`Wrote ${args.out}`);
}

if (require.main === module) {
  main();
}

module.exports = {
  buildPartnerSprintMarkdown,
  parseArgs,
};
