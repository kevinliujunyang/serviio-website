const assert = require('assert');
const {
  buildBuyerIntentActions,
  buildPosSpecificActions,
  buildTitleMetaRewriteBriefs,
  normalizeRecord,
  parseCsv,
  renderReport,
} = require('./analyze-search-console');

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

console.log('Search Console analyzer tests passed');
