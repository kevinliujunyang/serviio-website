const assert = require('assert');
const fs = require('fs');
const { buildOutreachRows, toCsv } = require('./export-free-search-outreach-csv');
const {
  opportunityScore,
  packetFor,
  parseCsv,
  readySubmissionRows,
} = require('./print-free-search-submission-packets');
const {
  nextActionRows,
  opportunityScore: nextActionOpportunityScore,
  packetHint,
  researchQueries,
} = require('./print-free-search-next-actions');
const {
  isSprintRow,
  parseArgs: parseSprintArgs,
  sprintRows,
} = require('./print-partner-outreach-sprint');
const {
  authorityScore,
  nextMilestones,
  renderReport: renderAuthorityReport,
} = require('./audit-seo-authority');
const {
  mergeNote,
  parseArgs: parseMarkArgs,
  updateTracker,
} = require('./update-free-search-tracker');
const {
  followUpRows,
  parseArgs: parseFollowUpArgs,
  renderFollowUpReport,
} = require('./print-free-search-follow-ups');
const {
  buildGtmQueueRows,
  parseArgs: parseGtmQueueArgs,
  toCsv: gtmQueueToCsv,
} = require('./export-free-search-gtm-queue');

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

const nextRows = nextActionRows(trackerRows, { readyLimit: 8, researchLimit: 8 });
assert.strictEqual(nextRows.readyRows.length, 8);
assert.strictEqual(nextRows.researchRows.length, 1);

const nextTopTargets = nextRows.readyRows.slice(0, 6).map((row) => row.target);
assert.ok(nextTopTargets.includes('Chinese restaurant POS consultants'));
assert.ok(nextTopTargets.includes('MenuSifu restaurant consultants'));
assert.ok(nextRows.readyRows.map((row) => row.target).includes('POS consultants'));
assert.ok(nextRows.readyRows.every((row) => nextActionOpportunityScore(row).score >= 88));
assert.ok(nextRows.readyRows.slice(0, 6).every((row) => /POS|partner\/referral/.test(nextActionOpportunityScore(row).reasons)));
assert.match(packetHint(menusifuTrackerRow), /POS-Specific Partner Outreach Copy/);

const aiDirectoryNextRow = trackerRows.find((row) => row.target === 'AI Directory');
assert.ok(aiDirectoryNextRow);
assert.ok(nextActionOpportunityScore(menusifuTrackerRow).score > nextActionOpportunityScore(aiDirectoryNextRow).score);

const pilotResearch = nextRows.researchRows[0];
assert.strictEqual(pilotResearch.target, 'Pilot restaurant testimonial');
assert.deepStrictEqual(researchQueries(pilotResearch), [
  '"Pilot restaurant testimonial" "submit"',
  '"Chinese restaurant AI phone ordering testimonial" "directory"',
]);

const sprint = sprintRows(trackerRows, { limit: 8 });
assert.strictEqual(sprint.length, 8);
assert.strictEqual(sprint[0].channel, 'Partner outreach');
assert.ok(sprint.some((row) => row.target === 'MenuSifu restaurant consultants'));
assert.ok(sprint.every(isSprintRow));
assert.ok(sprint.every((row) => nextActionOpportunityScore(row).score >= 88));
assert.deepStrictEqual(parseSprintArgs(['--limit', '3']), { limit: 3, help: false });
assert.deepStrictEqual(parseSprintArgs(['--help']), { limit: 8, help: true });
assert.throws(() => parseSprintArgs(['--limit', '0']), /positive integer/);

const authorityRows = parseCsv(`priority,channel,target,url,status,owner,date_submitted,date_live,landing_url,utm_url,anchor_or_listing_phrase,notes
P0,Business profile,Google Business Profile,https://www.google.com/business/,submitted,Serviio,2026-06-06,,https://serviio.ai/,https://serviio.ai/?utm_source=google_business_profile&utm_medium=organic_listing&utm_campaign=free_search_marketing,AI phone ordering for restaurants,Submitted profile.
P1,Partner outreach,POS consultants,https://example.com,follow-up needed,Serviio,2026-06-06,,https://serviio.ai/guides/chinese-restaurant-pos-comparison/,https://serviio.ai/guides/chinese-restaurant-pos-comparison/?utm_source=pos_consultant&utm_medium=partner_referral&utm_campaign=free_search_marketing,Chinese restaurant POS comparison,Need follow-up.
P1,Restaurant technology directory,Restaurant POS directory,https://directory.example.com,live,Serviio,2026-06-06,2026-06-07,https://serviio.ai/chinese-restaurant-pos-ai-phone-agent/,https://serviio.ai/chinese-restaurant-pos-ai-phone-agent/?utm_source=directory&utm_medium=organic_listing&utm_campaign=free_search_marketing,Chinese restaurant POS AI phone agent,Live listing.
P2,Customer proof,Pilot restaurant testimonial,https://proof.example.com,not_started,,,,https://serviio.ai/chinese-restaurant-ai-phone-ordering/,https://serviio.ai/chinese-restaurant-ai-phone-ordering/?utm_source=customer_testimonial&utm_medium=customer_proof&utm_campaign=free_search_marketing,Chinese restaurant AI phone ordering testimonial,Need target.
`);
const authority = authorityScore(authorityRows);
assert.strictEqual(authority.score, 26);
assert.strictEqual(authority.submittedRows.length, 2);
assert.strictEqual(authority.liveRows.length, 1);
assert.strictEqual(authority.highFitStartedRows.length, 2);
assert.match(nextMilestones(authority)[0], /5 live authority links/);
assert.match(renderAuthorityReport(authorityRows), /Serviio SEO Authority Audit/);
assert.match(renderAuthorityReport(authorityRows), /Authority score: 26\/100/);

