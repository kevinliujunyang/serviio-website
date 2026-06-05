const fs = require('fs');
const path = require('path');

const HELP = `Usage:
  node scripts/analyze-search-console.js path/to/search-console-export.csv [--out report.md]

Accepts Google Search Console CSV exports with query/page, clicks, impressions, ctr, and position columns.
Writes a Serviio SEO action report for Chinese restaurant, POS, and restaurant AI phone-ordering clusters.
`;

const CLUSTERS = [
  {
    name: 'Chinese restaurant AI phone ordering',
    pattern: /chinese|中餐|mandarin|cantonese|takeout/i,
    preferredPath: '/chinese-restaurant-ai-phone-ordering/',
  },
  {
    name: 'POS integration and POS-ready phone orders',
    pattern: /pos|39\s*miles|square|toast|clover|menusifu|menu\s*sifu|chowbus|mealkeyway/i,
    preferredPath: '/restaurant-pos-phone-order-integration/',
  },
  {
    name: 'Restaurant AI phone order taker',
    pattern: /order\s*taker|order\s*taking|phone\s*order|phone\s*ordering/i,
    preferredPath: '/restaurant-ai-phone-order-taker/',
  },
  {
    name: 'Restaurant phone answering and receptionist',
    pattern: /answering|answer\s*phone|receptionist|virtual\s*receptionist|missed\s*call|call\s*answer/i,
    preferredPath: '/restaurant-phone-answering-service/',
  },
  {
    name: 'Restaurant AI assistant and automation',
    pattern: /assistant|automation|customer\s*service|support|restaurant\s*tech|technology/i,
    preferredPath: '/restaurant-ai-assistant/',
  },
  {
    name: 'Local service-area demand',
    pattern: /california|san\s*francisco|los\s*angeles|new\s*york|new\s*jersey|texas|houston|seattle|chicago|boston|philadelphia|pennsylvania|massachusetts/i,
    preferredPath: '/service-areas/',
  },
];

const LINK_SOURCE_HINTS = {
  'Chinese restaurant AI phone ordering': '/, /chinese-restaurant-ai-phone-ordering/, /site-map/',
  'POS integration and POS-ready phone orders': '/, /restaurant-pos-phone-order-integration/, /guides/connect-phone-orders-to-pos/, /site-map/',
  'Restaurant AI phone order taker': '/, /restaurant-ai-phone-order-taker/, /ai-order-taking-for-restaurants/, /site-map/',
  'Restaurant phone answering and receptionist': '/, /restaurant-phone-answering-service/, /chinese-restaurant-phone-answering-service/, /site-map/',
  'Restaurant AI assistant and automation': '/, /restaurant-ai-assistant/, /restaurant-automation-software-phone-orders/, /site-map/',
  'Local service-area demand': '/service-areas/, /, /site-map/',
  'Unclassified restaurant AI demand': '/, /site-map/',
};

const POS_QUERY_PATTERN = /39\s*miles|square|toast|clover|menusifu|menu\s*sifu|chowbus|mealkeyway/i;
const PHONE_ORDER_PATTERN = /phone|call|answer|ordering|order\s*taker|order\s*taking|takeout|pickup|missed/i;
const COMMERCIAL_INTENT_PATTERN = /ai|assistant|agent|automation|service|system|integration|pos|ordering|answering|receptionist/i;
const BUYER_PAGE_PATTERN = /chinese-restaurant|pos|phone-order|phone-answering|ai-phone|restaurant-ai|service-areas/i;
const LOCAL_SERVICE_AREA_PATTERN = /california|san\s*francisco|los\s*angeles|new\s*york|new\s*jersey|texas|houston|seattle|chicago|boston|philadelphia|pennsylvania|massachusetts|service-area|service\s*area/i;

const FIELD_ALIASES = {
  query: ['query', 'queries', 'search query', 'top queries'],
  page: ['page', 'pages', 'landing page', 'url'],
  clicks: ['clicks', 'click'],
  impressions: ['impressions', 'impr'],
  ctr: ['ctr', 'click through rate', 'click-through rate'],
  position: ['position', 'avg position', 'average position', 'average google position'],
};

