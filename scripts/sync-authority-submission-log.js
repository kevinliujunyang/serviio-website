const fs = require('fs');
const path = require('path');
const { parseCsv } = require('./print-free-search-submission-packets');
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

function renderReport(actions, { apply = false } = {}) {
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
  const actions = buildSyncActions(logRows, { today: args.today });
  process.stdout.write(renderReport(actions, { apply: args.apply }));

  if (args.apply) {
    const nextTracker = applyActions(fs.readFileSync(args.tracker, 'utf8'), actions);
    fs.writeFileSync(path.resolve(args.out), nextTracker);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  applyActions,
  buildSyncActions,
  evidenceNote,
  parseArgs,
  renderReport,
  rowIssues,
};
