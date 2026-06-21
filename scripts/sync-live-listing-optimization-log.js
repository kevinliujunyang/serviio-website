const fs = require('fs');
const path = require('path');
const { parseCsv } = require('./print-free-search-submission-packets');
const { authorityScore } = require('./audit-seo-authority');
const { updateTracker } = require('./update-free-search-tracker');

const DEFAULT_LOG = 'docs/live-listing-optimization.csv';
const DEFAULT_TRACKER = 'docs/free-search-marketing-tracker.csv';
const STATUSES = new Set(['live']);

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
  if (!row.completed_date) issues.push('missing completed_date');
  if (!hasHttpUrl(row.evidence_url)) issues.push('missing evidence_url for live URL');
  if (!row.confirmation_note && !row.account_or_login && !row.screenshot_or_dashboard_confirmation) {
    issues.push('missing confirmation evidence');
  }
  return issues;
}

function evidenceNote(row) {
  return [
    'Live listing optimization',
    row.confirmation_note ? `Confirmation: ${row.confirmation_note}` : '',
    row.evidence_url ? `Evidence URL: ${row.evidence_url}` : '',
    row.account_or_login ? `Account/login: ${row.account_or_login}` : '',
    row.screenshot_or_dashboard_confirmation ? `Screenshot/dashboard: ${row.screenshot_or_dashboard_confirmation}` : '',
  ].filter(Boolean).join(' ');
}

function buildSyncActions(rows, { today = todayIso() } = {}) {
  return rows
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
          date: row.completed_date || today,
          liveDate: row.completed_date || today,
          url: row.evidence_url || row.live_url || '',
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
      '`completed_date`',
      '`evidence_url` live URL',
      'confirmation evidence',
    ];
  }

  return rowIssues(row).map((issue) => {
    if (issue === 'unsupported action_status') return 'supported `action_status`';
    if (issue === 'missing target') return '`target`';
    if (issue === 'missing completed_date') return '`completed_date`';
    if (issue === 'missing evidence_url for live URL') return '`evidence_url` live URL';
    if (issue === 'missing confirmation evidence') return 'confirmation evidence';
    return issue;
  });
}

function buildLiveListingPreflightRows(rows) {
  return rows.map((row) => {
    const requiredFields = missingPreflightFields(row);
    return {
      target: row.target,
      action_status: row.action_status || '',
      evidence_url: row.evidence_url || '',
      account_or_login: row.account_or_login || '',
      screenshot_or_dashboard_confirmation: row.screenshot_or_dashboard_confirmation || '',
      confirmation_note: row.confirmation_note || '',
      completed_date: row.completed_date || '',
      required_fields: requiredFields,
      ready_for_sync: requiredFields.length === 0,
    };
  });
}

function renderPreflightReport(rows) {
  const readyRows = rows.filter((row) => row.ready_for_sync);
  const pendingRows = rows.filter((row) => !row.ready_for_sync);
  const lines = [
    '# Live Listing Optimization Preflight',
    '',
    `Rows checked: ${rows.length}`,
    `Rows ready for sync: ${readyRows.length}`,
    `Rows still pending evidence: ${pendingRows.length}`,
  ];

  if (pendingRows.length > 0) {
    lines.push('', '## Pending Evidence');
    for (const row of pendingRows) {
      lines.push(`- ${row.target || '(missing target)'}: set ${row.required_fields.join(', ')}`);
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

function applyActions(trackerText, actions) {
  let nextText = trackerText;
  for (const action of actions) {
    if (action.issues.length > 0) continue;
    nextText = updateTracker(nextText, action.updateArgs).csv;
  }
  return nextText;
}

function authorityProjectionLines(actions, trackerText) {
  if (!trackerText) return [];
  const currentRows = parseCsv(trackerText);
  const projectedRows = parseCsv(applyActions(trackerText, actions));
  const current = authorityScore(currentRows);
  const projected = authorityScore(projectedRows);
  const delta = projected.score - current.score;
  const counterLine = (label, projectedValue, currentValue) => {
    const counterDelta = projectedValue - currentValue;
    const signedCounterDelta = counterDelta >= 0 ? `+${counterDelta}` : String(counterDelta);
    return `Projected ${label}: ${projectedValue} (was ${currentValue}, ${signedCounterDelta})`;
  };
  return [
    `Current authority score: ${current.score}/100`,
    `Projected authority score after valid live listing updates: ${projected.score}/100`,
    `Authority score delta: ${delta >= 0 ? `+${delta}` : delta}`,
    counterLine('live authority rows', projected.liveRows.length, current.liveRows.length),
    counterLine('submitted or follow-up rows', projected.submittedRows.length, current.submittedRows.length),
  ];
}

function renderReport(actions, { apply = false, trackerText = '' } = {}) {
  const valid = actions.filter((action) => action.issues.length === 0);
  const invalid = actions.filter((action) => action.issues.length > 0);
  const lines = [
    '# Live Listing Optimization Sync',
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

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log('Usage: node scripts/sync-live-listing-optimization-log.js [--apply] [--preflight] [--log docs/live-listing-optimization.csv] [--tracker docs/free-search-marketing-tracker.csv] [--out docs/free-search-marketing-tracker.csv]');
    return;
  }

  const rows = parseCsv(fs.readFileSync(args.log, 'utf8'));
  if (args.preflight) {
    const report = renderPreflightReport(buildLiveListingPreflightRows(rows));
    if (args.out && args.out !== DEFAULT_TRACKER) {
      fs.writeFileSync(path.resolve(args.out), report);
      console.log(`Wrote live listing optimization preflight to ${path.resolve(args.out)}`);
    } else {
      process.stdout.write(report);
    }
    return;
  }

  const actions = buildSyncActions(rows, { today: args.today });
  const trackerText = fs.readFileSync(args.tracker, 'utf8');
  process.stdout.write(renderReport(actions, { apply: args.apply, trackerText }));
  if (args.apply) {
    fs.writeFileSync(path.resolve(args.out), applyActions(trackerText, actions));
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  applyActions,
  authorityProjectionLines,
  buildLiveListingPreflightRows,
  buildSyncActions,
  evidenceNote,
  parseArgs,
  renderPreflightReport,
  renderReport,
  rowIssues,
};