function parseArgs(argv) {
  const args = { input: '', out: '' };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help' || arg === '-h') {
      args.help = true;
    } else if (arg === '--out') {
      args.out = argv[index + 1] || '';
      index += 1;
    } else if (!args.input) {
      args.input = arg;
    } else {
      throw new Error(`Unexpected argument: ${arg}`);
    }
  }

  return args;
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        field += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      row.push(field);
      field = '';
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') index += 1;
      row.push(field);
      if (row.some((value) => value.trim() !== '')) rows.push(row);
      row = [];
      field = '';
    } else {
      field += char;
    }
  }

  if (field !== '' || row.length > 0) {
    row.push(field);
    if (row.some((value) => value.trim() !== '')) rows.push(row);
  }

  return rows;
}

function normalizeHeader(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ');
}

function buildRecords(csvRows) {
  if (csvRows.length < 2) {
    throw new Error('CSV must include a header row and at least one data row.');
  }

  const headers = csvRows[0].map((header) => header.trim());
  return csvRows.slice(1).map((row) => {
    const record = {};
    headers.forEach((header, index) => {
      record[header] = row[index] || '';
    });
    return record;
  });
}

function readField(record, aliases) {
  const normalizedToOriginal = new Map(
    Object.keys(record).map((key) => [normalizeHeader(key), key]),
  );

  for (const alias of aliases) {
    const original = normalizedToOriginal.get(normalizeHeader(alias));
    if (original && String(record[original] || '').trim() !== '') {
      return String(record[original]).trim();
    }
  }

  return '';
}

function toNumber(value) {
  const numeric = Number(String(value || '').replace(/[%,$\s]/g, ''));
  return Number.isFinite(numeric) ? numeric : 0;
}

function canonicalPath(value) {
  const text = String(value || '').trim();
  if (!text) return '';
  try {
    return new URL(text, 'https://serviio.ai').pathname;
  } catch {
    return text.startsWith('/') ? text : `/${text}`;
  }
}

function classifyCluster(query, page) {
  const haystack = `${query} ${page}`;
  return CLUSTERS.find((cluster) => cluster.pattern.test(haystack)) || {
    name: 'Unclassified restaurant AI demand',
    preferredPath: '',
  };
}

function normalizeRecord(record) {
  const query = readField(record, FIELD_ALIASES.query);
  const page = canonicalPath(readField(record, FIELD_ALIASES.page));
  const clicks = toNumber(readField(record, FIELD_ALIASES.clicks));
  const impressions = toNumber(readField(record, FIELD_ALIASES.impressions));
  const ctr = toNumber(readField(record, FIELD_ALIASES.ctr));
  const position = toNumber(readField(record, FIELD_ALIASES.position));
  const cluster = classifyCluster(query, page);

  return {
    query,
    page,
    clicks,
    impressions,
    ctr,
    position,
    cluster: cluster.name,
    preferredPath: cluster.preferredPath,
  };
}

function groupByCluster(rows) {
  const groups = new Map();

  for (const row of rows) {
    if (!groups.has(row.cluster)) {
      groups.set(row.cluster, {
        cluster: row.cluster,
        impressions: 0,
        clicks: 0,
        weightedPosition: 0,
        rows: [],
      });
    }

    const group = groups.get(row.cluster);
    group.impressions += row.impressions;
    group.clicks += row.clicks;
    group.weightedPosition += row.position * Math.max(1, row.impressions);
    group.rows.push(row);
  }

  return [...groups.values()]
    .map((group) => ({
      ...group,
      averagePosition: group.weightedPosition / group.rows.reduce((sum, row) => sum + Math.max(1, row.impressions), 0),
      ctr: group.impressions > 0 ? (group.clicks / group.impressions) * 100 : 0,
    }))
    .sort((a, b) => b.impressions - a.impressions);
}

function topRows(rows, predicate, limit = 10) {
  return rows
    .filter(predicate)
    .sort((a, b) => {
      if (b.impressions !== a.impressions) return b.impressions - a.impressions;
      return a.position - b.position;
    })
    .slice(0, limit);
}

function targetPath(row) {
  return row.page || row.preferredPath || '(manual review)';
}

function isChineseIntent(row) {
  return /chinese|中餐|asian|mandarin|cantonese/i.test(`${row.query} ${row.page} ${row.cluster}`);
}

function isPosIntent(row) {
  return /pos|point\s*of\s*sale/i.test(`${row.query} ${row.page} ${row.cluster}`) || POS_QUERY_PATTERN.test(`${row.query} ${row.page}`);
}

