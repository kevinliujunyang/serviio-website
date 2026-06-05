const assert = require('assert');
const fs = require('fs');
const { buildOutreachRows, toCsv } = require('./export-free-search-outreach-csv');
const {
  opportunityScore,
  packetFor,
  parseCsv,
  readySubmissionRows,
} = require('./print-free-search-submission-packets');

const rows = parseCsv(`priority,channel,target,url,status,owner,date_submitted,date_live,landing_url,utm_url,anchor_or_listing_phrase,notes
P1,POS-specific outreach,MenuSifu restaurant consultants,https://forms.menusifu.com/pages/demo-request,not_started,,,,https://serviio.ai/pos/menusifu-ai-phone-ordering/,https://serviio.ai/pos/menusifu-ai-phone-ordering/?utm_source=menusifu_pos_consultant&utm_medium=partner_referral&utm_campaign=free_search_marketing,MenuSifu AI phone ordering,Use POS-specific partner path.
P1,AI directory,AI Directory,https://www.ai-directory.io/submit,not_started,,,,https://serviio.ai/restaurant-ai-phone-order-taker/,https://serviio.ai/restaurant-ai-phone-order-taker/?utm_source=ai_directory_io&utm_medium=organic_listing&utm_campaign=free_search_marketing,Restaurant AI phone order taker,Generic directory.
P1,Community post,Chinese restaurant WeChat groups,https://wechat.example.com,not_started,,,,https://serviio.ai/zh/chinese-restaurant-ai-phone-ordering/,https://serviio.ai/zh/chinese-restaurant-ai-phone-ordering/?utm_source=wechat_group&utm_medium=community_post&utm_campaign=free_search_marketing,中餐馆 AI 电话接单,Ask permission first.
`);

const defaultRows = buildOutreachRows(rows);
assert.strictEqual(defaultRows.length, 2);
assert.strictEqual(defaultRows[0].target, 'MenuSifu restaurant consultants');
assert.strictEqual(defaultRows[0].subject, 'AI phone ordering add-on for MenuSifu restaurants');
assert.match(defaultRows[0].message, /MenuSifu/);
assert.match(defaultRows[0].follow_up, /better person/);
assert.strictEqual(defaultRows[1].target, 'Chinese restaurant WeChat groups');
assert.match(defaultRows[1].approved_post, /Check fit/);

const allRows = buildOutreachRows(rows, { includeAll: true });
assert.strictEqual(allRows.length, 3);

const limitedRows = buildOutreachRows(rows, { includeAll: true, limit: 1 });
assert.strictEqual(limitedRows.length, 1);

const csv = toCsv(defaultRows);
assert.match(csv, /opportunity_score,opportunity_reasons,priority/);
assert.match(csv, /AI phone ordering add-on for MenuSifu restaurants/);

const trackerRows = parseCsv(fs.readFileSync('docs/free-search-marketing-tracker.csv', 'utf8'));
const readyRows = readySubmissionRows(trackerRows);
assert.strictEqual(readyRows.length, 49);

const [topRow] = readyRows;
assert.strictEqual(topRow.channel, 'Partner outreach');
assert.match(topRow.target, /POS consultants|Chinese restaurant POS consultants/);
assert.strictEqual(opportunityScore(topRow).score, 100);

const topPacket = packetFor(topRow);
assert.strictEqual(topPacket.subject, 'Referral path for restaurants missing phone orders');
assert.match(topPacket.longDescription, /39 Miles, Square, Toast, Clover, MenuSifu, Chowbus, Mealkeyway/);
assert.match(topPacket.longDescription, /No-POS owners/);
assert.match(topPacket.longDescription, new RegExp(topRow.utm_url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));

const menusifuTrackerRow = readyRows.find((row) => row.target === 'MenuSifu restaurant consultants');
assert.ok(menusifuTrackerRow);
const menusifuPacket = packetFor(menusifuTrackerRow);
assert.strictEqual(menusifuPacket.subject, 'AI phone ordering add-on for MenuSifu restaurants');
assert.match(menusifuPacket.longDescription, /Chinese restaurants and takeout-heavy operators already using MenuSifu/);
assert.match(menusifuPacket.followUp, /better person/);
assert.match(menusifuPacket.longDescription, /utm_source=menusifu_pos_consultant/);

const techDirectoryRow = readyRows.find((row) => row.target === 'Restaurant POS and automation directories');
assert.ok(techDirectoryRow);
assert.strictEqual(opportunityScore(techDirectoryRow).score, 96);
assert.match(packetFor(techDirectoryRow).longDescription, /takeout-heavy operators, including Chinese restaurants/);

console.log('Marketing outreach export tests passed');
