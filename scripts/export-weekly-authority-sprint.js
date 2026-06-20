const fs = require('fs');
const path = require('path');
const { authorityScore, isAuthorityRow, nextMilestones } = require('./audit-seo-authority');
const { buildGtmQueueRows } = require('./export-free-search-gtm-queue');
const { opportunityScore, packetFor, parseCsv } = require('./print-free-search-submission-packets');

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

function addDaysIso(date, days) {
  const parsed = new Date(`${date}T00:00:00Z`);
  parsed.setUTCDate(parsed.getUTCDate() + days);
  return parsed.toISOString().slice(0, 10);
}

function quoteShell(text) {
  return `"${String(text).replace(/"/g, '\\"')}"`;
}

function trackerCommand(row, today, followUpDate) {
  if (row.tracker_command) return row.tracker_command;
  return `npm run marketing:mark -- --target ${quoteShell(row.target)} --status submitted --date ${today} --note "Submitted/contacted; add confirmation URL and account used. Follow up: ${followUpDate}."`;
}

function proofFields(row, followUpDate) {
  if (row.action_type === 'optimize_live_listing') {
    return 'Record updated listing screenshot, account/owner confirmation, and the live URL that changed.';
  }
  return `Record owner, submitted date, confirmation note, evidence URL if available, and follow-up date ${followUpDate}.`;
}

function trackerRowFromQueueRow(row) {
  return {
    ...row,
    url: row.contact_url || row.url,
  };
}

function renderSubmissionFieldChecklist(packet, row) {
  const fields = [
    ['Product/company', packet.title || 'Serviio'],
    ['Website', row.utm_url || row.landing_url || 'https://serviio.ai/'],
    ['Clean website', row.landing_url || 'https://serviio.ai/'],
    ['Title or subject', packet.subject || packet.title],
    ['Tagline', packet.tagline],
    ['Short description', packet.shortDescription],
    ['Categories', packet.categories],
    ['Features', packet.features],
    ['Pricing', packet.pricing],
    ['Contact email', 'info@serviio.ai'],
    ['Contact phone', '(408) 409-9079'],
  ].filter(([, value]) => value);

  const lines = [
    'Field checklist:',
    '',
  ];
  for (const [label, value] of fields) {
    lines.push(`- ${label}: ${value}`);
  }
  return lines;
}

function actionRows(rows, args) {
  return buildGtmQueueRows(rows, {
    today: args.today,
    followUpLimit: 10,
    readyLimit: args.submissionTarget + 5,
    researchLimit: 5,
  });
}

function executionRowsForSprint(rows, submissionTarget) {
  const requiredRows = rows.filter((row) => row.action_type !== 'submit_or_contact' && row.action_type !== 'research_target');
  const customerProofRows = rows.filter((row) => row.action_type === 'submit_or_contact' && /customer proof/i.test(row.channel));
  const businessProfileRows = rows.filter((row) => row.action_type === 'submit_or_contact' && /business profile/i.test(row.channel));
  const reservedTargets = new Set([
    ...customerProofRows.map((row) => row.target),
    ...businessProfileRows.map((row) => row.target),
  ]);
  const submissionRows = rows
    .filter((row) => row.action_type === 'submit_or_contact' && !reservedTargets.has(row.target) && isAuthorityRow(row))
    .slice(0, submissionTarget);
  const researchRows = rows
    .filter((row) => row.action_type === 'research_target')
    .slice(0, Math.max(0, submissionTarget - submissionRows.length));
  return [
    ...requiredRows,
    ...businessProfileRows,
    ...submissionRows,
    ...customerProofRows,
    ...researchRows,
  ];
}

function indexingSupportRowsForSprint(rows) {
  return rows.filter((row) => row.channel === 'Webmaster tool');
}

function renderActionTable(rows) {
  const lines = [
    '| # | Action | Score | Target | Channel | Evidence needed |',
    '| --- | --- | ---: | --- | --- | --- |',
  ];

  rows.forEach((row, index) => {
    const score = row.opportunity_score || opportunityScore(row).score;
    const evidence = row.evidence_needed || (row.action_type === 'follow_up'
      ? 'Reply, live URL, rejection note, or next follow-up date'
      : 'Confirmation note, account/login, submitted date, and follow-up date');
    lines.push(`| ${index + 1} | ${row.action_type} | ${score} | ${row.target} | ${row.channel} | ${evidence} |`);
  });

  return lines;
}

function renderIndexingSupportQueue(rows) {
  const lines = [
    '## Indexing Support Queue',
    '',
    'These rows support discovery and recrawling, but they do not count toward the authority submission target.',
    '',
    '| # | Target | Priority | Channel | Contact URL | Landing page | UTM URL | Tracker command |',
    '| --- | --- | --- | --- | --- | --- | --- | --- |',
  ];

  rows.forEach((row, index) => {
    lines.push(`| ${index + 1} | ${row.target} | ${row.priority} | ${row.channel} | ${row.contact_url || row.url || '-'} | ${row.landing_url || '-'} | ${row.utm_url || '-'} | ${row.tracker_command || '-'} |`);
  });

  return lines;
}