const updateResult = updateTracker(`priority,channel,target,url,status,owner,date_submitted,date_live,landing_url,utm_url,anchor_or_listing_phrase,notes
P1,POS-specific outreach,MenuSifu restaurant consultants,https://forms.menusifu.com/pages/demo-request,not_started,,,,https://serviio.ai/pos/menusifu-ai-phone-ordering/,https://serviio.ai/pos/menusifu-ai-phone-ordering/?utm_source=menusifu_pos_consultant&utm_medium=partner_referral&utm_campaign=free_search_marketing,MenuSifu AI phone ordering,Use POS-specific partner path.
`, {
  target: 'menusifu',
  status: 'submitted',
  owner: 'Serviio',
  date: '2026-06-06',
  note: 'Submitted partner request; follow up next week.',
  appendNote: true,
});
assert.strictEqual(updateResult.after.target, 'MenuSifu restaurant consultants');
assert.strictEqual(updateResult.after.status, 'submitted');
assert.strictEqual(updateResult.after.owner, 'Serviio');
assert.strictEqual(updateResult.after.date_submitted, '2026-06-06');
assert.match(updateResult.after.notes, /2026-06-06: Submitted partner request/);
assert.match(updateResult.csv, /Use POS-specific partner path\. 2026-06-06: Submitted partner request; follow up next week\./);
assert.strictEqual(mergeNote('Existing note.', 'New confirmation.', { date: '2026-06-06' }), 'Existing note. 2026-06-06: New confirmation.');
assert.deepStrictEqual(parseMarkArgs(['--target', 'MenuSifu restaurant consultants', '--status', 'submitted', '--date', '2026-06-06', '--dry-run']), {
  csvPath: 'docs/free-search-marketing-tracker.csv',
  owner: 'Serviio',
  date: '2026-06-06',
  dryRun: true,
  appendNote: true,
  target: 'MenuSifu restaurant consultants',
  status: 'submitted',
});
assert.throws(() => parseMarkArgs(['--target', 'MenuSifu restaurant consultants', '--status', 'done']), /--status must be one of/);
assert.throws(() => updateTracker(updateResult.csv, { target: 'missing', status: 'submitted', owner: 'Serviio', date: '2026-06-06' }), /No tracker row matched/);