function isPhoneOrderIntent(row) {
  return PHONE_ORDER_PATTERN.test(`${row.query} ${row.page} ${row.cluster}`);
}

function isLocalServiceAreaIntent(row) {
  return row.cluster === 'Local service-area demand' || LOCAL_SERVICE_AREA_PATTERN.test(`${row.query} ${row.page}`);
}

function buyerIntentScore(row) {
  let score = 0;
  const reasons = [];

  if (isChineseIntent(row)) {
    score += 25;
    reasons.push('Chinese/Asian');
  }
  if (isPosIntent(row)) {
    score += 25;
    reasons.push('POS');
  }
  if (POS_QUERY_PATTERN.test(`${row.query} ${row.page}`)) {
    score += 20;
    reasons.push('named POS');
  }
  if (isPhoneOrderIntent(row)) {
    score += 15;
    reasons.push('phone-order');
  }
  if (isLocalServiceAreaIntent(row)) {
    score += 12;
    reasons.push('local service area');
  }
  if (COMMERCIAL_INTENT_PATTERN.test(row.query)) {
    score += 10;
    reasons.push('commercial term');
  }
  if (BUYER_PAGE_PATTERN.test(row.page)) {
    score += 8;
    reasons.push('buyer page');
  }
  if (row.position > 7 && row.position <= 20) {
    score += 10;
    reasons.push('near page one');
  } else if (row.position > 20 && row.position <= 50) {
    score += 5;
    reasons.push('needs authority');
  }
  if (row.impressions >= 50) {
    score += 10;
    reasons.push('50+ impressions');
  } else if (row.impressions >= 10) {
    score += 5;
    reasons.push('10+ impressions');
  }

  return {
    score: Math.min(100, score),
    reasons: reasons.join(', ') || 'low commercial signal',
  };
}

function recommendedAction(row) {
  if (!row.page && row.preferredPath) {
    return `Map query to ${row.preferredPath}; request indexing and add an internal link from ${LINK_SOURCE_HINTS[row.cluster] || '/'}.`;
  }
  if (row.position > 0 && row.position <= 10 && row.ctr < 2) {
    return 'Rewrite title/meta for clearer Chinese restaurant, POS, and phone-order pain; keep page indexed.';
  }
  if (isLocalServiceAreaIntent(row)) {
    return 'Build city/state relevance with exact-anchor internal links from service-area hubs and one local directory or association backlink.';
  }
  if (row.position > 8 && row.position <= 20) {
    return 'Push to page one with exact-anchor internal links, FAQ copy, and one relevant directory/partner backlink.';
  }
  if (row.position > 20) {
    return 'Strengthen on-page coverage, add source-hub internal links, then build authority to this page.';
  }
  return 'Monitor clicks and preserve ranking; use the winning query as an anchor to related POS pages.';
}

function buildBuyerIntentActions(rows) {
  return rows
    .filter((row) => row.impressions >= 5 && buyerIntentScore(row).score >= 45)
    .map((row) => {
      const intent = buyerIntentScore(row);
      return {
        ...row,
        intentScore: intent.score,
        intentReasons: intent.reasons,
        action: recommendedAction(row),
      };
    })
    .sort((a, b) => {
      if (b.intentScore !== a.intentScore) return b.intentScore - a.intentScore;
      if (b.impressions !== a.impressions) return b.impressions - a.impressions;
      return a.position - b.position;
    })
    .slice(0, 15);
}

function buildPosSpecificActions(rows) {
  return rows
    .filter((row) => row.impressions >= 3 && POS_QUERY_PATTERN.test(`${row.query} ${row.page}`))
    .map((row) => {
      const intent = buyerIntentScore(row);
      return {
        ...row,
        intentScore: intent.score,
        intentReasons: intent.reasons,
        action: recommendedAction(row),
      };
    })
    .sort((a, b) => {
      if (b.intentScore !== a.intentScore) return b.intentScore - a.intentScore;
      return b.impressions - a.impressions;
    })
    .slice(0, 12);
}

