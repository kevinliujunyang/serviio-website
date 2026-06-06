const fs = require('fs');
const {
  opportunityScore,
  parseCsv,
  readySubmissionRows,
} = require('./print-free-search-submission-packets');

const CSV_PATH = 'docs/free-search-marketing-tracker.csv';
const AUTHORITY_CHANNELS = new Set([
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
const HIGH_FIT_CHANNELS = new Set([
  'Asian chamber',
  'Chinese business association',
  'Customer proof',
  'Educational resource listing',
  'Partner outreach',
  'POS-specific outreach',
  'Restaurant technology directory',
]);

function isAuthorityRow(row) {
  return AUTHORITY_CHANNELS.has(row.channel);
}

function isStarted(row) {
  return !['not_started', 'rejected'].includes(row.status);
}

function isLive(row) {
  return row.status === 'live' || Boolean(row.date_live);
}

function hasHttpUrl(value) {
  return /^https?:\/\//.test(String(value || ''));
}

function submittedEvidenceIssues(row) {
  const issues = [];
  if (!row.owner) issues.push('missing owner');
  if (!row.date_submitted) issues.push('missing date_submitted');
  if (!row.notes) issues.push('missing evidence note');
  return issues;
}

function liveEvidenceIssues(row) {
  const issues = submittedEvidenceIssues(row);
  if (!row.date_live) issues.push('missing date_live');
  if (!hasHttpUrl(row.url)) issues.push('missing live URL');
  return issues;
}

function rowEvidenceIssues(row) {
  if (!isAuthorityRow(row)) return [];
  if (isLive(row)) return liveEvidenceIssues(row);
  if (row.status === 'submitted' || row.status === 'follow-up needed') return submittedEvidenceIssues(row);
  return [];
}

function isSubmittedWithEvidence(row) {
  return (row.status === 'submitted' || row.status === 'follow-up needed') &&
    submittedEvidenceIssues(row).length === 0;
}

function isLiveWithEvidence(row) {
  return isLive(row) && liveEvidenceIssues(row).length === 0;
}

function isStartedWithEvidence(row) {
  if (!isStarted(row)) return false;
  if (isLive(row)) return isLiveWithEvidence(row);
  if (row.status === 'submitted' || row.status === 'follow-up needed') return isSubmittedWithEvidence(row);
  return rowEvidenceIssues(row).length === 0;
}

function evidenceIssues(rows) {
  return rows
    .filter(isAuthorityRow)
    .map((row) => ({
      row,
      target: row.target,
      status: row.status,
      issues: rowEvidenceIssues(row),
    }))
    .filter((issue) => issue.issues.length > 0);
}

function authorityScore(rows) {
  const authorityRows = rows.filter(isAuthorityRow);
  const submittedRows = authorityRows.filter(isSubmittedWithEvidence);
  const liveRows = authorityRows.filter(isLiveWithEvidence);
  const highFitStartedRows = authorityRows.filter((row) => HIGH_FIT_CHANNELS.has(row.channel) && isStartedWithEvidence(row));
  const customerProofRows = authorityRows.filter((row) => row.channel === 'Customer proof' && isStartedWithEvidence(row));
  const businessProfileRows = authorityRows.filter((row) => row.channel === 'Business profile' && isStartedWithEvidence(row));
  const evidenceIssueRows = evidenceIssues(rows);

  let score = 0;
  score += Math.min(30, liveRows.length * 6);
  score += Math.min(25, submittedRows.length * 3);
  score += Math.min(25, highFitStartedRows.length * 5);
  score += Math.min(10, businessProfileRows.length * 4);
  score += Math.min(10, customerProofRows.length * 10);

  return {
    score,
    authorityRows,
    submittedRows,
    liveRows,
    highFitStartedRows,
    customerProofRows,
    businessProfileRows,
    evidenceIssueRows,
  };
}

function statusCounts(rows) {
  return rows.reduce((counts, row) => {
    counts[row.status] = (counts[row.status] || 0) + 1;
    return counts;
  }, {});
}

function nextMilestones(summary) {
  const milestones = [];
  if (summary.liveRows.length < 5) milestones.push('Get 5 live authority links or profiles recorded in the tracker.');
  if (summary.submittedRows.length < 15) milestones.push('Submit or contact at least 15 authority targets.');
  if (summary.highFitStartedRows.length < 8) milestones.push('Start 8 high-fit partner, POS, association, or restaurant-tech opportunities.');
  if (summary.businessProfileRows.length < 3) milestones.push('Create or claim Google Business Profile, Bing Places, and Apple Business Connect if eligible.');
  if (summary.customerProofRows.length < 1) milestones.push('Secure 1 customer proof or pilot testimonial mentioning city, restaurant type, POS, and phone-order pain.');
  return milestones;
}

function renderReport(rows) {
  const summary = authorityScore(rows);
  const counts = statusCounts(summary.authorityRows);
  const nextRows = readySubmissionRows(rows)
    .filter(isAuthorityRow)
    .slice(0, 10);

  const lines = [
    '# Serviio SEO Authority Audit',
    '',
    `Authority score: ${summary.score}/100`,
    `Authority tracker rows: ${summary.authorityRows.length}`,
    `Submitted or follow-up rows: ${summary.submittedRows.length}`,
    `Live authority rows: ${summary.liveRows.length}`,
    `High-fit partner/POS/association rows started: ${summary.highFitStartedRows.length}`,
    `Business profiles started: ${summary.businessProfileRows.length}`,
    `Customer proof rows started: ${summary.customerProofRows.length}`,
    '',
    '## Status Counts',
  ];

  for (const [status, count] of Object.entries(counts).sort()) {
    lines.push(`- ${status}: ${count}`);
  }

  lines.push('', '## Next Authority Milestones');
  for (const milestone of nextMilestones(summary)) {
    lines.push(`- ${milestone}`);
  }

  lines.push('', '## Next 10 Authority Actions');
  for (const row of nextRows) {
    const opportunity = opportunityScore(row);
    lines.push(`- ${opportunity.score}/100 [${row.priority}] ${row.channel} - ${row.target}`);
    lines.push(`  URL: ${row.url}`);
    lines.push(`  UTM: ${row.utm_url}`);
  }

  if (summary.evidenceIssueRows.length > 0) {
    lines.push('', '## Evidence Issues');
    for (const issue of summary.evidenceIssueRows) {
      lines.push(`- ${issue.status || 'unknown'} ${issue.target}: ${issue.issues.join(', ')}`);
    }
  }

  return `${lines.join('\n')}\n`;
}

function main() {
  const rows = parseCsv(fs.readFileSync(CSV_PATH, 'utf8'));
  process.stdout.write(renderReport(rows));
}

if (require.main === module) {
  main();
}

module.exports = {
  authorityScore,
  evidenceIssues,
  isAuthorityRow,
  nextMilestones,
  renderReport,
  statusCounts,
};
