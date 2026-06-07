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

const csv = `Query,Page,Clicks,Impressions,CTR,Position
"MenuSifu AI phone ordering","https://serviio.ai/pos/menusifu-ai-phone-ordering/",1,42,1.2%,12.4
"Chinese restaurant AI phone ordering","https://serviio.ai/chinese-restaurant-ai-phone-ordering/",3,80,3.8%,9.2
"Chinese restaurant phone answering service","https://serviio.ai/chinese-restaurant-phone-answering-service/",0,55,0.6%,5.4
"restaurant tech trends","https://serviio.ai/restaurant-tech-ai-phone-ordering/",0,20,0%,34
"Square POS phone order AI","https://serviio.ai/pos/square-ai-phone-ordering/",0,18,0%,22
"Boston restaurant AI assistant","https://serviio.ai/service-areas/boston-restaurant-ai-phone-ordering/",0,12,0%,14
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
assert.strictEqual(localAction.intentScore, 60);
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
    'Chinese restaurant AI phone ordering',
    'Chinese restaurant phone answering service',
    'Boston restaurant AI assistant',
  ],
);
assert.strictEqual(rewriteBriefs[0].rewriteReason, 'near page one');
assert.strictEqual(rewriteBriefs[0].suggestedTitle, 'MenuSifu AI Phone Ordering for Restaurants - Serviio');
assert.match(rewriteBriefs[0].suggestedMeta, /39 Miles, Square, Toast, Clover, MenuSifu, Chowbus, and Mealkeyway/);
assert.strictEqual(rewriteBriefs[1].suggestedTitle, 'Chinese Restaurant AI Phone Ordering - Serviio');
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
assert.strictEqual(rankingWatchlistTargetPageFor('boston chinese restaurant ai phone ordering'), '/service-areas/boston-restaurant-ai-phone-ordering/');
assert.strictEqual(rankingWatchlistTargetPageFor('restaurant without POS'), '/best-pos-for-chinese-restaurant-phone-orders/');
const watchlistRows = buildWatchlistRows(priorityQueries);
assert.strictEqual(watchlistRows.length, priorityQueries.length);
assert.ok(watchlistRows.some((row) => row.query === 'MenuSifu POS AI phone agent' && row.authority_target === 'MenuSifu restaurant consultants'));
assert.ok(watchlistRows.every((row) => row.target_position === '1-10'));
const watchlistCsv = rankingWatchlistToCsv(watchlistRows);
assert.match(watchlistCsv, /priority,cluster,query,target_page,target_url,target_position,current_position/);
assert.match(watchlistCsv, /needs_search_console_data/);
assert.deepStrictEqual(parseRankingWatchlistArgs(['--out', 'docs/watchlist.csv']), {
  out: 'docs/watchlist.csv',
  help: false,
});

console.log('Search Console analyzer tests passed');