function buildInternalLinkActions(rows) {
  const candidates = rows.filter((row) =>
    row.impressions >= 5 &&
    row.position > 8 &&
    targetPath(row) !== '(manual review)'
  );
  const grouped = new Map();

  for (const row of candidates) {
    const target = targetPath(row);
    if (!grouped.has(target)) {
      grouped.set(target, {
        target,
        cluster: row.cluster,
        impressions: 0,
        weightedPosition: 0,
        rows: [],
      });
    }

    const group = grouped.get(target);
    group.impressions += row.impressions;
    group.weightedPosition += row.position * Math.max(1, row.impressions);
    group.rows.push(row);
  }

  return [...grouped.values()]
    .map((group) => ({
      ...group,
      averagePosition: group.weightedPosition / group.rows.reduce((sum, row) => sum + Math.max(1, row.impressions), 0),
      anchors: topRows(group.rows, () => true, 3).map((row) => row.query).filter(Boolean),
      sourceHints: LINK_SOURCE_HINTS[group.cluster] || LINK_SOURCE_HINTS['Unclassified restaurant AI demand'],
    }))
    .sort((a, b) => {
      if (b.impressions !== a.impressions) return b.impressions - a.impressions;
      return a.averagePosition - b.averagePosition;
    })
    .slice(0, 10);
}

