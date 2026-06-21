const fs = require('fs');
const path = require('path');
const { parseCsv } = require('./print-free-search-submission-packets');
const { authorityScore } = require('./audit-seo-authority');
const { updateTracker } = require('./update-free-search-tracker');

const DEFAULT_EVIDENCE_LOG = 'docs/business-profile-evidence-log.csv';
const DEFAULT_TRACKER = 'docs/free-search-marketing-tracker.csv';

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function parseArgs(argv) {
  const args = {
    evidenceLog: DEFAULT_EVIDENCE_LOG,
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
    } else if (arg === '--evidence-log') {
      args.evidenceLog = argv[index + 1] || DEFAULT_EVIDENCE_LOG;
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

function coreProfileRows(rows) {
  return rows.filter((row) => row.profile_item_type === 'profile_core');
}

function rowIssues(row) {
  const issues = [];
  if (!row.profile_platform) issues.push('missing profile_platform');
  if (!row.submitted_date) issues.push('missing submitted_date');
  if (!row.evidence_url && !row.account_or_login && !row.screenshot_or_dashboard_confirmation) {
    issues.push('missing confirmation evidence');
  }
  if (row.live_date && !hasHttpUrl(row.evidence_url)) {
    issues.push('missing evidence_url for live URL');
  }
  if (!row.live_date && !row.follow_up_date) {
    issues.push('missing follow_up_date');
  }
  return issues;
}

function evidenceNote(row) {
  return [
    `Business profile evidence: ${row.item_name || 'Serviio profile'}`,
    row.screenshot_or_dashboard_confirmation ? `Confirmation: ${row.screenshot_or_dashboard_confirmation}` : '',
    row.evidence_url ? `Evidence URL: ${row.evidence_url}` : '',
    row.account_or_login ? `Account/login: ${row.account_or_login}` : '',
    row.follow_up_date ? `Follow up: ${row.follow_up_date}` : '',
  ].filter(Boolean).join(' ');
}

function buildSyncActions(rows, { today = todayIso() } = {}) {
  return coreProfileRows(rows).map((row) => {
    const status = row.live_date ? 'live' : 'submitted';
    const issues = rowIssues(row);
    return {
      target: row.profile_platform,
      status,
      issues,
      updateArgs: {
        target: row.profile_platform,
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
  return rowIssues(row).map((issue) => {
    if (issue === 'missing profile_platform') return '`profile_platform`';
    if (issue === 'missing submitted_date') return '`submitted_date`';
    if (issue === 'missing confirmation evidence') return 'confirmation evidence';
    if (issue === 'missing evidence_url for live URL') return '`evidence_url` live URL';
    if (issue === 'missing follow_up_date') return '`follow_up_date`';
    return issue;
  });
}

function buildProfileEvidencePreflightRows(rows) {
  return coreProfileRows(rows).map((row) => {
    const requiredFields = missingPreflightFields(row);
    return {
      profile_platform: row.profile_platform,
      item_name: row.item_name,
      evidence_url: row.evidence_url || '',
      account_or_login: row.account_or_login || '',
      screenshot_or_dashboard_confirmation: row.screenshot_or_dashboard_confirmation || '',
      submitted_date: row.submitted_date || '',
      live_date: row.live_date || '',
      follow_up_date: row.follow_up_date || '',
      required_fields: requiredFields,
      ready_for_sync: requiredFields.length === 0,
    };
  });
}

function renderPreflightReport(rows) {
  const readyRows = rows.filter((row) => row.ready_for_sync);
  const pendingRows = rows.filter((row) => !row.ready_for_sync);
  const lines = [
    '# Business Profile Evidence Preflight',
    '',
    `Rows checked: ${rows.length}`,
    `Rows ready for sync: ${readyRows.length}`,
    `Rows still pending evidence: ${pendingRows.length}`,
  ];

  if (pendingRows.length > 0) {
    lines.push('', '## Pending Evidence');
    for (const row of pendingRows) {
      lines.push(`- ${row.profile_platform || '(missing platform)'}: set ${row.required_fields.join(', ')}`);
    }
  }

  if (readyRows.length > 0) {
    lines.push('', '## Ready For Sync');
    for (const row of readyRows) {
      lines.push(`- ${row.profile_platform}: ${row.live_date ? 'live' : 'submitted'}`);
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
  const counterLine = (label, projectedValue, currentValue) => {
    const delta = projectedValue - currentValue;
    const signedDelta = delta >= 0 ? `+${delta}` : String(delta);
    return `Projected ${label}: ${projectedValue} (was ${currentValue}, ${signedDelta})`;
  };
  const scoreDelta = projected.score - current.score;
  return [
    `Current authority score: ${current.score}/100`,
    `Projected authority score after valid profile updates: ${projected.score}/100`,
    `Authority score delta: ${scoreDelta >= 0 ? `+${scoreDelta}` : scoreDelta}`,
    counterLine('submitted or follow-up rows', projected.submittedRows.length, current.submittedRows.length),
    counterLine('live authority rows', projected.liveRows.length, current.liveRows.length),
    counterLine('business profiles started', projected.businessProfileRows.length, current.businessProfileRows.length),
  ];
}

function renderReport(actions, { apply = false, trackerText = '' } = {}) {
  const valid = actions.filter((action) => action.issues.length === 0);
  const invalid = actions.filter((action) => action.issues.length > 0);
  const lines = [
    '# Business Profile Evidence Sync',
    '',
    `Mode: ${apply ? 'apply' : 'dry run'}`,
    `Profile core rows: ${actions.length}`,
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
    console.log('Usage: node scripts/sync-business-profile-evidence-log.js [--apply] [--preflight] [--evidence-log docs/business-profile-evidence-log.csv] [--tracker docs/free-search-marketing-tracker.csv] [--out docs/free-search-marketing-tracker.csv]');
    return;
  }

  const evidenceRows = parseCsv(fs.readFileSync(args.evidenceLog, 'utf8'));
  if (args.preflight) {
    process.stdout.write(renderPreflightReport(buildProfileEvidencePreflightRows(evidenceRows)));
    return;
  }

  const actions = buildSyncActions(evidenceRows, { today: args.today });
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
  buildProfileEvidencePreflightRows,
  buildSyncActions,
  evidenceNote,
  parseArgs,
  renderPreflightReport,
  renderReport,
  rowIssues,
};
