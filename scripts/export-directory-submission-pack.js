const fs = require('fs');
const {
  opportunityScore,
  packetFor,
  parseCsv,
  readySubmissionRows,
} = require('./print-free-search-submission-packets');

const CSV_PATH = 'docs/free-search-marketing-tracker.csv';
const DEFAULT_OUT = 'docs/directory-submission-pack.md';
const DEFAULT_LIMIT = 15;
const DIRECTORY_CHANNELS = new Set([
  'AI directory',
  'Startup directory',
  'Restaurant technology directory',
  'Educational resource listing',
]);

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

function directoryRows(rows, { limit = DEFAULT_LIMIT } = {}) {
  return readySubmissionRows(rows)
    .filter((row) => DIRECTORY_CHANNELS.has(row.channel))
    .slice(0, limit);
}

function trackerCommand(row, today) {
  return `npm run marketing:mark -- --target "${row.target}" --status submitted --date ${today} --note "Submitted directory/listing request; follow up in 7 days or record live listing URL."`;
}

function sectionLabel(row) {
  if (row.channel === 'Restaurant technology directory') {
    return 'Restaurant POS and automation directories';
  }
  if (row.channel === 'Educational resource listing') {
    return 'Restaurant education and resource listings';
  }
  return 'AI tool directories';
}

function appendPacket(lines, row, index, today) {
  const packet = packetFor(row);
  const score = opportunityScore(row);

  lines.push(
    `## ${index + 1}. ${row.target}`,
    '',
    `- Section: ${sectionLabel(row)}`,
    `- Score: ${score.score}/100 (${score.reasons})`,
    `- Channel: ${row.channel}`,
    `- Submission URL: ${row.url}`,
    `- UTM URL: ${row.utm_url}`,
    `- Clean URL: ${row.landing_url}`,
    `- Anchor/listing phrase: ${row.anchor_or_listing_phrase}`,
    '',
    'Listing copy:',
    '',
    `Title: ${packet.title}`,
    `Tagline: ${packet.tagline}`,
    `Short description: ${packet.shortDescription}`,
    '',
    packet.longDescription,
    '',
    `Categories: ${packet.categories}`,
    `Features: ${packet.features}`,
    `Pricing: ${packet.pricing}`,
    '',
    'Tracker update command:',
    '',
    '```bash',
    trackerCommand(row, today),
    '```',
    ''
  );
}

function buildDirectorySubmissionPack(rows, { limit = DEFAULT_LIMIT, today = todayIso() } = {}) {
  const directories = directoryRows(rows, { limit });
  const lines = [
    '# Serviio Directory Submission Pack',
    '',
    `Generated: ${today}`,
    '',
    'Goal: Submit/contact at least 15 authority targets that can create free search visibility, backlinks, referral traffic, or discovery signals for POS-ready restaurant owners.',
    '',
    'Use this pack for AI tool directories, startup directories, restaurant technology directories, and restaurant education/resource listings. Do not update the tracker until the submission or contact actually happens.',
    '',
    '## Shared Listing Details',
    '',
    '- Product: Serviio',
    '- Website: https://serviio.ai/',
    '- Email: info@serviio.ai',
    '- Phone: (408) 409-9079',
    '- Primary buyer: Chinese restaurants and takeout-heavy restaurants in the United States that already use a POS system.',
    '- POS systems to mention: 39 Miles, Square, Toast, Clover, MenuSifu, Chowbus, and Mealkeyway.',
    '- Pricing: 2% per completed order. No monthly fees and no setup costs.',
    '- Best fallback category: Restaurant technology, AI phone answering, Restaurant POS, Voice AI, Takeout ordering.',
    '',
    '## Submission Queue',
    '',
  ];

  directories.forEach((row, index) => appendPacket(lines, row, index, today));

  lines.push(`Generated ${directories.length} directory submission actions from ${CSV_PATH}.`, '');
  return lines.join('\n');
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log('Usage: node scripts/export-directory-submission-pack.js [--out docs/directory-submission-pack.md] [--limit 15] [--today YYYY-MM-DD]');
    return;
  }

  const rows = parseCsv(fs.readFileSync(CSV_PATH, 'utf8'));
  fs.writeFileSync(args.out, buildDirectorySubmissionPack(rows, { limit: args.limit, today: args.today }));
  console.log(`Wrote ${args.out}`);
}

if (require.main === module) {
  main();
}

module.exports = {
  buildDirectorySubmissionPack,
  directoryRows,
  parseArgs,
};
