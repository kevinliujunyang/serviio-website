const fs = require('fs');

const CSV_PATH = 'docs/free-search-marketing-tracker.csv';
const ACTIVE_STATUSES = new Set(['not_started', 'follow-up needed', 'submitted']);

function parseCsvLine(line) {
  const cells = [];
  let cell = '';
  let quoted = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];
    if (quoted && char === '"' && next === '"') {
      cell += '"';
      i += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === ',' && !quoted) {
      cells.push(cell);
      cell = '';
    } else {
      cell += char;
    }
  }

  cells.push(cell);
  return cells;
}

function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/);
  const headers = parseCsvLine(lines[0]);
  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    return Object.fromEntries(headers.map((header, index) => [header, values[index] || '']));
  });
}

function increment(map, key) {
  map.set(key, (map.get(key) || 0) + 1);
}

function printCounts(title, map) {
  console.log(`## ${title}`);
  for (const [key, count] of [...map.entries()].sort()) {
    console.log(`- ${key}: ${count}`);
  }
  console.log('');
}

function priorityRank(priority) {
  return { P0: 0, P1: 1, P2: 2 }[priority] ?? 9;
}

function statusRank(status) {
  return {
    'follow-up needed': 0,
    not_started: 1,
    submitted: 2,
    live: 3,
    rejected: 4,
  }[status] ?? 9;
}

function nextAction(row) {
  if (row.status === 'follow-up needed') return 'Follow up and ask for live listing or next step';
  if (row.status === 'submitted') return 'Check whether listing is live and record date_live';
  if (row.status === 'not_started' && row.url) return 'Submit or contact using the listed URL';
  if (row.status === 'not_started') return 'Find target URL with npm run marketing:prospects';
  if (row.status === 'live') return 'Monitor referral traffic and lead attribution';
  if (row.status === 'rejected') return 'Archive or replace with a better target';
  return 'Review status';
}

const rows = parseCsv(fs.readFileSync(CSV_PATH, 'utf8'));
const byPriority = new Map();
const byStatus = new Map();
const byChannel = new Map();
const byMedium = new Map();

for (const row of rows) {
  increment(byPriority, row.priority || 'unknown');
  increment(byStatus, row.status || 'unknown');
  increment(byChannel, row.channel || 'unknown');
  const medium = new URL(row.utm_url).searchParams.get('utm_medium') || 'unknown';
  increment(byMedium, medium);
}

const nextRows = rows
  .filter((row) => ACTIVE_STATUSES.has(row.status))
  .sort((a, b) => {
    const priorityDiff = priorityRank(a.priority) - priorityRank(b.priority);
    if (priorityDiff) return priorityDiff;
    const statusDiff = statusRank(a.status) - statusRank(b.status);
    if (statusDiff) return statusDiff;
    return a.channel.localeCompare(b.channel) || a.target.localeCompare(b.target);
  })
  .slice(0, 15);

console.log('# Serviio Free Search Tracker Summary');
console.log('');
console.log(`Rows: ${rows.length}`);
console.log(`Active rows: ${rows.filter((row) => ACTIVE_STATUSES.has(row.status)).length}`);
console.log('');
printCounts('By Priority', byPriority);
printCounts('By Status', byStatus);
printCounts('By Channel', byChannel);
printCounts('By Medium', byMedium);

console.log('## Next Execution Queue');
for (const row of nextRows) {
  console.log(`- [${row.priority}] ${row.channel} - ${row.target}`);
  console.log(`  Status: ${row.status}`);
  console.log(`  Action: ${nextAction(row)}`);
  console.log(`  URL: ${row.url || '(find target)'}`);
  console.log(`  Landing: ${row.landing_url}`);
  console.log(`  UTM: ${row.utm_url}`);
  console.log(`  Phrase: ${row.anchor_or_listing_phrase}`);
}
