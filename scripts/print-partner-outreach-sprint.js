const fs = require('fs');
const {
  opportunityScore,
  packetFor,
  parseCsv,
  readySubmissionRows,
} = require('./print-free-search-submission-packets');

const CSV_PATH = 'docs/free-search-marketing-tracker.csv';
const DEFAULT_LIMIT = 8;
const SPRINT_CHANNELS = new Set([
  'Partner outreach',
  'POS-specific outreach',
  'Restaurant technology directory',
  'Educational resource listing',
  'Chinese business association',
  'Asian chamber',
]);

function parseArgs(argv) {
  const args = { limit: DEFAULT_LIMIT, help: false };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help' || arg === '-h') {
      args.help = true;
    } else if (arg === '--limit') {
      args.limit = Number(argv[index + 1] || DEFAULT_LIMIT);
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

function isSprintRow(row) {
  return SPRINT_CHANNELS.has(row.channel);
}

function sprintRows(rows, { limit = DEFAULT_LIMIT } = {}) {
  return readySubmissionRows(rows)
    .filter(isSprintRow)
    .slice(0, limit);
}

function printMessageBlock(label, text) {
  if (!text) return;
  console.log(`${label}:`);
  console.log(text);
  console.log('');
}

function printSprint(rows) {
  console.log('# Serviio Partner Outreach Sprint');
  console.log('');
  console.log('Goal: create backlinks, referral paths, and POS-ready Chinese restaurant leads from the highest-score off-site opportunities.');
  console.log('Use each UTM URL when possible; use the clean landing URL only if a form rejects tracking parameters.');
  console.log('');

  for (const [index, row] of rows.entries()) {
    const packet = packetFor(row);
    const opportunity = opportunityScore(row);

    console.log(`## ${index + 1}. ${row.target}`);
    console.log(`Score: ${opportunity.score}/100 (${opportunity.reasons})`);
    console.log(`Channel: ${row.channel}`);
    console.log(`Contact URL: ${row.url}`);
    console.log(`UTM URL: ${row.utm_url}`);
    console.log(`Clean URL: ${row.landing_url}`);
    console.log(`Anchor/listing phrase: ${row.anchor_or_listing_phrase}`);
    console.log(`Subject: ${packet.subject || packet.title}`);
    console.log('');
    printMessageBlock('First message', packet.longDescription);
    printMessageBlock('Follow-up', packet.followUp);
    console.log('Tracker update after action: status=submitted, owner=Serviio, date_submitted=YYYY-MM-DD, notes=<confirmation or follow-up needed>.');
    console.log('');
  }

  console.log(`Generated ${rows.length} sprint actions from ${CSV_PATH}`);
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log('Usage: node scripts/print-partner-outreach-sprint.js [--limit 8]');
    return;
  }

  const rows = sprintRows(parseCsv(fs.readFileSync(CSV_PATH, 'utf8')), { limit: args.limit });
  printSprint(rows);
}

if (require.main === module) {
  main();
}

module.exports = {
  isSprintRow,
  parseArgs,
  sprintRows,
};
