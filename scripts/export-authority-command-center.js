const fs = require('fs');
const path = require('path');
const { authorityScore, nextMilestones } = require('./audit-seo-authority');
const { parseCsv } = require('./print-free-search-submission-packets');
const { buildFirstHourAuthorityRows } = require('./export-first-hour-authority-csv');
const { actionRows, executionRowsForSprint } = require('./export-weekly-authority-sprint');
const { buildEvidencePreflightRows } = require('./sync-authority-submission-log');
const { buildLiveListingPreflightRows } = require('./sync-live-listing-optimization-log');

const TRACKER_PATH = 'docs/free-search-marketing-tracker.csv';
const FIRST_HOUR_LOG_PATH = 'docs/authority-first-hour-submission-log.csv';
const LIVE_LISTING_PATH = 'docs/live-listing-optimization.csv';
const DEFAULT_OUT = 'docs/authority-command-center.md';
const SUBMISSION_MILESTONE_TARGET = 15;

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

function projectMilestoneRows(trackerRows, milestoneRows, { today = todayIso() } = {}) {
  const targets = new Set(milestoneRows.map((row) => row.target));
  return trackerRows.map((row) => {
    if (!targets.has(row.target)) return row;
    const milestoneRow = milestoneRows.find((candidate) => candidate.target === row.target);
    if (milestoneRow.action_type === 'optimize_live_listing') {
      return {
        ...row,
        status: 'live',
        owner: row.owner || 'Serviio',
        date_submitted: row.date_submitted || today,
        date_live: row.date_live || today,
        notes: row.notes || 'Projected live listing optimization.',
      };
    }
    if (milestoneRow.action_type === 'submit_or_contact') {
      return {
        ...row,
        status: 'submitted',
        owner: row.owner || 'Serviio',
        date_submitted: row.date_submitted || today,
        notes: row.notes || 'Projected authority submission.',
      };
    }
    return row;
  });
}

function milestoneProjection(trackerRows, milestoneRows, { today = todayIso() } = {}) {
  const current = authorityScore(trackerRows).score;
  const projectedRows = projectMilestoneRows(trackerRows, milestoneRows, { today });
  const projected = authorityScore(projectedRows).score;
  return {
    projectedScore: projected,
    projectedDelta: projected - current,
  };
}

function milestoneActionRows(trackerRows, { today = todayIso() } = {}) {
  return executionRowsForSprint(actionRows(trackerRows, {
    today,
    submissionTarget: SUBMISSION_MILESTONE_TARGET,
  }), SUBMISSION_MILESTONE_TARGET).slice(0, SUBMISSION_MILESTONE_TARGET);
}

function renderMilestoneQueue(rows) {
  const lines = [
    '## 15-Submission Milestone Queue',
    '',
    'Use this queue after the first-hour block to reach the 15 submitted/contacted authority-target milestone. Keep tracker rows unchanged until external proof exists.',
    '',
    '| Position | Target | Score | Channel | Evidence needed |',
    '| ---: | --- | ---: | --- | --- |',
  ];

  rows.forEach((row, index) => {
    lines.push(`| ${index + 1} | ${row.target} | ${row.opportunity_score} | ${row.channel} | ${row.evidence_needed} |`);
  });

  return lines;
}

function renderImmediateExecutionDetails(firstHourRows) {
  const lines = [
    '## Immediate Execution Details',
    '',
    'Use these details during the next manual authority block. Do not run the tracker command until the external action is actually submitted and evidence fields are filled.',
    '',
  ];

  for (const row of firstHourRows) {
    lines.push(
      `### ${row.position}. ${row.target}`,
      '',
      `- Channel: ${row.channel}`,
      `- Contact URL: ${row.contact_url}`,
      `- Landing URL: ${row.landing_url}`,
      `- UTM URL: ${row.utm_url}`,
      `- Subject: ${row.subject}`,
      `- Proof fields: ${row.proof_fields}`,
      `- Evidence channel: ${row.expected_lead_acquisition_channel}`,
      '',
      'Tracker command after real submission:',
      '',
      '```bash',
      row.tracker_command,
      '```',
      '',
    );
  }

  return lines;
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
  const milestoneRows = milestoneActionRows(trackerRows, { today });
  const milestone = milestoneProjection(trackerRows, milestoneRows, { today });
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
    `- 15-action projected score after ordered completion: ${milestone.projectedScore}/100`,
    `- 15-action projected delta: +${milestone.projectedDelta}`,
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
    ...renderMilestoneQueue(milestoneRows),
    '',
    ...renderImmediateExecutionDetails(firstHourRows),
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
