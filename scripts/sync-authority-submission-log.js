const fs = require('fs');
const path = require('path');
const { parseCsv } = require('./print-free-search-submission-packets');
const { authorityScore } = require('./audit-seo-authority');
const { updateTracker } = require('./update-free-search-tracker');

const DEFAULT_LOG = 'docs/authority-submission-log.csv';
const DEFAULT_TRACKER = 'docs/free-search-marketing-tracker.csv';
const STATUSES = new Set(['submitted', 'follow-up needed', 'live', 'rejected']);

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function parseArgs(argv) {
  const args = {
    log: DEFAULT_LOG,
    tracker: DEFAULT_TRACKER,
    out: DEFAULT_TRACKER,
    today: todayIso(),
    apply: false,
    preflight: false,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help' || arg === '-h') {
      args.help = true;
    } else if (arg === '--log') {
      args.log = argv[index + 1] || DEFAULT_LOG;
      index += 1;
    } else if (arg === '--tracker') {
      args.tracker = argv[index + 1] || DEFAULT_TRACKER;
      index += 1;
    } else if (arg === '--out') {
      args.out = argv[index + 1] || DEFAULT_TRACKER;
      index += 1;
    } else if (arg === '--today') {
      args.today = argv[index + 1] || args.today;
      index += 1;
    } else if (arg === '--apply') {
      args.apply = true;
    } else if (arg === '--preflight') {
      args.preflight = true;
    } else {
      throw new Error(`Unexpected argument: ${arg}`);
    }
  }

  if (!args.help && !/^\d{4}-\d{2}-\d{2}$/.test(args.today)) {
    throw new Error('--today must use YYYY-MM-DD');
  }

  return args;
}

function hasHttpUrl(value) {
  return /^https?:\/\//.test(String(value || ''));
}

function rowIssues(row) {
  const status = String(row.action_status || '').trim();
  const issues = [];
  if (!status) return issues;
  if (!STATUSES.has(status)) issues.push('unsupported action_status');
  if (!row.target) issues.push('missing target');

  if (['submitted', 'follow-up needed', 'live'].includes(status)) {
    if (!row.submitted_date) issues.push('missing submitted_date');
    if (!row.confirmation_note && !row.evidence_url && !row.account_or_login) {
      issues.push('missing confirmation evidence');
    }
  }

  if (['submitted', 'follow-up needed'].includes(status) && !row.follow_up_date) {
    issues.push('missing follow_up_date');
  }

  if (status === 'live') {
    if (!row.live_date) issues.push('missing live_date');
    if (!hasHttpUrl(row.evidence_url)) issues.push('missing evidence_url for live URL');
  }

  if (status === 'rejected' && !row.confirmation_note) {
    issues.push('missing rejection note');
  }

  return issues;
}

function evidenceNote(row) {
  return [
    row.confirmation_note ? `Confirmation: ${row.confirmation_note}` : '',
    row.evidence_url ? `Evidence URL: ${row.evidence_url}` : '',
    row.account_or_login ? `Account/login: ${row.account_or_login}` : '',
    row.follow_up_date ? `Follow up: ${row.follow_up_date}` : '',
  ].filter(Boolean).join(' ');
}

function buildSyncActions(logRows, { today = todayIso() } = {}) {
  return logRows
    .filter((row) => String(row.action_status || '').trim())
    .map((row) => {
      const status = String(row.action_status || '').trim();
      const issues = rowIssues(row);
      return {
        target: row.target,
        status,
        issues,
        updateArgs: {
          target: row.target,
          status,
          owner: 'Serviio',
          date: row.submitted_date || today,
          liveDate: row.live_date || '',
          url: status === 'live' ? row.evidence_url : '',
          note: evidenceNote(row),
          appendNote: true,
        },
      };
    });
}

function missingPreflightFields(row) {
  const status = String(row.action_status || '').trim();
  if (!status) {
    return [
      '`action_status`',
      '`submitted_date`',
      'confirmation evidence',
      '`follow_up_date`',
    ];
  }

  return rowIssues(row).map((issue) => {
    if (issue === 'unsupported action_status') return 'supported `action_status`';
    if (issue === 'missing target') return '`target`';
    if (issue === 'missing submitted_date') return '`submitted_date`';
    if (issue === 'missing confirmation evidence') return 'confirmation evidence';
    if (issue === 'missing follow_up_date') return '`follow_up_date`';
    if (issue === 'missing live_date') return '`live_date`';
    if (issue === 'missing evidence_url for live URL') return '`evidence_url` live URL';
    if (issue === 'missing rejection note') return 'rejection note';
    return issue;
  });
}

function buildEvidencePreflightRows(logRows) {
  return logRows.map((row) => {
    const requiredFields = missingPreflightFields(row);
    return {
      target: row.target,
      action_status: row.action_status || '',
      evidence_needed: row.evidence_needed || '',
      tracker_command: row.tracker_command || '',
      required_fields: requiredFields,
      ready_for_sync: requiredFields.length === 0,
    };
  });
}

