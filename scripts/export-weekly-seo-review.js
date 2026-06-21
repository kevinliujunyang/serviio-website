const fs = require('fs');
const path = require('path');
const { buildRecords, parseCsv } = require('./analyze-search-console');
const {
  buildRankingActions,
  firstHourAuthorityCoverageRows,
  buildAuthoritySubmissionBatches,
} = require('./export-ranking-action-queue');
const {
  authorityScore,
  missingBusinessProfileRows,
  missingCustomerProofRows,
  nextMilestones,
} = require('./audit-seo-authority');
const { opportunityScore } = require('./print-free-search-submission-packets');

const DEFAULT_WATCHLIST = 'docs/first-page-ranking-watchlist.csv';
const DEFAULT_AUTHORITY = 'docs/free-search-marketing-tracker.csv';
const DEFAULT_OUT = 'docs/weekly-seo-review.md';

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function parseArgs(argv) {
  const args = {
    watchlist: DEFAULT_WATCHLIST,
    authority: DEFAULT_AUTHORITY,
    out: DEFAULT_OUT,
    today: todayIso(),
    limit: 10,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help' || arg === '-h') {
      args.help = true;
    } else if (arg === '--watchlist') {
      args.watchlist = argv[index + 1] || DEFAULT_WATCHLIST;
      index += 1;
    } else if (arg === '--authority') {
      args.authority = argv[index + 1] || DEFAULT_AUTHORITY;
      index += 1;
    } else if (arg === '--out') {
      args.out = argv[index + 1] || DEFAULT_OUT;
      index += 1;
    } else if (arg === '--today') {
      args.today = argv[index + 1] || args.today;
      index += 1;
    } else if (arg === '--limit') {
      args.limit = Number(argv[index + 1] || args.limit);
      index += 1;
    } else {
      throw new Error(`Unexpected argument: ${arg}`);
    }
  }

  if (!Number.isInteger(args.limit) || args.limit < 1) {
    throw new Error('--limit must be a positive integer');
  }
  if (!args.help && !/^\d{4}-\d{2}-\d{2}$/.test(args.today)) {
    throw new Error('--today must use YYYY-MM-DD');
  }

  return args;
}

function statusCounts(rows) {
  return rows.reduce((counts, row) => {
    const status = row.status || 'unknown';
    counts[status] = (counts[status] || 0) + 1;
    return counts;
  }, {});
}

function firstHourAuthorityRows(authorityRows) {
  const targets = new Set([
    'Google Business Profile',
    'MenuSifu restaurant consultants',
    '39 Miles restaurant consultants',
    'Pilot restaurant testimonial',
  ]);
  return authorityRows
    .filter((row) => targets.has(row.target))
    .sort((a, b) => {
      const order = {
        'Google Business Profile': 0,
        'MenuSifu restaurant consultants': 1,
        '39 Miles restaurant consultants': 2,
        'Pilot restaurant testimonial': 3,
      };
      return order[a.target] - order[b.target];
    });
}

function buildWeeklyReview({ watchlistRows, authorityRows, today = todayIso(), limit = 10 }) {
  const rankingActions = buildRankingActions(watchlistRows, { limit, today });
  const authority = authorityScore(authorityRows);
  const authorityBatches = buildAuthoritySubmissionBatches(rankingActions, today);

  return {
    today,
    watchlist: {
      totalRows: watchlistRows.length,
      statusCounts: statusCounts(watchlistRows),
      needsSearchConsoleData: watchlistRows.filter((row) => ['needs_search_console_data', 'no_search_console_data'].includes(row.status)),
    },
    rankingActions,
    authority: {
      ...authority,
      milestones: nextMilestones(authority),
      firstHourRows: firstHourAuthorityRows(authorityRows),
      missingBusinessProfileRows: missingBusinessProfileRows(authorityRows),
      missingCustomerProofRows: missingCustomerProofRows(authorityRows),
      firstHourRankingCoverage: firstHourAuthorityCoverageRows(authorityBatches),
    },
  };
}

function table(headers, rows, emptyText) {
  if (rows.length === 0) return emptyText || '_No rows._';
  return [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows,
  ].join('\n');
}

function renderStatusCounts(counts) {
  return Object.entries(counts)
    .sort()
    .map(([status, count]) => `- ${status}: ${count}`)
    .join('\n');
}

