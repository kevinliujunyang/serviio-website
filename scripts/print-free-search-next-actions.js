const fs = require('fs');

const CSV_PATH = 'docs/free-search-marketing-tracker.csv';
const READY_LIMIT = 8;
const RESEARCH_LIMIT = 8;
const LIVE_OPTIMIZATION_PATTERN = /\bclaim(?:ed|ing)?\b.*\bpending\b|\bupdate(?:d|ing)?\b.*\bpending\b|\bclaim\/update access still pending\b/i;

function parseCsvLine(line) {
  const cells = [];
  let cell = '';
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];
    if (quoted && char === '"' && next === '"') {
      cell += '"';
      index += 1;
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

function hasTargetUrl(row) {
  return /^https?:\/\//.test(row.url);
}

function priorityRank(priority) {
  return { P0: 0, P1: 1, P2: 2 }[priority] ?? 9;
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
  if (/existing|claim|verify|claimed profile|live listing/i.test(text)) {
    reasons.push('existing citation');
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

function existingCitationRank(row) {
  const text = `${row.channel} ${row.target} ${row.landing_url} ${row.anchor_or_listing_phrase} ${row.notes}`;
  return /existing|claim|verify|claimed profile|live listing/i.test(text) ? 0 : 1;
}

function highFitChannelRank(row) {
  return /restaurant technology|partner outreach|POS-specific outreach|Chinese business association/i.test(row.channel) ? 0 : 1;
}

function compareRows(a, b) {
  const scoreDiff = opportunityScore(b).score - opportunityScore(a).score;
  if (scoreDiff) return scoreDiff;
  const priorityDiff = priorityRank(a.priority) - priorityRank(b.priority);
  if (priorityDiff) return priorityDiff;
  const highFitDiff = highFitChannelRank(a) - highFitChannelRank(b);
  if (highFitDiff) return highFitDiff;
  const existingCitationDiff = existingCitationRank(a) - existingCitationRank(b);
  if (existingCitationDiff) return existingCitationDiff;
  return a.channel.localeCompare(b.channel) || a.target.localeCompare(b.target);
}

function packetHint(row) {
  if (row.target === 'Product Hunt Serviio listing') return 'Claim or verify the existing Product Hunt page, update the restaurant AI phone ordering and POS integration positioning if access is available, then record an updated listing screenshot or owner/account confirmation URL.';
  if (row.channel === 'Webmaster tool') return 'Submit sitemap or priority URLs, then record confirmation in the tracker.';
  if (row.channel === 'Business profile') return 'Use business profile copy, service-area language, phone, logo, and clean homepage URL if UTM is rejected.';
  if (row.channel === 'AI directory') return 'Use the AI Directory Form Pack and choose voice AI, AI agent, automation, restaurant technology, or customer service AI.';
  if (row.channel === 'Chinese business association') return 'Use the Chinese Association Outreach Copy and include both English and Chinese landing URLs.';
  if (row.channel === 'Restaurant technology directory') return 'Use Restaurant Technology Directory Copy and emphasize POS-ready phone-order workflows.';
  if (row.channel === 'POS-specific outreach') return 'Use POS-Specific Partner Outreach Copy and swap in the POS name plus the tracker UTM URL.';
  if (row.channel === 'Partner outreach' && /website/i.test(row.target)) return 'Use Restaurant Website and Online Ordering Partner Copy with the tracker UTM URL.';
  if (row.channel === 'Partner outreach') return 'Use POS Consultant Outreach Copy and ask for a referral path.';
  if (row.channel === 'Community post') return 'Use Community Permission Request Copy before posting; use Approved Community Post only after permission.';
  return 'Use the closest copy block in docs/free-search-submission-copy.md.';
}

function researchQueries(row) {
  const text = `${row.target} ${row.anchor_or_listing_phrase} ${row.notes}`;
  const posMatch = text.match(/39 Miles|MenuSifu|Chowbus|Mealkeyway|Square|Toast|Clover/i);
  const pos = posMatch ? posMatch[0] : '';

  if (row.channel === 'Partner outreach') {
    return [
      '"restaurant POS consultant" "Chinese restaurant"',
      '"restaurant POS implementation" "takeout"',
      '"restaurant technology consultant" "phone orders"',
    ];
  }
  if (row.channel === 'POS-specific outreach' && pos) {
    return [
      `"${pos}" "restaurant consultant"`,
      `"${pos}" "Chinese restaurant"`,
      `"${pos}" "POS setup" "restaurant"`,
    ];
  }
  if (row.channel === 'Restaurant technology directory') {
    return [
      '"restaurant technology directory" "POS"',
      '"restaurant software directory" "phone orders"',
      '"restaurant POS integration" "vendor directory"',
    ];
  }
  return [
    `"${row.target}" "submit"`,
    `"${row.anchor_or_listing_phrase}" "directory"`,
  ];
}

function nextActionRows(rows, { readyLimit = READY_LIMIT, researchLimit = RESEARCH_LIMIT } = {}) {
  return {
    liveOptimizationRows: rows
      .filter((row) => row.status === 'live' && row.date_live && LIVE_OPTIMIZATION_PATTERN.test(row.notes || ''))
      .sort(compareRows),
    readyRows: rows
      .filter((row) => row.status === 'not_started' && hasTargetUrl(row))
      .sort(compareRows)
      .slice(0, readyLimit),
    researchRows: rows
      .filter((row) => row.status === 'not_started' && !hasTargetUrl(row))
      .sort(compareRows)
      .slice(0, researchLimit),
  };
}

function renderNextActionReport(rows, options = {}) {
  const { liveOptimizationRows, readyRows, researchRows } = nextActionRows(rows, options);
  const lines = [
    '# Serviio Free Search Next Actions',
    '',
    'Use this before manual submission sessions. Complete live listing optimizations and ready submissions first when time is limited, then research partner/POS targets.',
    '',
  ];

  if (liveOptimizationRows.length) {
    lines.push('## Live Listing Optimizations');
    for (const row of liveOptimizationRows) {
      const opportunity = opportunityScore(row);
      lines.push(`- ${opportunity.score}/100 [${row.priority}] ${row.target}`);
      lines.push(`  Channel: ${row.channel}`);
      lines.push(`  Why: ${opportunity.reasons}`);
      lines.push(`  Live listing: ${row.url}`);
      lines.push(`  Landing: ${row.landing_url}`);
      lines.push(`  UTM: ${row.utm_url}`);
      lines.push(`  Phrase: ${row.anchor_or_listing_phrase}`);
      lines.push(`  Copy hint: ${packetHint(row)}`);
      lines.push('  After action: keep status=live and record updated listing screenshot or owner/account confirmation.');
    }
    lines.push('');
  }

  lines.push('## Ready Submissions');
  for (const row of readyRows) {
    const opportunity = opportunityScore(row);
    lines.push(`- ${opportunity.score}/100 [${row.priority}] ${row.target}`);
    lines.push(`  Channel: ${row.channel}`);
    lines.push(`  Why: ${opportunity.reasons}`);
    lines.push(`  Submit/contact: ${row.url}`);
    lines.push(`  Landing: ${row.landing_url}`);
    lines.push(`  UTM: ${row.utm_url}`);
    lines.push(`  Phrase: ${row.anchor_or_listing_phrase}`);
    lines.push(`  Copy hint: ${packetHint(row)}`);
    lines.push('  After action: set status=submitted, owner, date_submitted, and notes in docs/free-search-marketing-tracker.csv');
  }

  lines.push('');
  lines.push('## Target Research');
  for (const row of researchRows) {
    const opportunity = opportunityScore(row);
    lines.push(`- ${opportunity.score}/100 [${row.priority}] ${row.channel} - ${row.target}`);
    lines.push(`  Why: ${opportunity.reasons}`);
    lines.push(`  Landing: ${row.landing_url}`);
    lines.push(`  UTM: ${row.utm_url}`);
    lines.push(`  Phrase: ${row.anchor_or_listing_phrase}`);
    lines.push('  Searches:');
    for (const query of researchQueries(row)) {
      lines.push(`    - ${query}`);
    }
    lines.push('  After research: replace blank url with the submission/contact URL, or add notes if rejected/not relevant.');
  }

  return `${lines.join('\n')}\n`;
}

function main() {
  const rows = parseCsv(fs.readFileSync(CSV_PATH, 'utf8'));
  process.stdout.write(renderNextActionReport(rows));
}

if (require.main === module) {
  main();
}

module.exports = {
  compareRows,
  hasTargetUrl,
  nextActionRows,
  opportunityScore,
  packetHint,
  parseCsv,
  renderNextActionReport,
  researchQueries,
};