function formatNumber(value, decimals = 0) {
  return Number(value || 0).toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function renderTable(headers, rows) {
  if (rows.length === 0) return '_No matching rows._';
  const separator = headers.map(() => '---');
  const lines = [
    `| ${headers.join(' | ')} |`,
    `| ${separator.join(' | ')} |`,
    ...rows.map((row) => `| ${row.join(' | ')} |`),
  ];
  return lines.join('\n');
}

function renderReport(rows) {
  const totalClicks = rows.reduce((sum, row) => sum + row.clicks, 0);
  const totalImpressions = rows.reduce((sum, row) => sum + row.impressions, 0);
  const pageOne = rows.filter((row) => row.position > 0 && row.position <= 10);
  const clusters = groupByCluster(rows);
  const weakPosition = topRows(rows, (row) => row.impressions >= 10 && row.position > 20);
  const nearPageOne = topRows(rows, (row) => row.impressions >= 5 && row.position > 8 && row.position <= 20);
  const lowCtr = topRows(rows, (row) => row.impressions >= 10 && row.position > 0 && row.position <= 20 && row.ctr < 2);
  const noKnownPage = topRows(rows, (row) => row.impressions >= 5 && !row.page);
  const internalLinkActions = buildInternalLinkActions(rows);
  const buyerIntentActions = buildBuyerIntentActions(rows);
  const posSpecificActions = buildPosSpecificActions(rows);

  return [
    '# Serviio Search Console Export Analysis',
    '',
    '## Summary',
    '',
    `- Rows analyzed: ${rows.length}`,
    `- Total clicks: ${formatNumber(totalClicks)}`,
    `- Total impressions: ${formatNumber(totalImpressions)}`,
    `- Page-one query/page rows: ${pageOne.length}`,
    '',
    '## Cluster Performance',
    '',
    renderTable(
      ['Cluster', 'Impressions', 'Clicks', 'CTR', 'Avg position'],
      clusters.map((cluster) => [
        cluster.cluster,
        formatNumber(cluster.impressions),
        formatNumber(cluster.clicks),
        `${formatNumber(cluster.ctr, 1)}%`,
        formatNumber(cluster.averagePosition, 1),
      ]),
    ),
    '',
    '## Buyer-Intent Action Queue',
    '',
    'Highest commercial-value rows across Chinese restaurant, POS, named POS, and phone-order intent. Work these before generic restaurant-tech queries.',
    '',
    renderTable(
      ['Score', 'Query', 'Page', 'Impressions', 'CTR', 'Position', 'Why', 'Action'],
      buyerIntentActions.map((row) => [
        `${row.intentScore}/100`,
        row.query || '(query missing)',
        row.page || row.preferredPath || '(page missing)',
        formatNumber(row.impressions),
        `${formatNumber(row.ctr, 1)}%`,
        formatNumber(row.position, 1),
        row.intentReasons,
        row.action,
      ]),
    ),
    '',
    '## POS-Specific Query Opportunities',
    '',
    'Named-POS rows are usually lower volume but higher lead quality. Use these for POS landing-page updates, partner outreach anchors, and targeted backlinks.',
    '',
    renderTable(
      ['Score', 'Query', 'Page', 'Impressions', 'Position', 'Action'],
      posSpecificActions.map((row) => [
        `${row.intentScore}/100`,
        row.query || '(query missing)',
        row.page || row.preferredPath || '(page missing)',
        formatNumber(row.impressions),
        formatNumber(row.position, 1),
        row.action,
      ]),
    ),
    '',
    '## Page-One Wins',
    '',
    renderTable(
      ['Query', 'Page', 'Clicks', 'Impressions', 'Position'],
      topRows(pageOne, () => true, 10).map((row) => [
        row.query || '(query missing)',
        row.page || '(page missing)',
        formatNumber(row.clicks),
        formatNumber(row.impressions),
        formatNumber(row.position, 1),
      ]),
    ),
    '',
    '## Internal-Link Opportunities',
    '',
    'Queries with impressions but average position worse than 20. Add internal links, strengthen exact-match headings, or build authority to the listed page.',
    '',
    renderTable(
      ['Query', 'Cluster', 'Page', 'Impressions', 'Position', 'Preferred page'],
      weakPosition.map((row) => [
        row.query || '(query missing)',
        row.cluster,
        row.page || '(page missing)',
        formatNumber(row.impressions),
        formatNumber(row.position, 1),
        row.preferredPath || '(manual review)',
      ]),
    ),
    '',
    '## Internal-Link Action Queue',
    '',
    'Aggregated target pages from weak-position and near-page-one rows. Add exact or close-variant anchors from the suggested source hubs first.',
    '',
    renderTable(
      ['Target page', 'Cluster', 'Impressions', 'Avg position', 'Anchor phrases', 'Suggested source hubs'],
      internalLinkActions.map((action) => [
        action.target,
        action.cluster,
        formatNumber(action.impressions),
        formatNumber(action.averagePosition, 1),
        action.anchors.join('<br>') || '(query missing)',
        action.sourceHints,
      ]),
    ),
    '',
    '## Near Page-One Opportunities',
    '',
    'Queries in position 8-20 are the best candidates for title/meta improvement, stronger FAQ copy, and backlinks.',
    '',
    renderTable(
      ['Query', 'Cluster', 'Page', 'Impressions', 'CTR', 'Position'],
      nearPageOne.map((row) => [
        row.query || '(query missing)',
        row.cluster,
        row.page || '(page missing)',
        formatNumber(row.impressions),
        `${formatNumber(row.ctr, 1)}%`,
        formatNumber(row.position, 1),
      ]),
    ),
    '',
    '## CTR Rewrite Candidates',
    '',
    'Rows in the top 20 with low CTR. Rewrite titles/meta descriptions around Chinese restaurant, POS readiness, and phone-order pain.',
    '',
    renderTable(
      ['Query', 'Page', 'Impressions', 'CTR', 'Position'],
      lowCtr.map((row) => [
        row.query || '(query missing)',
        row.page || '(page missing)',
        formatNumber(row.impressions),
        `${formatNumber(row.ctr, 1)}%`,
        formatNumber(row.position, 1),
      ]),
    ),
    '',
    '## Rows Missing Landing Page',
    '',
    renderTable(
      ['Query', 'Cluster', 'Impressions', 'Position', 'Preferred page'],
      noKnownPage.map((row) => [
        row.query || '(query missing)',
        row.cluster,
        formatNumber(row.impressions),
        formatNumber(row.position, 1),
        row.preferredPath || '(manual review)',
      ]),
    ),
    '',
  ].join('\n');
}

function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help || !args.input) {
    process.stdout.write(HELP);
    process.exit(args.help ? 0 : 1);
  }

  const inputPath = path.resolve(args.input);
  const csvRows = parseCsv(fs.readFileSync(inputPath, 'utf8'));
  const rows = buildRecords(csvRows).map(normalizeRecord);
  const report = renderReport(rows);

  if (args.out) {
    const outPath = path.resolve(args.out);
    fs.writeFileSync(outPath, `${report}\n`);
    process.stdout.write(`Wrote Search Console analysis to ${outPath}\n`);
  } else {
    process.stdout.write(`${report}\n`);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  buyerIntentScore,
  buildBuyerIntentActions,
  buildPosSpecificActions,
  normalizeRecord,
  parseCsv,
  renderReport,
};