function renderWeeklyReview(review) {
  const rankingRows = review.rankingActions.map((row) => `| ${row.action_score}/100 | ${row.action_type} | ${row.query} | ${row.target_page} | ${row.current_position || '-'} | ${row.authority_target || '-'} | ${row.recommended_action} |`);
  const firstHourRows = review.authority.firstHourRows.map((row) => {
    const score = opportunityScore(row).score;
    return `| ${row.target} | ${row.channel} | ${row.status || 'not_started'} | ${score}/100 | ${row.url} |`;
  });
  const coverageRows = review.authority.firstHourRankingCoverage.map((row) => `| ${row.authority_target} | ${row.max_score}/100 | ${row.supporting_queries} | ${row.target_pages} |`);

  return [
    '# Serviio Weekly SEO Review',
    '',
    `Review date: ${review.today}`,
    '',
    '## Ranking Data Status',
    '',
    `Watchlist rows: ${review.watchlist.totalRows}`,
    '',
    renderStatusCounts(review.watchlist.statusCounts),
    '',
    review.watchlist.needsSearchConsoleData.length > 0
      ? `Search Console export needed for ${review.watchlist.needsSearchConsoleData.length} rows before claiming ranking progress.`
      : 'Search Console data is present for every tracked row.',
    '',
    '## Priority Ranking Actions',
    '',
    table(
      ['Score', 'Type', 'Query', 'Target page', 'Position', 'Authority target', 'Action'],
      rankingRows,
      '_No ranking actions available._',
    ),
    '',
    '## Authority Blocker',
    '',
    `Authority score: ${review.authority.score}/100`,
    `Submitted or follow-up rows: ${review.authority.submittedRows.length}`,
    `Live authority rows: ${review.authority.liveRows.length}`,
    `High-fit partner/POS/association rows started: ${review.authority.highFitStartedRows.length}`,
    `Business profiles started: ${review.authority.businessProfileRows.length}`,
    `Customer proof rows started: ${review.authority.customerProofRows.length}`,
    '',
    '### Milestones',
    '',
    review.authority.milestones.map((milestone) => `- ${milestone}`).join('\n') || '- Authority milestones are currently satisfied.',
    '',
    '## First-Hour Authority Targets',
    '',
    table(
      ['Target', 'Channel', 'Status', 'Opportunity score', 'URL'],
      firstHourRows,
      '_No first-hour authority targets found._',
    ),
    '',
    '## Ranking Coverage From First-Hour Targets',
    '',
    table(
      ['Authority target', 'Ranking score', 'Supporting queries', 'Target pages'],
      coverageRows,
      '_No first-hour authority target currently supports the top ranking actions._',
    ),
    '',
    '## Next Workflow',
    '',
    '1. Export fresh Search Console query/page data and run `npm run search:watchlist:update -- path/to/search-console-export.csv --checked YYYY-MM-DD`.',
    '2. Regenerate this review with `npm run search:weekly-review -- --today YYYY-MM-DD`.',
    '3. Run `npm run marketing:submission-log:first-hour` and complete the first-hour authority targets before broader directory work.',
    '4. After real external submissions, update the tracker with `npm run marketing:mark` or the authority submission sync.',
    '5. Rerun `npm run seo:authority` and this review before adding more SEO pages.',
    '',
  ].join('\n');
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log('Usage: node scripts/export-weekly-seo-review.js [--watchlist docs/first-page-ranking-watchlist.csv] [--authority docs/free-search-marketing-tracker.csv] [--out docs/weekly-seo-review.md] [--today YYYY-MM-DD] [--limit 10]');
    return;
  }

  const watchlistRows = buildRecords(parseCsv(fs.readFileSync(args.watchlist, 'utf8')));
  const authorityRows = buildRecords(parseCsv(fs.readFileSync(args.authority, 'utf8')));
  const report = renderWeeklyReview(buildWeeklyReview({
    watchlistRows,
    authorityRows,
    today: args.today,
    limit: args.limit,
  }));
  const outPath = path.resolve(args.out || DEFAULT_OUT);
  fs.writeFileSync(outPath, report);
  console.log(`Wrote weekly SEO review to ${outPath}`);
}

if (require.main === module) {
  main();
}

module.exports = {
  buildWeeklyReview,
  parseArgs,
  renderWeeklyReview,
};