function firstMatchingRow(rows, predicate, usedTargets) {
  return rows.find((row) => !usedTargets.has(row.target) && predicate(row));
}

function renderFirstHourAuthorityBlock(rows) {
  const usedTargets = new Set();
  const priorityRows = [];
  const addRow = (row) => {
    if (row) {
      usedTargets.add(row.target);
      priorityRows.push(row);
    }
  };

  addRow(firstMatchingRow(rows, (row) => /business profile/i.test(row.channel) && /google/i.test(row.target), usedTargets));
  addRow(firstMatchingRow(rows, (row) => /pos-specific outreach/i.test(row.channel) && /menusifu/i.test(row.target), usedTargets));
  addRow(firstMatchingRow(rows, (row) => /pos-specific outreach/i.test(row.channel) && /39 miles/i.test(row.target), usedTargets));
  addRow(firstMatchingRow(rows, (row) => /customer proof/i.test(row.channel), usedTargets));

  const lines = [
    '## First 60 Minutes Authority Block',
    '',
    'Start here before generic directory submissions; these actions can create profile authority, POS-ready referral paths, or customer proof.',
    '',
    '| # | Target | Channel | Score | Evidence needed |',
    '| --- | --- | --- | ---: | --- |',
  ];

  priorityRows.forEach((row, index) => {
    const score = row.opportunity_score || opportunityScore(row).score;
    const evidence = row.evidence_needed || 'Confirmation note, account/login, submitted date, and follow-up date';
    lines.push(`| ${index + 1} | ${row.target} | ${row.channel} | ${score} | ${evidence} |`);
  });

  lines.push(
    '',
    'After the block, update `docs/authority-submission-log.csv`, run `npm run marketing:submission-sync`, then rerun `npm run seo:authority`.',
  );

  return lines;
}

function renderDailyAuthorityChecklist(rows, today) {
  const followUpDate = addDaysIso(today, 7);
  const lines = [
    '## Daily Authority Checklist',
    '',
    'Work top to bottom during each manual authority block. Leave tracker rows unchanged until a real external action happens.',
    '',
    '| # | Target | Priority | Channel | Contact URL | Landing page | UTM URL | Tracker command | Proof fields |',
    '| --- | --- | --- | --- | --- | --- | --- | --- | --- |',
  ];

  rows.forEach((row, index) => {
    lines.push(`| ${index + 1} | ${row.target} | ${row.priority} | ${row.channel} | ${row.contact_url || row.url || '-'} | ${row.landing_url || '-'} | ${row.utm_url || '-'} | ${trackerCommand(row, today, followUpDate)} | ${proofFields(row, followUpDate)} |`);
  });

  return lines;
}

function renderSubmissionPayloads(rows, today) {
  const followUpDate = addDaysIso(today, 7);
  const lines = [
    '## Submission Payloads',
    '',
    'Use these payloads during the manual submission block. Keep `action_status` blank until the external action is actually submitted or published.',
    '',
  ];

  rows.forEach((row, index) => {
    const trackerRow = trackerRowFromQueueRow(row);
    const packet = packetFor(trackerRow);
    const score = row.opportunity_score || opportunityScore(row).score;
    lines.push(
      `### ${index + 1}. ${row.target}`,
      '',
      `- Score: ${score}/100`,
      `- Channel: ${row.channel}`,
      `- Contact URL: ${trackerRow.url}`,
      `- Clean URL: ${row.landing_url}`,
      `- UTM URL: ${row.utm_url}`,
      `- Anchor/listing phrase: ${row.anchor_or_listing_phrase}`,
      `- Evidence needed: ${row.evidence_needed || 'Confirmation note, account/login, submitted date, and follow-up date'}`,
      `- Subject: ${packet.subject || packet.title}`,
      `- Follow-up date: ${followUpDate}`,
      '',
      ...renderSubmissionFieldChecklist(packet, row),
      '',
      'Copy:',
      '',
      packet.longDescription,
      ''
    );

    if (packet.followUp) {
      lines.push('Follow-up copy:', '', packet.followUp, '');
    }

    lines.push('Tracker command after real submission:', '', '```bash', trackerCommand(row, today, followUpDate), '```', '');
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
  const executionRows = executionRowsForSprint(queueRows, options.submissionTarget);
  const indexingRows = indexingSupportRowsForSprint(queueRows);

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
    ...renderFirstHourAuthorityBlock(executionRows),
    '',
    '## Execution Queue',
    '',
    ...renderActionTable(executionRows),
    '',
    ...renderDailyAuthorityChecklist(executionRows, options.today),
    '',
    ...renderIndexingSupportQueue(indexingRows),
    '',
    ...renderSubmissionPayloads(executionRows.filter((row) => row.action_type === 'submit_or_contact'), options.today),
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
