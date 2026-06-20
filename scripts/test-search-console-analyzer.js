const assert = require('assert');
const fs = require('fs');
const {
  buildBuyerIntentActions,
  buildPosSpecificActions,
  buildTitleMetaRewriteBriefs,
  buildRecords,
  normalizeRecord,
  parseCsv,
  renderReport,
} = require('./analyze-search-console');
const {
  buildWatchlistRows,
  clusterFor: rankingWatchlistClusterFor,
  extractPriorityQueries,
  parseArgs: parseRankingWatchlistArgs,
  targetPageFor: rankingWatchlistTargetPageFor,
  toCsv: rankingWatchlistToCsv,
} = require('./export-first-page-ranking-watchlist');
const {
  parseArgs: parseRankingWatchlistUpdateArgs,
  renderSummary: renderRankingWatchlistUpdateSummary,
  updateWatchlistRows,
} = require('./update-first-page-ranking-watchlist');
const {
  actionType: rankingActionType,
  buildRankingActions,
  parseArgs: parseRankingActionArgs,
  renderRankingActionQueue,
} = require('./export-ranking-action-queue');

const csv = `Query,Page,Clicks,Impressions,CTR,Position
"MenuSifu AI phone ordering","https://serviio.ai/pos/menusifu-ai-phone-ordering/",1,42,1.2%,12.4
"Chinese restaurant AI phone ordering","https://serviio.ai/chinese-restaurant-ai-phone-ordering/",3,80,3.8%,9.2
"Chinese restaurant phone answering service","https://serviio.ai/chinese-restaurant-phone-answering-service/",0,55,0.6%,5.4
"restaurant tech trends","https://serviio.ai/restaurant-tech-ai-phone-ordering/",0,20,0%,34
"Square POS phone order AI","https://serviio.ai/pos/square-ai-phone-ordering/",0,18,0%,22
"Boston restaurant AI assistant","https://serviio.ai/service-areas/boston-chinese-restaurant-ai-phone-ordering/",0,12,0%,14
`;

const rows = parseCsv(csv).slice(1).map((row) => {
  const [query, page, clicks, impressions, ctr, position] = row;
  return normalizeRecord({ Query: query, Page: page, Clicks: clicks, Impressions: impressions, CTR: ctr, Position: position });
});

const buyerActions = buildBuyerIntentActions(rows);
assert.strictEqual(buyerActions[0].query, 'MenuSifu AI phone ordering');
assert.strictEqual(buyerActions[0].intentScore, 93);
assert.match(buyerActions[0].intentReasons, /named POS/);
assert.match(buyerActions[0].action, /Push to page one/);
const localAction = buyerActions.find((row) => row.query === 'Boston restaurant AI assistant');
assert(localAction, 'Expected local service-area row in buyer intent actions');
assert.strictEqual(localAction.intentScore, 85);
assert.match(localAction.intentReasons, /Chinese\/Asian/);
assert.match(localAction.intentReasons, /local service area/);
assert.match(localAction.action, /city\/state relevance/);

const posActions = buildPosSpecificActions(rows);
assert.deepStrictEqual(
  posActions.map((row) => row.query),
  ['MenuSifu AI phone ordering', 'Square POS phone order AI'],
);
assert.match(posActions[1].action, /Strengthen on-page coverage/);