const followUpTrackerRows = parseCsv(`priority,channel,target,url,status,owner,date_submitted,date_live,landing_url,utm_url,anchor_or_listing_phrase,notes
P1,POS-specific outreach,MenuSifu restaurant consultants,https://forms.menusifu.com/pages/demo-request,submitted,Serviio,2026-06-01,,https://serviio.ai/pos/menusifu-ai-phone-ordering/,https://serviio.ai/pos/menusifu-ai-phone-ordering/?utm_source=menusifu_pos_consultant&utm_medium=partner_referral&utm_campaign=free_search_marketing,MenuSifu AI phone ordering,Submitted partner request.
P1,Partner outreach,POS consultants,https://example.com,follow-up needed,Serviio,2026-06-05,,https://serviio.ai/restaurant-pos-partner-referral/,https://serviio.ai/restaurant-pos-partner-referral/?utm_source=pos_consultant&utm_medium=partner_referral&utm_campaign=free_search_marketing,Restaurant POS partner referral,Needs reply.
P1,Restaurant technology directory,Restaurant POS directory,https://directory.example.com,live,Serviio,2026-06-01,2026-06-03,https://serviio.ai/chinese-restaurant-pos-ai-phone-agent/,https://serviio.ai/chinese-restaurant-pos-ai-phone-agent/?utm_source=directory&utm_medium=organic_listing&utm_campaign=free_search_marketing,Chinese restaurant POS AI phone agent,Live.
P1,AI directory,AI Directory,https://ai.example.com,submitted,Serviio,2026-06-07,,https://serviio.ai/restaurant-ai-phone-order-taker/,https://serviio.ai/restaurant-ai-phone-order-taker/?utm_source=ai_directory&utm_medium=organic_listing&utm_campaign=free_search_marketing,Restaurant AI phone order taker,Submitted recently.
P0,Webmaster tool,IndexNow priority URL batch,https://api.indexnow.org/indexnow,submitted,Serviio,2026-06-01,,https://serviio.ai/chinese-restaurant-ai-phone-ordering/,https://serviio.ai/chinese-restaurant-ai-phone-ordering/?utm_source=indexnow&utm_medium=indexing&utm_campaign=free_search_marketing,Priority Chinese restaurant and POS URL submission,Submitted recrawl.
`);
const dueFollowUps = followUpRows(followUpTrackerRows, { today: '2026-06-10', days: 7 });
assert.deepStrictEqual(dueFollowUps.map((row) => row.target), [
  'POS consultants',
  'MenuSifu restaurant consultants',
]);
assert.strictEqual(dueFollowUps[0].days_waiting, 5);
assert.strictEqual(dueFollowUps[0].due_date, '2026-06-05');
assert.strictEqual(dueFollowUps[1].days_waiting, 9);
assert.strictEqual(dueFollowUps[1].due_date, '2026-06-08');
assert.match(renderFollowUpReport(dueFollowUps), /# Serviio Free Search Follow-Up Queue/);
assert.match(renderFollowUpReport(dueFollowUps), /npm run marketing:mark -- --target "POS consultants" --status "follow-up needed"/);
assert.match(renderFollowUpReport(dueFollowUps), /https:\/\/serviio.ai\/restaurant-pos-partner-referral\//);
assert.deepStrictEqual(parseFollowUpArgs(['--today', '2026-06-10', '--days', '5', '--limit', '3']), {
  csvPath: 'docs/free-search-marketing-tracker.csv',
  today: '2026-06-10',
  days: 5,
  limit: 3,
});
assert.throws(() => parseFollowUpArgs(['--days', '0']), /--days must be a positive integer/);

const gtmQueueRows = buildGtmQueueRows(parseCsv(`priority,channel,target,url,status,owner,date_submitted,date_live,landing_url,utm_url,anchor_or_listing_phrase,notes
P1,Partner outreach,POS consultants,https://example.com,follow-up needed,Serviio,2026-06-05,,https://serviio.ai/restaurant-pos-partner-referral/,https://serviio.ai/restaurant-pos-partner-referral/?utm_source=pos_consultant&utm_medium=partner_referral&utm_campaign=free_search_marketing,Restaurant POS partner referral,Needs reply.
P1,POS-specific outreach,MenuSifu restaurant consultants,https://forms.menusifu.com/pages/demo-request,not_started,,,,https://serviio.ai/pos/menusifu-ai-phone-ordering/,https://serviio.ai/pos/menusifu-ai-phone-ordering/?utm_source=menusifu_pos_consultant&utm_medium=partner_referral&utm_campaign=free_search_marketing,MenuSifu AI phone ordering,Use POS-specific partner path.
P2,Customer proof,Pilot restaurant testimonial,,not_started,,,,https://serviio.ai/chinese-restaurant-ai-phone-ordering/,https://serviio.ai/chinese-restaurant-ai-phone-ordering/?utm_source=customer_testimonial&utm_medium=customer_proof&utm_campaign=free_search_marketing,Chinese restaurant AI phone ordering testimonial,Need target.
P1,Restaurant technology directory,Restaurant POS directory,https://directory.example.com,live,Serviio,2026-06-01,2026-06-03,https://serviio.ai/chinese-restaurant-pos-ai-phone-agent/,https://serviio.ai/chinese-restaurant-pos-ai-phone-agent/?utm_source=directory&utm_medium=organic_listing&utm_campaign=free_search_marketing,Chinese restaurant POS AI phone agent,Live.
`), { today: '2026-06-10', followUpLimit: 5, readyLimit: 5, researchLimit: 5 });
assert.deepStrictEqual(gtmQueueRows.map((row) => `${row.action_type}:${row.target}`), [
  'follow_up:POS consultants',
  'submit_or_contact:MenuSifu restaurant consultants',
  'research_target:Pilot restaurant testimonial',
]);
assert.match(gtmQueueRows[0].next_step, /Follow up/);
assert.match(gtmQueueRows[1].message_or_query, /Chinese restaurants and takeout-heavy operators already using MenuSifu/);
assert.match(gtmQueueRows[2].message_or_query, /"Pilot restaurant testimonial" "submit"/);
const gtmCsv = gtmQueueToCsv(gtmQueueRows);
assert.match(gtmCsv, /action_type,opportunity_score,priority,channel,target/);
assert.match(gtmCsv, /follow_up,90,P1,Partner outreach,POS consultants/);
assert.doesNotMatch(gtmCsv, /Restaurant POS directory/);
assert.deepStrictEqual(parseGtmQueueArgs(['--today', '2026-06-10', '--out', 'gtm.csv', '--ready-limit', '3', '--research-limit', '2', '--follow-up-limit', '1']), {
  out: 'gtm.csv',
  today: '2026-06-10',
  readyLimit: 3,
  researchLimit: 2,
  followUpLimit: 1,
  help: false,
});
assert.throws(() => parseGtmQueueArgs(['--ready-limit', '0']), /--ready-limit must be a positive integer/);

console.log('Marketing outreach export tests passed');
