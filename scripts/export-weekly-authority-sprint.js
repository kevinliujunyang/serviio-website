const fs = require('fs');
const path = require('path');
const { authorityScore, nextMilestones } = require('./audit-seo-authority');
const { buildGtmQueueRows } = require('./export-free-search-gtm-queue');
const { opportunityScore, parseCsv } = require('./print-free-search-submission-packets');

const CSV_PATH = 'docs/free-search-marketing-tracker.csv';
const DEFAULT_OUT = 'docs/weekly-authority-sprint.md';
const DEFAULT_SUBMISSION_TARGET = 15;
const DEFAULT_LIVE_TARGET = 5;
const DEFAULT_HIGH_FIT_TARGET = 8;

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
    submissionTarget: DEFAULT_SUBMISSION_TARGET,
    liveTarget: DEFAULT_LIVE_TARGET,
    highFitTarget: DEFAULT_HIGH_FIT_TARGET,
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
    } else if (arg === '--submission-target') {
      args.submissionTarget = parsePositiveInteger('--submission-target', argv[index + 1]);
      index += 1;
    } else if (arg === '--live-target') {
      args.liveTarget = parsePositiveInteger('--live-target', argv[index + 1]);
      index += 1;
    } else if (arg === '--high-fit-target') {
      args.highFitTarget = parsePositiveInteger('--high-fit-target', argv[index + 1]);
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

function gap(current, target) {
  return Math.max(0, target - current);
}

function actionRows(rows, args) {
  return buildGtmQueueRows(rows, {
    today: args.today,
    followUpLimit: 10,
    readyLimit: args.submissionTarget,
    researchLimit: 5,
  });
}

function renderActionTable(rows) {
  const lines = [
    '| # | Action | Score | Target | Channel | Evidence needed |',
    '| --- | --- | ---: | --- | --- | --- |',
  ];

  rows.forEach((row, index) => {
    const score = row.opportunity_score || opportunityScore(row).score;
    const evidence = row.action_type === 'follow_up'
      ? 'Reply, live URL, rejection note, or next follow-up date'
      : 'Confirmation note, account/login, submitted date, and follow-up date';
    lines.push(`| ${index + 1} | ${row.action_type} | ${score} | ${row.target} | ${row.channel} | ${evidence} |`);
  });

  return lines;
}

function buildWeeklyAuthoritySprint(rows, args = {}) {
  const options = {
    today: todayIso(),
    submissionTarget: DEFAULT_SUBMISSION_TARGET,
    liveTarget: DEFAULT_LIVE_TARGET,
    highFitTarget: DEFAULT_HIGH_FIT_TARGET,
    ...args,
  };
  const summary = authorityScore(rows);
  const queueRows = actionRows(rows, options);
  const submittedGap = gap(summary.submittedRows.length, options.submissionTarget);
  const liveGap = gap(summary.liveRows.length, options.liveTarget);
  const highFitGap = gap(summary.highFitStartedRows.length, options.highFitTarget);

  const lines = [
    '# Serviio Weekly Authority Sprint',
    '',
    `Generated: ${options.today}`,
    '',
    'Goal: move Serviio from technically SEO-ready to ranking-authority-ready for Chinese restaurant AI phone ordering and POS-integrated phone-order searches.',
    '',
    '## Current Authority Snapshot',
    '',
    `- Authority score: ${summary.score}/100`,
    `- Evidence-qualified submitted or follow-up rows: ${summary.submittedRows.length}/${options.submissionTarget}`,
    `- Evidence-qualified live authority rows: ${summary.liveRows.length}/${options.liveTarget}`,
    `- High-fit partner/POS/association rows started: ${summary.highFitStartedRows.length}/${options.highFitTarget}`,
    `- Business profiles started: ${summary.businessProfileRows.length}/3`,
    `- Customer proof rows started: ${summary.customerProofRows.length}/1`,
    '',
    '## This Week Must Produce',
    '',
    `- ${submittedGap} more evidence-qualified submissions or partner contacts.`,
    `- ${liveGap} live listings, backlinks, business profiles, or published resource links.`,
    `- ${highFitGap} high-fit POS, partner, association, restaurant-tech, or customer-proof starts.`,
    '- 1 customer proof request or testimonial follow-up if no customer-proof row is started.',
    '',
    '## Milestone Gaps',
    '',
    ...nextMilestones(summary).map((milestone) => `- ${milestone}`),
    '',
    '## Execution Queue',
    '',
    ...renderActionTable(queueRows.slice(0, options.submissionTarget)),
    '',
    '## Evidence Rules',
    '',
    '- Do not mark rows submitted until the external form, email, listing, profile, or community post is actually sent.',
    '- For submitted rows, record `owner`, `date_submitted`, and a concrete `notes` value.',
    '- For live rows, record `date_live` and replace the tracker URL with the visible live listing, profile, backlink, or proof URL.',
    '- After filling `docs/authority-submission-log.csv`, run `npm run marketing:submission-sync` first and only apply when the dry run has no unexpected issues.',
    '',
    '## Required End-Of-Sprint Checks',
    '',
    '```bash',
    'npm run marketing:submission-sync',
    'npm run seo:authority',
    'npm run search:sample',
    '```',
    '',
    `Generated from ${CSV_PATH}.`,
    '',
  ];

  return lines.join('\n');
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log('Usage: node scripts/export-weekly-authority-sprint.js [--out docs/weekly-authority-sprint.md] [--today YYYY-MM-DD] [--submission-target 15] [--live-target 5] [--high-fit-target 8]');
    return;
  }

  const rows = parseCsv(fs.readFileSync(CSV_PATH, 'utf8'));
  const markdown = buildWeeklyAuthoritySprint(rows, args);
  const outPath = path.resolve(args.out || DEFAULT_OUT);
  fs.writeFileSync(outPath, markdown);
  console.log(`Wrote ${outPath}`);
}

if (require.main === module) {
  main();
}

module.exports = {
  buildWeeklyAuthoritySprint,
  parseArgs,
};