const rewriteBriefs = buildTitleMetaRewriteBriefs(rows);
assert.deepStrictEqual(
  rewriteBriefs.map((row) => row.query),
  [
    'MenuSifu AI phone ordering',
    'Boston restaurant AI assistant',
    'Chinese restaurant AI phone ordering',
    'Chinese restaurant phone answering service',
  ],
);
assert.strictEqual(rewriteBriefs[0].rewriteReason, 'near page one');
assert.strictEqual(rewriteBriefs[0].suggestedTitle, 'MenuSifu AI Phone Ordering for Restaurants - Serviio');
assert.match(rewriteBriefs[0].suggestedMeta, /39 Miles, Square, Toast, Clover, MenuSifu, Chowbus, and Mealkeyway/);
const chineseAiBrief = rewriteBriefs.find((row) => row.query === 'Chinese restaurant AI phone ordering');
assert.ok(chineseAiBrief);
assert.strictEqual(chineseAiBrief.suggestedTitle, 'Chinese Restaurant AI Phone Ordering - Serviio');
const lowCtrBrief = rewriteBriefs.find((row) => row.query === 'Chinese restaurant phone answering service');
assert.ok(lowCtrBrief);
assert.strictEqual(lowCtrBrief.rewriteReason, 'page-one low CTR');
assert.strictEqual(lowCtrBrief.suggestedTitle, 'Chinese Restaurant Phone Answering Service - Serviio');
const localBrief = rewriteBriefs.find((row) => row.query === 'Boston restaurant AI assistant');
assert.ok(localBrief);
assert.strictEqual(localBrief.suggestedTitle, 'Boston Chinese Restaurant AI Phone Ordering - Serviio');

const report = renderReport(rows);
assert.match(report, /Buyer-Intent Action Queue/);
assert.match(report, /POS-Specific Query Opportunities/);
assert.match(report, /Title\/Meta Rewrite Briefs/);
assert.match(report, /MenuSifu AI phone ordering/);

const sampleRows = buildRecords(parseCsv(fs.readFileSync('docs/sample-search-console-export.csv', 'utf8'))).map(normalizeRecord);
const sampleReport = fs.readFileSync('docs/sample-search-console-analysis.md', 'utf8');
assert.ok(sampleRows.length >= 6);
assert.ok(buildBuyerIntentActions(sampleRows).some((row) => row.query === 'MenuSifu AI phone ordering'));
assert.ok(buildPosSpecificActions(sampleRows).some((row) => row.query === 'Square POS phone order AI'));
assert.ok(buildTitleMetaRewriteBriefs(sampleRows).some((row) => row.query === 'Chinese restaurant phone answering service'));
assert.match(sampleReport, /Serviio Search Console Export Analysis/);
assert.match(sampleReport, /Buyer-Intent Action Queue/);
assert.match(sampleReport, /Title\/Meta Rewrite Briefs/);
assert.match(sampleReport, /MenuSifu AI phone ordering/);

const scorecard = fs.readFileSync('docs/google-search-console-scorecard.md', 'utf8');
const priorityQueries = extractPriorityQueries(scorecard);
assert.ok(priorityQueries.length >= 100);
assert.ok(priorityQueries.includes('MenuSifu POS AI phone agent'));
assert.strictEqual(rankingWatchlistClusterFor('MenuSifu POS AI phone agent'), 'Named POS');
assert.strictEqual(rankingWatchlistClusterFor('boston chinese restaurant ai phone ordering'), 'Local service area');
assert.strictEqual(rankingWatchlistTargetPageFor('MenuSifu POS AI phone agent'), '/pos/menusifu-ai-phone-ordering/');
assert.strictEqual(rankingWatchlistTargetPageFor('39 Miles POS AI phone agent'), '/pos/39-miles-ai-phone-ordering/');
assert.strictEqual(rankingWatchlistTargetPageFor('restaurant missed call revenue calculator'), '/restaurant-missed-call-revenue-calculator/');
assert.strictEqual(rankingWatchlistTargetPageFor('restaurant phone order revenue loss calculator'), '/restaurant-missed-call-revenue-calculator/');
assert.strictEqual(rankingWatchlistTargetPageFor('boston chinese restaurant ai phone ordering'), '/service-areas/boston-chinese-restaurant-ai-phone-ordering/');
assert.strictEqual(rankingWatchlistTargetPageFor('restaurant ai assistant boston'), '/service-areas/boston-chinese-restaurant-ai-phone-ordering/');
assert.strictEqual(rankingWatchlistTargetPageFor('massachusetts chinese restaurant ai phone ordering'), '/service-areas/massachusetts-chinese-restaurant-ai-phone-ordering/');
assert.strictEqual(rankingWatchlistTargetPageFor('restaurant pos phone order integration philadelphia'), '/service-areas/philadelphia-chinese-restaurant-ai-phone-ordering/');
assert.strictEqual(rankingWatchlistTargetPageFor('restaurant without POS'), '/best-pos-for-chinese-restaurant-phone-orders/');
const watchlistRows = buildWatchlistRows(priorityQueries);
assert.strictEqual(watchlistRows.length, priorityQueries.length);
assert.ok(watchlistRows.some((row) => row.query === 'MenuSifu POS AI phone agent' && row.authority_target === 'MenuSifu restaurant consultants'));
assert.ok(watchlistRows.every((row) => row.target_position === '1-10'));
assert.ok(watchlistRows.every((row) => fs.existsSync(`.${new URL(row.target_url).pathname}index.html`) || fs.existsSync(`.${new URL(row.target_url).pathname}`)), 'Every first-page watchlist target URL should resolve to a generated page or asset');
const watchlistCsv = rankingWatchlistToCsv(watchlistRows);
assert.match(watchlistCsv, /priority,cluster,query,target_page,target_url,target_position,current_position/);
assert.match(watchlistCsv, /needs_search_console_data/);
assert.deepStrictEqual(parseRankingWatchlistArgs(['--out', 'docs/watchlist.csv']), {
  out: 'docs/watchlist.csv',
  help: false,
});