function renderEvidencePreflightReport(rows) {
  const readyRows = rows.filter((row) => row.ready_for_sync);
  const pendingRows = rows.filter((row) => !row.ready_for_sync);
  const lines = [
    '# Authority Evidence Preflight',
    '',
    `Rows checked: ${rows.length}`,
    `Rows ready for sync: ${readyRows.length}`,
    `Rows still pending evidence: ${pendingRows.length}`,
  ];

  if (pendingRows.length > 0) {
    lines.push('', '## Pending Evidence');
    for (const row of pendingRows) {
      lines.push(`- ${row.target || '(missing target)'}: set ${row.required_fields.join(', ')}`);
      if (row.evidence_needed) {
        lines.push(`  Evidence needed: ${row.evidence_needed}`);
      }
    }
  }

  if (readyRows.length > 0) {
    lines.push('', '## Ready For Sync');
    for (const row of readyRows) {
      lines.push(`- ${row.target}: ${row.action_status}`);
    }
  }

  return `${lines.join('\n')}\n`;
}

function authorityProjectionLines(actions, trackerText) {
  if (!trackerText) return [];
  const currentRows = parseCsv(trackerText);
  const projectedRows = parseCsv(applyActions(trackerText, actions));
  const current = authorityScore(currentRows);
  const projected = authorityScore(projectedRows);
  const currentScore = current.score;
  const projectedScore = projected.score;
  const delta = projectedScore - currentScore;
  const signedDelta = delta >= 0 ? `+${delta}` : String(delta);
  const counterLine = (label, projectedValue, currentValue) => {
    const counterDelta = projectedValue - currentValue;
    const signedCounterDelta = counterDelta >= 0 ? `+${counterDelta}` : String(counterDelta);
    return `Projected ${label}: ${projectedValue} (was ${currentValue}, ${signedCounterDelta})`;
  };
  return [
    `Current authority score: ${currentScore}/100`,
    `Projected authority score after valid updates: ${projectedScore}/100`,
    `Authority score delta: ${signedDelta}`,
    counterLine('submitted or follow-up rows', projected.submittedRows.length, current.submittedRows.length),
    counterLine('live authority rows', projected.liveRows.length, current.liveRows.length),
    counterLine('high-fit started rows', projected.highFitStartedRows.length, current.highFitStartedRows.length),
    counterLine('business profiles started', projected.businessProfileRows.length, current.businessProfileRows.length),
    counterLine('customer proof rows started', projected.customerProofRows.length, current.customerProofRows.length),
  ];
}

function renderReport(actions, { apply = false, trackerText = '' } = {}) {
  const valid = actions.filter((action) => action.issues.length === 0);
  const invalid = actions.filter((action) => action.issues.length > 0);
  const lines = [
    '# Authority Submission Log Sync',
    '',
    `Mode: ${apply ? 'apply' : 'dry run'}`,
    `Rows with action_status: ${actions.length}`,
    `Valid updates: ${valid.length}`,
    `Rows with issues: ${invalid.length}`,
  ];
  const projection = authorityProjectionLines(actions, trackerText);
  if (projection.length > 0) {
    lines.push('', '## Authority Score Projection', ...projection);
  }

  if (valid.length > 0) {
    lines.push('', '## Valid Updates');
    for (const action of valid) {
      lines.push(`- ${action.status}: ${action.target}`);
    }
  }

  if (invalid.length > 0) {
    lines.push('', '## Rows With Issues');
    for (const action of invalid) {
      lines.push(`- ${action.target || '(missing target)'}: ${action.issues.join(', ')}`);
    }
  }

  return `${lines.join('\n')}\n`;
}

function applyActions(trackerText, actions) {
  let nextText = trackerText;
  for (const action of actions) {
    if (action.issues.length > 0) continue;
    nextText = updateTracker(nextText, action.updateArgs).csv;
  }
  return nextText;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log('Usage: node scripts/sync-authority-submission-log.js [--apply] [--log docs/authority-submission-log.csv] [--tracker docs/free-search-marketing-tracker.csv] [--out docs/free-search-marketing-tracker.csv]');
    return;
  }

  const logRows = parseCsv(fs.readFileSync(args.log, 'utf8'));
  if (args.preflight) {
    process.stdout.write(renderEvidencePreflightReport(buildEvidencePreflightRows(logRows)));
    return;
  }

  const actions = buildSyncActions(logRows, { today: args.today });
  const trackerText = fs.readFileSync(args.tracker, 'utf8');
  process.stdout.write(renderReport(actions, { apply: args.apply, trackerText }));

  if (args.apply) {
    const nextTracker = applyActions(trackerText, actions);
    fs.writeFileSync(path.resolve(args.out), nextTracker);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  applyActions,
  buildEvidencePreflightRows,
  buildSyncActions,
  evidenceNote,
  authorityProjectionLines,
  parseArgs,
  renderEvidencePreflightReport,
  renderReport,
  rowIssues,
};
