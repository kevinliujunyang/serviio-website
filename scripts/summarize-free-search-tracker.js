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

function hasTargetUrl(row) {
  return /^https?:\/\//.test(row.url);
}

function targetUrlRank(row) {
  return hasTargetUrl(row) ? 0 : 1;
}

function rowMedium(row) {
  try {
    return new URL(row.utm_url).searchParams.get('utm_medium') || 'unknown';
  } catch {
    return 'unknown';
  }
}

function opportunityScore(row) {
  let score = 0;
  const reasons = [];
  const text = `${row.channel} ${row.target} ${row.landing_url} ${row.anchor_or_listing_phrase} ${row.notes}`;
  const medium = rowMedium(row);

  if (row.priority === 'P0') {
    score += 30;
    reasons.push('P0');
  } else if (row.priority === 'P1') {
    score += 20;
    reasons.push('P1');
  } else if (row.priority === 'P2') {
    score += 10;
    reasons.push('P2');
  }

  if (row.status === 'follow-up needed') {
    score += 20;
    reasons.push('follow-up due');
  } else if (row.status === 'not_started' && hasTargetUrl(row)) {
    score += 18;
    reasons.push('ready URL');
  } else if (row.status === 'submitted') {
    score += 10;
    reasons.push('submitted check');
  } else if (row.status === 'not_started') {
    score += 5;
    reasons.push('needs target research');
  }

  if (medium === 'partner_referral') {
    score += 20;
    reasons.push('partner/referral');
  } else if (medium === 'organic_listing') {
    score += 14;
    reasons.push('organic listing');
  } else if (medium === 'indexing') {
    score += 12;
    reasons.push('indexing');
  } else if (medium === 'community_post') {
    score += 8;
    reasons.push('community');
  }

  if (/pos|39\s*miles|square|toast|clover|menusifu|menu\s*sifu|chowbus|mealkeyway/i.test(text)) {
    score += 18;
    reasons.push('POS intent');
  }
  if (/chinese|中餐|mandarin|cantonese|asian/i.test(text)) {
    score += 14;
    reasons.push('Chinese/Asian owner fit');
  }
  if (/restaurant technology|partner outreach|POS-specific outreach|Chinese business association/i.test(row.channel)) {
    score += 12;
    reasons.push('high-fit channel');
  }
  if (/service-areas|california|new-york|new-jersey|texas|boston|philadelphia|houston/i.test(row.landing_url)) {
    score += 6;
    reasons.push('local landing page');
  }

  return {
    score: Math.min(100, score),
    reasons: reasons.join(', '),
  };
}

function nextAction(row) {
  if (row.status === 'follow-up needed') return 'Follow up and ask for live listing or next step';
  if (row.status === 'submitted') return 'Check whether listing is live and record date_live';
  if (row.status === 'not_started' && hasTargetUrl(row)) return 'Submit or contact using the listed URL';
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
    const scoreDiff = opportunityScore(b).score - opportunityScore(a).score;
    if (scoreDiff) return scoreDiff;
    const priorityDiff = priorityRank(a.priority) - priorityRank(b.priority);
    if (priorityDiff) return priorityDiff;
    const statusDiff = statusRank(a.status) - statusRank(b.status);
    if (statusDiff) return statusDiff;
    const targetUrlDiff = targetUrlRank(a) - targetUrlRank(b);
    if (targetUrlDiff) return targetUrlDiff;
    return a.channel.localeCompare(b.channel) || a.target.localeCompare(b.target);
  })
  .slice(0, 15);

const readyRows = rows.filter((row) => row.status === 'not_started' && hasTargetUrl(row));
const needsTargetRows = rows.filter((row) => row.status === 'not_started' && !hasTargetUrl(row));
const highImpactRows = rows
  .filter((row) => ACTIVE_STATUSES.has(row.status))
  .sort((a, b) => opportunityScore(b).score - opportunityScore(a).score || priorityRank(a.priority) - priorityRank(b.priority))
  .slice(0, 12);

console.log('# Serviio Free Search Tracker Summary');
console.log('');
console.log(`Rows: ${rows.length}`);
console.log(`Active rows: ${rows.filter((row) => ACTIVE_STATUSES.has(row.status)).length}`);
console.log(`Ready-to-submit rows: ${readyRows.length}`);
console.log(`Rows needing target research: ${needsTargetRows.length}`);
console.log('');
printCounts('By Priority', byPriority);
printCounts('By Status', byStatus);
printCounts('By Channel', byChannel);
printCounts('By Medium', byMedium);

console.log('## Next Execution Queue');
for (const row of nextRows) {
  const opportunity = opportunityScore(row);
  console.log(`- [${row.priority}] ${row.channel} - ${row.target}`);
  console.log(`  Opportunity: ${opportunity.score}/100 (${opportunity.reasons})`);
  console.log(`  Status: ${row.status}`);
  console.log(`  Action: ${nextAction(row)}`);
  console.log(`  URL: ${row.url || '(find target)'}`);
  console.log(`  Landing: ${row.landing_url}`);
  console.log(`  UTM: ${row.utm_url}`);
  console.log(`  Phrase: ${row.anchor_or_listing_phrase}`);
}

console.log('');
console.log('## High-Impact Submission Queue');
for (const row of highImpactRows) {
  const opportunity = opportunityScore(row);
  console.log(`- ${opportunity.score}/100 [${row.priority}] ${row.channel} - ${row.target}`);
  console.log(`  Why: ${opportunity.reasons}`);
  console.log(`  Action: ${nextAction(row)}`);
  console.log(`  URL: ${row.url || '(find target)'}`);
  console.log(`  Landing: ${row.landing_url}`);
}

console.log('');
console.log('## Ready-To-Submit Rows');
for (const row of readyRows
  .sort((a, b) => opportunityScore(b).score - opportunityScore(a).score || priorityRank(a.priority) - priorityRank(b.priority) || a.channel.localeCompare(b.channel) || a.target.localeCompare(b.target))
  .slice(0, 12)) {
  const opportunity = opportunityScore(row);
  console.log(`- ${opportunity.score}/100 [${row.priority}] ${row.target}: ${row.url}`);
  console.log(`  Use: ${row.utm_url}`);
}
