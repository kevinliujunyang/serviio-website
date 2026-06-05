const assert = require('assert');
const {
  buildBuyerIntentActions,
  buildPosSpecificActions,
  normalizeRecord,
  parseCsv,
  renderReport,
} = require('./analyze-search-console');

const csv = `Query,Page,Clicks,Impressions,CTR,Position
"MenuSifu AI phone ordering","https://serviio.ai/pos/menusifu-ai-phone-ordering/",1,42,1.2%,12.4
"Chinese restaurant AI phone ordering","https://serviio.ai/chinese-restaurant-ai-phone-ordering/",3,80,3.8%,9.2
"restaurant tech trends","https://serviio.ai/restaurant-tech-ai-phone-ordering/",0,20,0%,34
"Square POS phone order AI","https://serviio.ai/pos/square-ai-phone-ordering/",0,18,0%,22
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

const posActions = buildPosSpecificActions(rows);
assert.deepStrictEqual(
  posActions.map((row) => row.query),
  ['MenuSifu AI phone ordering', 'Square POS phone order AI'],
);
assert.match(posActions[1].action, /Strengthen on-page coverage/);

const report = renderReport(rows);
assert.match(report, /Buyer-Intent Action Queue/);
assert.match(report, /POS-Specific Query Opportunities/);
assert.match(report, /MenuSifu AI phone ordering/);

console.log('Search Console analyzer tests passed');
