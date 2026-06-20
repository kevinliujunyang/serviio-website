const fs = require('fs');
const {
  packetFor,
  parseCsv,
} = require('./print-free-search-submission-packets');

const CSV_PATH = 'docs/free-search-marketing-tracker.csv';
const DEFAULT_OUT = 'docs/business-profile-submission-pack.md';

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

  return args;
}

function businessProfileRows(rows) {
  return rows.filter((row) =>
    row.priority === 'P0' &&
    row.channel === 'Business profile' &&
    row.status === 'not_started'
  );
}

function trackerCommand(row, today) {
  return `npm run marketing:mark -- --target "${row.target}" --status submitted --date ${today} --note "Created or claimed business profile; record verification status and live profile URL when available."`;
}

function liveTrackerCommand(row, today) {
  return `npm run marketing:mark -- --target "${row.target}" --status live --date ${today} --url "https://PROFILE-URL-HERE" --note "Published business profile; replace placeholder URL with live profile URL and keep verification screenshot or dashboard confirmation."`;
}

function buildBusinessProfilePack(rows, { today = todayIso() } = {}) {
  const profiles = businessProfileRows(rows);
  const lines = [
    '# Serviio Business Profile Submission Pack',
    '',
    `Generated: ${today}`,
    '',
    'Use this pack to create or claim Serviio profiles on Google Business Profile, Bing Places for Business, and Apple Business Connect when eligible.',
    '',
    '## Shared Business Details',
    '',
    '- Business name: Serviio',
    '- Website: https://serviio.ai/',
    '- Phone: (408) 409-9079',
    '- Email: info@serviio.ai',
    '- Business type: Service-area business serving restaurant owners in the United States',
    '- Category candidates: Software company, Business service, Restaurant technology, Marketing service',
    '- Short description: AI phone ordering for restaurants using POS systems.',
    '- Pricing: 2% per completed order. No monthly fees and no setup costs.',
    '- Service focus: Chinese restaurants and takeout-heavy restaurants using 39 Miles, Square, Toast, Clover, MenuSifu, Chowbus, Mealkeyway, or another POS.',
    '',
  ];

  for (const [index, row] of profiles.entries()) {
    const packet = packetFor(row);
    lines.push(
      `## ${index + 1}. ${row.target}`,
      '',
      `- Submission URL: ${row.url}`,
      `- Tracker UTM URL: ${row.utm_url}`,
      `- Clean URL: ${row.landing_url}`,
      `- Listing phrase: ${row.anchor_or_listing_phrase}`,
      '',
      'Copy:',
      '',
      `Title: ${packet.title}`,
      `Tagline: ${packet.tagline}`,
      `Short description: ${packet.shortDescription}`,
      '',
      packet.longDescription,
      '',
      `Categories: ${packet.categories}`,
      `Features: ${packet.features}`,
      '',
      'Evidence to capture:',
      '',
      '- Account/login used for the profile',
      '- Verification screenshot or dashboard confirmation',
      '- Live profile URL once published',
      '- Submitted date, verification status, and any pending review date',
      '',
      'Tracker update command after profile creation or claim:',
      '',
      '```bash',
      trackerCommand(row, today),
      '```',
      '',
      'Tracker update command after the profile is live:',
      '',
      '```bash',
      liveTrackerCommand(row, today),
      '```',
      ''
    );
  }

  lines.push(`Generated ${profiles.length} business profile actions from ${CSV_PATH}.`, '');
  return lines.join('\n');
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log('Usage: node scripts/export-business-profile-pack.js [--out docs/business-profile-submission-pack.md] [--today YYYY-MM-DD]');
    return;
  }

  const rows = parseCsv(fs.readFileSync(CSV_PATH, 'utf8'));
  fs.writeFileSync(args.out, buildBusinessProfilePack(rows, { today: args.today }));
  console.log(`Wrote ${args.out}`);
}

if (require.main === module) {
  main();
}

module.exports = {
  buildBusinessProfilePack,
  parseArgs,
};
