const fs = require('fs');
const path = require('path');
const {
  buildRecords,
  normalizeRecord,
  parseCsv,
} = require('./analyze-search-console');
const { toCsv: watchlistToCsv } = require('./export-first-page-ranking-watchlist');

const DEFAULT_WATCHLIST = 'docs/first-page-ranking-watchlist.csv';

const HELP = `Usage:
  node scripts/update-first-page-ranking-watchlist.js path/to/search-console-export.csv [--watchlist docs/first-page-ranking-watchlist.csv] [--out docs/first-page-ranking-watchlist.csv] [--checked YYYY-MM-DD]

Updates first-page ranking watchlist rows with current Search Console position, clicks, impressions, CTR, and status.
`;

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function parseArgs(argv) {
  const args = {
    input: '',
    watchlist: DEFAULT_WATCHLIST,
    out: DEFAULT_WATCHLIST,
    checked: todayIso(),
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help' || arg === '-h') {
      args.help = true;
    } else if (arg === '--watchlist') {
      args.watchlist = argv[index + 1] || DEFAULT_WATCHLIST;
      index += 1;
    } else if (arg === '--out') {
      args.out = argv[index + 1] || DEFAULT_WATCHLIST;
      index += 1;
    } else if (arg === '--checked') {
      args.checked = argv[index + 1] || args.checked;
      index += 1;
    } else if (!args.input) {
      args.input = arg;
    } else {
      throw new Error(`Unexpected argument: ${arg}`);
    }
  }

  if (!args.help && !/^\d{4}-\d{2}-\d{2}$/.test(args.checked)) {
    throw new Error('--checked must use YYYY-MM-DD');
  }

  return args;
}

function normalizeQuery(value) {
  return String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
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

function pct(value) {
  return `${Number(value || 0).toFixed(1)}%`;
}

function aggregateRows(rows) {
  const impressions = rows.reduce((sum, row) => sum + row.impressions, 0);
  const clicks = rows.reduce((sum, row) => sum + row.clicks, 0);
  const weightedPosition = rows.reduce((sum, row) => sum + (row.position * Math.max(1, row.impressions)), 0);
  const positionWeight = rows.reduce((sum, row) => sum + Math.max(1, row.impressions), 0);
  return {
    clicks,
    impressions,
    ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
    position: positionWeight > 0 ? weightedPosition / positionWeight : 0,
  };
}

function statusFor({ data, matchedTargetPage }) {
  if (!data) return 'no_search_console_data';
  if (!matchedTargetPage) return 'ranking_on_other_page';
  if (data.position > 0 && data.position <= 10) return 'page_one';
  if (data.position > 10 && data.position <= 20) return 'near_page_one';
  if (data.position > 20) return 'needs_authority_or_relevance';
  return 'needs_search_console_data';
}

function buildSearchConsoleIndex(rows) {
  const byQuery = new Map();
  for (const row of rows) {
    const query = normalizeQuery(row.query);
    if (!query) continue;
    if (!byQuery.has(query)) byQuery.set(query, []);
    byQuery.get(query).push(row);
  }
  return byQuery;
}

function updateWatchlistRows(watchlistRows, searchRows, { checked = todayIso() } = {}) {
  const byQuery = buildSearchConsoleIndex(searchRows);
  return watchlistRows.map((row) => {
    const candidates = byQuery.get(normalizeQuery(row.query)) || [];
    const targetPage = canonicalPath(row.target_page);
    const targetMatches = candidates.filter((candidate) => candidate.page === targetPage);
    const matchedTargetPage = targetMatches.length > 0;
    const dataRows = matchedTargetPage ? targetMatches : candidates;
    const data = dataRows.length > 0 ? aggregateRows(dataRows) : null;

    if (!data) {
      return {
        ...row,
        current_position: '',
        current_clicks: '',
        current_impressions: '',
        current_ctr: '',
        last_checked: checked,
        status: 'no_search_console_data',
      };
    }

    return {
      ...row,
      current_position: data.position.toFixed(1),
      current_clicks: String(data.clicks),
      current_impressions: String(data.impressions),
      current_ctr: pct(data.ctr),
      last_checked: checked,
      status: statusFor({ data, matchedTargetPage }),
    };
  });
}

function renderSummary(rows) {
  const counts = rows.reduce((acc, row) => {
    acc[row.status] = (acc[row.status] || 0) + 1;
    return acc;
  }, {});
  const pageOne = counts.page_one || 0;
  const near = counts.near_page_one || 0;
  const noData = counts.no_search_console_data || 0;
  return [
    '# First-Page Ranking Watchlist Update',
    '',
    `Rows updated: ${rows.length}`,
    `Page-one rows: ${pageOne}`,
    `Near-page-one rows: ${near}`,
    `Rows without Search Console data: ${noData}`,
    '',
    '## Status Counts',
    ...Object.entries(counts).sort().map(([status, count]) => `- ${status}: ${count}`),
  ].join('\n');
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || !args.input) {
    process.stdout.write(HELP);
    process.exit(args.help ? 0 : 1);
  }

  const watchlistRows = buildRecords(parseCsv(fs.readFileSync(args.watchlist, 'utf8')));
  const searchRows = buildRecords(parseCsv(fs.readFileSync(args.input, 'utf8'))).map(normalizeRecord);
  const updatedRows = updateWatchlistRows(watchlistRows, searchRows, { checked: args.checked });
  const outPath = path.resolve(args.out || DEFAULT_WATCHLIST);
  fs.writeFileSync(outPath, `${watchlistToCsv(updatedRows)}\n`);
  process.stdout.write(`${renderSummary(updatedRows)}\n\nWrote updated watchlist to ${outPath}\n`);
}

if (require.main === module) {
  main();
}

module.exports = {
  parseArgs,
  renderSummary,
  updateWatchlistRows,
};
