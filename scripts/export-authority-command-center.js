const fs = require('fs');
const path = require('path');
const { authorityScore, nextMilestones } = require('./audit-seo-authority');
const { parseCsv } = require('./print-free-search-submission-packets');
const { buildFirstHourAuthorityRows } = require('./export-first-hour-authority-csv');
const { buildEvidencePreflightRows } = require('./sync-authority-submission-log');
const { buildLiveListingPreflightRows } = require('./sync-live-listing-optimization-log');

const TRACKER_PATH = 'docs/free-search-marketing-tracker.csv';
const FIRST_HOUR_LOG_PATH = 'docs/authority-first-hour-submission-log.csv';
const LIVE_LISTING_PATH = 'docs/live-listing-optimization.csv';
const DEFAULT_OUT = 'docs/authority-command-center.md';

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

function readyCount(rows) {
  return rows.filter((row) => row.ready_for_sync).length;
}

function pendingEvidenceLines(rows, limit = 8) {
  return rows
    .filter((row) => !row.ready_for_sync)
    .slice(0, limit)
    .map((row) => {
      const target = row.target || row.profile_platform || '(missing target)';
      return `- ${target}: set ${row.required_fields.join(', ')}`;
    });
}

function firstHourProjection(firstHourRows) {
  const last = firstHourRows[firstHourRows.length - 1] || {};
  return {
    projectedScore: Number(last.cumulative_authority_score || 0),
    projectedDelta: Number(last.cumulative_authority_delta || 0),
  };
}

function buildAuthorityCommandCenter({
  trackerRows,
  firstHourRows,
  firstHourPreflightRows,
  liveListingPreflightRows,
  today = todayIso(),
}) {
  const summary = authorityScore(trackerRows);
  const projection = firstHourProjection(firstHourRows);
  const lines = [
    '# Serviio Authority Command Center',
    '',
    `Generated: ${today}`,
    '',
    '## Score Snapshot',
    '',
    `- Current authority score: ${summary.score}/100`,
    `- First-hour projected score after ordered completion: ${projection.projectedScore}/100`,
    `- First-hour projected delta: +${projection.projectedDelta}`,
    `- Evidence-qualified submitted or follow-up rows: ${summary.submittedRows.length}`,
    `- Evidence-qualified live authority rows: ${summary.liveRows.length}`,
    `- High-fit partner/POS/association rows started: ${summary.highFitStartedRows.length}`,
    '',
    '## First-Hour Queue',
    '',
    '| Position | Target | Individual Delta | Individual Score | Cumulative Delta | Cumulative Score |',
    '| ---: | --- | ---: | ---: | ---: | ---: |',
  ];

  for (const row of firstHourRows) {
    lines.push(`| ${row.position} | ${row.target} | ${row.projected_authority_delta} | ${row.projected_authority_score} | ${row.cumulative_authority_delta} | ${row.cumulative_authority_score} |`);
  }

  lines.push(
    '',
    '## Evidence Readiness',
    '',
    `- Rows ready for first-hour sync: ${readyCount(firstHourPreflightRows)}/${firstHourPreflightRows.length}`,
    `- Rows ready for live-listing sync: ${readyCount(liveListingPreflightRows)}/${liveListingPreflightRows.length}`,
    '',
    '### Pending First-Hour Evidence',
    '',
    ...pendingEvidenceLines(firstHourPreflightRows),
    '',
    '### Pending Live Listing Evidence',
    '',
    ...pendingEvidenceLines(liveListingPreflightRows),
    '',
    '## Commands',
    '',
    '```bash',
    'npm run marketing:submission-preflight:first-hour',
    'npm run marketing:submission-sync -- --apply --log docs/authority-first-hour-submission-log.csv',
    'npm run marketing:live-listings-preflight',
    'npm run marketing:live-listings-sync -- --apply',
    'npm run seo:authority',
    '```',
    '',
    '## Remaining Milestones',
    '',
    ...nextMilestones(summary).map((milestone) => `- ${milestone}`),
    '',
  );

  return lines.join('\n');
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log('Usage: node scripts/export-authority-command-center.js [--out docs/authority-command-center.md] [--today YYYY-MM-DD]');
    return;
  }

  const trackerRows = parseCsv(fs.readFileSync(TRACKER_PATH, 'utf8'));
  const firstHourRows = buildFirstHourAuthorityRows(trackerRows, { today: args.today });
  const firstHourPreflightRows = buildEvidencePreflightRows(parseCsv(fs.readFileSync(FIRST_HOUR_LOG_PATH, 'utf8')));
  const liveListingPreflightRows = buildLiveListingPreflightRows(parseCsv(fs.readFileSync(LIVE_LISTING_PATH, 'utf8')));
  const output = buildAuthorityCommandCenter({
    trackerRows,
    firstHourRows,
    firstHourPreflightRows,
    liveListingPreflightRows,
    today: args.today,
  });
  const outPath = path.resolve(args.out || DEFAULT_OUT);
  fs.writeFileSync(outPath, output);
  process.stdout.write(`Wrote authority command center to ${outPath}\n`);
}

if (require.main === module) {
  main();
}

module.exports = {
  buildAuthorityCommandCenter,
  parseArgs,
};
