const fs = require('fs');
const path = require('path');

const SITE_ORIGIN = 'https://serviio.ai';
const SCORECARD_PATH = 'docs/google-search-console-scorecard.md';

const CLUSTER_RULES = [
  { name: 'Chinese restaurant', pattern: /chinese|mandarin|cantonese|takeout/ },
  { name: 'POS integration', pattern: /pos|39 miles|square|toast|clover|menusifu|chowbus|mealkeyway/ },
  { name: 'Phone answering', pattern: /answering|receptionist|virtual receptionist|missed call|call answering/ },
  { name: 'Order taking', pattern: /order taker|order taking|phone order|phone ordering|ordering system/ },
  { name: 'Restaurant AI category', pattern: /assistant|customer service|support|voice assistant|automation|restaurant tech/ },
  { name: 'Local service area', pattern: /california|boston|philadelphia|pennsylvania|massachusetts|new york|new jersey|texas/ },
];

const SOURCE_HINTS = {
  'Chinese restaurant': ['/', '/chinese-restaurant-ai-phone-ordering/', '/site-map/'],
  'POS integration': ['/', '/restaurant-pos-phone-order-integration/', '/guides/connect-phone-orders-to-pos/'],
  'Phone answering': ['/', '/restaurant-phone-answering-service/', '/chinese-restaurant-phone-answering-service/'],
  'Order taking': ['/', '/restaurant-ai-phone-order-taker/', '/ai-order-taking-for-restaurants/'],
  'Restaurant AI category': ['/', '/restaurant-ai-assistant/', '/restaurant-automation-software-phone-orders/'],
  'Local service area': ['/service-areas/', '/', '/site-map/'],
  Other: ['/', '/site-map/'],
};

function walkHtmlPages(dir = '.') {
  const pages = [];
  for (const name of fs.readdirSync(dir)) {
    if (name === 'node_modules' || name === '.git') continue;
    const filePath = path.join(dir, name);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      pages.push(...walkHtmlPages(filePath));
    } else if (name === 'index.html') {
      pages.push(filePath.replace(/^\.\//, ''));
    }
  }
  return pages.sort();
}

function pagePathFromFile(file) {
  if (file === 'index.html') return '/';
  return `/${file.replace(/index\.html$/, '')}`;
}

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/<script[\s\S]*?<\/script>/g, ' ')
    .replace(/<style[\s\S]*?<\/style>/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#160;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/[^\p{L}\p{N}&%]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractSection(markdown, heading) {
  const match = markdown.match(new RegExp(`## ${heading}\\n([\\s\\S]*?)(?:\\n## |\\n$)`));
  return match ? match[1] : '';
}

function extractPriorityQueries() {
  const markdown = fs.readFileSync(SCORECARD_PATH, 'utf8');
  const section = extractSection(markdown, 'Priority Queries');
  return [...section.matchAll(/^- (.+)$/gm)]
    .map((match) => match[1].trim())
    .filter(Boolean);
}

function clusterFor(keyword) {
  const normalized = normalizeText(keyword);
  const rule = CLUSTER_RULES.find((candidate) => candidate.pattern.test(normalized));
  return rule ? rule.name : 'Other';
}

function loadPages() {
  return walkHtmlPages().map((file) => {
    const html = fs.readFileSync(file, 'utf8');
    return {
      file,
      path: pagePathFromFile(file),
      text: normalizeText(html),
    };
  });
}

function coverageForKeyword(keyword, pages) {
  const normalizedKeyword = normalizeText(keyword);
  const exactPages = pages
    .filter((page) => page.text.includes(normalizedKeyword))
    .map((page) => page.path);

  return {
    keyword,
    cluster: clusterFor(keyword),
    exactPages,
  };
}

function printCoverage(rows) {
  const covered = rows.filter((row) => row.exactPages.length > 0);
  const missing = rows.filter((row) => row.exactPages.length === 0);
  const byCluster = new Map();

  for (const row of rows) {
    if (!byCluster.has(row.cluster)) {
      byCluster.set(row.cluster, { total: 0, covered: 0, missing: [] });
    }
    const cluster = byCluster.get(row.cluster);
    cluster.total += 1;
    if (row.exactPages.length > 0) {
      cluster.covered += 1;
    } else {
      cluster.missing.push(row.keyword);
    }
  }

  console.log('# Serviio Keyword Coverage Audit');
  console.log('');
  console.log(`Priority queries checked: ${rows.length}`);
  console.log(`Exact phrase covered: ${covered.length}`);
  console.log(`Exact phrase missing: ${missing.length}`);
  console.log(`Coverage: ${Math.round((covered.length / rows.length) * 100)}%`);
  console.log('');

  console.log('## Coverage By Cluster');
  for (const [clusterName, cluster] of [...byCluster.entries()].sort()) {
    console.log(`- ${clusterName}: ${cluster.covered}/${cluster.total}`);
  }
  console.log('');

  console.log('## Missing Exact Phrases');
  for (const row of missing) {
    const hints = SOURCE_HINTS[row.cluster] || SOURCE_HINTS.Other;
    console.log(`- ${row.keyword}`);
    console.log(`  Cluster: ${row.cluster}`);
    console.log(`  Suggested source hubs: ${hints.join(', ')}`);
  }
  console.log('');

  console.log('## Covered Phrase Examples');
  for (const row of covered.slice(0, 20)) {
    const pages = row.exactPages.slice(0, 3).join(', ');
    console.log(`- ${row.keyword}: ${pages}`);
  }
  console.log('');
  console.log(`Source: ${SITE_ORIGIN}`);
}

const keywords = extractPriorityQueries();
const pages = loadPages();

if (keywords.length === 0) {
  console.error(`${SCORECARD_PATH}: no priority queries found`);
  process.exit(1);
}

printCoverage(keywords.map((keyword) => coverageForKeyword(keyword, pages)));