const updatedWatchlistRows = updateWatchlistRows(watchlistRows, sampleRows, { checked: '2026-06-07' });
const menusifuWatchRow = updatedWatchlistRows.find((row) => row.query === 'menusifu ai phone ordering');
assert.ok(menusifuWatchRow);
assert.strictEqual(menusifuWatchRow.current_position, '12.4');
assert.strictEqual(menusifuWatchRow.current_clicks, '1');
assert.strictEqual(menusifuWatchRow.current_impressions, '42');
assert.strictEqual(menusifuWatchRow.current_ctr, '2.4%');
assert.strictEqual(menusifuWatchRow.status, 'near_page_one');
assert.strictEqual(menusifuWatchRow.last_checked, '2026-06-07');
const chineseAiWatchRow = updatedWatchlistRows.find((row) => row.query === 'chinese restaurant ai phone ordering');
assert.strictEqual(chineseAiWatchRow.status, 'page_one');
const noDataWatchRow = updatedWatchlistRows.find((row) => row.query === 'MenuSifu POS AI phone agent');
assert.strictEqual(noDataWatchRow.status, 'no_search_console_data');
assert.match(renderRankingWatchlistUpdateSummary(updatedWatchlistRows), /Page-one rows:/);
assert.deepStrictEqual(parseRankingWatchlistUpdateArgs(['gsc.csv', '--watchlist', 'watch.csv', '--out', 'updated.csv', '--checked', '2026-06-07']), {
  input: 'gsc.csv',
  watchlist: 'watch.csv',
  out: 'updated.csv',
  checked: '2026-06-07',
  help: false,
});
assert.throws(() => parseRankingWatchlistUpdateArgs(['gsc.csv', '--checked', '06-07-2026']), /--checked must use YYYY-MM-DD/);
const sampleUpdatedWatchlist = fs.readFileSync('docs/sample-first-page-ranking-watchlist-updated.csv', 'utf8');
assert.match(sampleUpdatedWatchlist, /near_page_one/);
assert.match(sampleUpdatedWatchlist, /page_one/);
const sampleUpdatedWatchlistRows = buildRecords(parseCsv(sampleUpdatedWatchlist));
const rankingActions = buildRankingActions(sampleUpdatedWatchlistRows, { limit: 8, today: '2026-06-07' });
assert.strictEqual(rankingActions[0].action_type, 'push_to_page_one');
assert.match(rankingActions[0].query, /menusifu ai phone ordering|restaurant phone order automation/i);
assert.match(rankingActions[0].suggested_source_hubs, /\/restaurant-pos-phone-order-integration\//);
assert.match(rankingActions[0].authority_tracker_command, /npm run marketing:mark -- --target/);
assert.match(rankingActions[0].authority_tracker_command, /--date 2026-06-07/);
assert.ok(rankingActions.some((row) => row.action_type === 'ctr_rewrite' && row.query === 'chinese restaurant phone answering service'));
assert.ok(rankingActions.some((row) => row.action_type === 'indexing_or_data_check' && row.priority === 'P0'));
assert.strictEqual(rankingActionType({ status: 'needs_authority_or_relevance' }), 'authority_and_relevance');
assert.strictEqual(rankingActionType({ status: 'needs_search_console_data' }), 'indexing_or_data_check');
assert.match(renderRankingActionQueue(sampleUpdatedWatchlistRows, { limit: 5, today: '2026-06-07' }), /Serviio Ranking Action Queue/);
assert.match(renderRankingActionQueue(sampleUpdatedWatchlistRows, { limit: 5, today: '2026-06-07' }), /push_to_page_one/);
assert.match(renderRankingActionQueue(sampleUpdatedWatchlistRows, { limit: 5, today: '2026-06-07' }), /Suggested source hubs/);
assert.match(renderRankingActionQueue(sampleUpdatedWatchlistRows, { limit: 5, today: '2026-06-07' }), /\/guides\/connect-phone-orders-to-pos\//);
assert.match(renderRankingActionQueue(sampleUpdatedWatchlistRows, { limit: 5, today: '2026-06-07' }), /Authority tracker command/);
assert.match(renderRankingActionQueue(sampleUpdatedWatchlistRows, { limit: 5, today: '2026-06-07' }), /--date 2026-06-07/);
const groupedRankingReport = renderRankingActionQueue(sampleUpdatedWatchlistRows, { limit: 8, today: '2026-06-07' });
assert.match(groupedRankingReport, /## Authority Submission Batches/);
assert.match(groupedRankingReport, /MenuSifu restaurant consultants/);
assert.match(groupedRankingReport, /\| 83\/100 \| MenuSifu restaurant consultants \| push_to_page_one \| menusifu ai phone ordering \|/i);
assert.match(groupedRankingReport, /one submission should support these grouped ranking actions/i);
assert.match(groupedRankingReport, /## First-Hour Authority Coverage/);
assert.match(groupedRankingReport, /These first-hour authority targets support the highest-intent ranking actions before broader directory work\./);
assert.match(groupedRankingReport, /\| MenuSifu restaurant consultants \| 83\/100 \| menusifu ai phone ordering \| \/pos\/menusifu-ai-phone-ordering\/ \|/i);
assert.match(groupedRankingReport, /Run `npm run marketing:submission-log:first-hour` and `npm run marketing:submission-preflight:first-hour` before syncing tracker updates\./);
assert.deepStrictEqual(parseRankingActionArgs(['--watchlist', 'watch.csv', '--out', 'actions.md', '--limit', '5', '--today', '2026-06-07']), {
  watchlist: 'watch.csv',
  out: 'actions.md',
  limit: 5,
  today: '2026-06-07',
  help: false,
});
assert.throws(() => parseRankingActionArgs(['--limit', '0']), /--limit must be a positive integer/);
assert.throws(() => parseRankingActionArgs(['--today', '06-07-2026']), /--today must use YYYY-MM-DD/);
const sampleRankingActionQueue = fs.readFileSync('docs/sample-ranking-action-queue.md', 'utf8');
assert.match(sampleRankingActionQueue, /Serviio Ranking Action Queue/);
assert.match(sampleRankingActionQueue, /push_to_page_one/);

console.log('Search Console analyzer tests passed');
