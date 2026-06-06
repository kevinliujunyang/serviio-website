const fs = require('fs');
const { parseCsv } = require('./print-free-search-submission-packets');

const CSV_PATH = 'docs/free-search-marketing-tracker.csv';
const STATUSES = new Set(['not_started', 'submitted', 'live', 'rejected', 'follow-up needed']);

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function parseArgs(argv) {
  const args = {
    csvPath: CSV_PATH,
    owner: 'Serviio',
    date: todayIso(),
    dryRun: false,
    appendNote: true,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help' || arg === '-h') {
      args.help = true;
    } else if (arg === '--csv') {
      args.csvPath = argv[index + 1];
      index += 1;
    } else if (arg === '--target') {
      args.target = argv[index + 1];
      index += 1;
    } else if (arg === '--status') {
      args.status = argv[index + 1];
      index += 1;
    } else if (arg === '--owner') {
      args.owner = argv[index + 1];
      index += 1;
    } else if (arg === '--date') {
      args.date = argv[index + 1];
      index += 1;
    } else if (arg === '--live-date') {
      args.liveDate = argv[index + 1];
      index += 1;
    } else if (arg === '--url') {
      args.url = argv[index + 1];
      index += 1;
    } else if (arg === '--note') {
      args.note = argv[index + 1];
      index += 1;
    } else if (arg === '--replace-note') {
      args.note = argv[index + 1];
      args.appendNote = false;
      index += 1;
    } else if (arg === '--dry-run') {
      args.dryRun = true;
    } else {
      throw new Error(`Unexpected argument: ${arg}`);
    }
  }

  if (args.help) return args;
  if (!args.target) throw new Error('--target is required');
  if (!args.status) throw new Error('--status is required');
  if (!STATUSES.has(args.status)) {
    throw new Error(`--status must be one of: ${Array.from(STATUSES).join(', ')}`);
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(args.date)) {
    throw new Error('--date must use YYYY-MM-DD');
  }
  if (args.liveDate && !/^\d{4}-\d{2}-\d{2}$/.test(args.liveDate)) {
    throw new Error('--live-date must use YYYY-MM-DD');
  }

  return args;
}

function csvEscape(value) {
  const text = String(value ?? '');
  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function toCsv(headers, rows) {
  return [
    headers.join(','),
    ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(',')),
  ].join('\n') + '\n';
}

function findTargetRow(rows, target) {
  const normalized = target.toLowerCase();
  const exactMatches = rows.filter((row) => row.target.toLowerCase() === normalized);
  if (exactMatches.length === 1) return exactMatches[0];

  const fuzzyMatches = rows.filter((row) => row.target.toLowerCase().includes(normalized));
  if (fuzzyMatches.length === 1) return fuzzyMatches[0];
  if (exactMatches.length > 1 || fuzzyMatches.length > 1) {
    const matches = (exactMatches.length > 1 ? exactMatches : fuzzyMatches)
      .map((row) => row.target)
      .join(', ');
    throw new Error(`--target matched multiple rows: ${matches}`);
  }

  throw new Error(`No tracker row matched --target "${target}"`);
}

function mergeNote(existingNote, nextNote, { append = true, date } = {}) {
  if (!nextNote) return existingNote || '';
  const datedNote = date ? `${date}: ${nextNote}` : nextNote;
  if (!append || !existingNote) return datedNote;
  return `${existingNote} ${datedNote}`;
}

function updateRow(row, args) {
  const before = { ...row };
  row.status = args.status;
  if (args.owner) row.owner = args.owner;
  if (args.url) row.url = args.url;
  if (['submitted', 'follow-up needed', 'live'].includes(args.status) && !row.date_submitted) {
    row.date_submitted = args.date;
  }
  if (args.status === 'live') {
    row.date_live = args.liveDate || args.date;
  }
  row.notes = mergeNote(row.notes, args.note, { append: args.appendNote, date: args.date });
  return before;
}

function updateTracker(text, args) {
  const [headerLine] = text.trim().split(/\r?\n/);
  const headers = headerLine.split(',');
  const rows = parseCsv(text);
  const row = findTargetRow(rows, args.target);
  const before = updateRow(row, args);
  return {
    before,
    after: { ...row },
    csv: toCsv(headers, rows),
  };
}

function printSummary(before, after, { dryRun = false } = {}) {
  const prefix = dryRun ? 'Dry run: would update' : 'Updated';
  console.log(`${prefix} tracker row: ${after.target}`);
  console.log(`Status: ${before.status || '(blank)'} -> ${after.status}`);
  console.log(`Owner: ${before.owner || '(blank)'} -> ${after.owner || '(blank)'}`);
  console.log(`Date submitted: ${before.date_submitted || '(blank)'} -> ${after.date_submitted || '(blank)'}`);
  console.log(`Date live: ${before.date_live || '(blank)'} -> ${after.date_live || '(blank)'}`);
  if (before.url !== after.url) console.log(`URL: ${before.url || '(blank)'} -> ${after.url || '(blank)'}`);
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log('Usage: node scripts/update-free-search-tracker.js --target "MenuSifu restaurant consultants" --status submitted [--note "..."] [--date YYYY-MM-DD] [--dry-run]');
    return;
  }

  const text = fs.readFileSync(args.csvPath, 'utf8');
  const result = updateTracker(text, args);
  printSummary(result.before, result.after, { dryRun: args.dryRun });
  if (!args.dryRun) fs.writeFileSync(args.csvPath, result.csv);
}

if (require.main === module) {
  main();
}

module.exports = {
  findTargetRow,
  mergeNote,
  parseArgs,
  toCsv,
  updateRow,
  updateTracker,
};
