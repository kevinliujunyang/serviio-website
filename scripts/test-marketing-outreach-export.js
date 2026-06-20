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
  renderNextActionReport,
  researchQueries,
} = require('./print-free-search-next-actions');
const {
  isSprintRow,
  parseArgs: parseSprintArgs,
  sprintRows,
} = require('./print-partner-outreach-sprint');
const {
  buildPartnerSprintMarkdown,
  parseArgs: parseSprintExportArgs,
} = require('./export-partner-outreach-sprint');
const {
  buildBusinessProfilePack,
  parseArgs: parseBusinessProfileArgs,
} = require('./export-business-profile-pack');
const {
  buildDirectorySubmissionPack,
  directoryRows,
  parseArgs: parseDirectoryPackArgs,
} = require('./export-directory-submission-pack');
const {
  buildAuthoritySubmissionLogRows,
  parseArgs: parseAuthoritySubmissionLogArgs,
  toCsv: authoritySubmissionLogToCsv,
} = require('./export-authority-submission-log');
const {
  authorityScore,
  evidenceIssues,
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
const {
  buildWeeklyAuthoritySprint,
  parseArgs: parseWeeklyAuthoritySprintArgs,
} = require('./export-weekly-authority-sprint');
const {
  applyActions: applySubmissionLogActions,
  buildSyncActions: buildSubmissionLogSyncActions,
  parseArgs: parseSubmissionSyncArgs,
  renderReport: renderSubmissionSyncReport,
} = require('./sync-authority-submission-log');
const {
  parseArgs: parseTrackerGeneratorArgs,
} = require('./generate-free-search-tracker');

const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
assert.strictEqual(
  packageJson.scripts['marketing:submission-log:first-hour'],
  'node scripts/export-authority-submission-log.js --first-hour',
);

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
assert.strictEqual(readyRows.length, 50);
const indexNowRow = trackerRows.find((row) => row.target === 'IndexNow priority URL batch');
assert.ok(indexNowRow);
assert.match(indexNowRow.notes, /restaurant-missed-call-revenue-calculator/);
assert.match(indexNowRow.notes, /2026-06-20 priority 43-URL IndexNow batch/);
const productHuntRow = trackerRows.find((row) => row.target === 'Product Hunt Serviio listing');
assert.ok(productHuntRow);
assert.strictEqual(productHuntRow.channel, 'Startup directory');
assert.strictEqual(productHuntRow.status, 'live');
assert.strictEqual(productHuntRow.url, 'https://www.producthunt.com/products/serviio');
assert.strictEqual(productHuntRow.date_live, '2026-06-20');
assert.match(productHuntRow.notes, /Product Hunt product page verified live/);
assert.ok(!readyRows.some((row) => row.target === 'Product Hunt Serviio listing'));
const customerProofReadyRow = readyRows.find((row) => row.target === 'Pilot restaurant testimonial');
assert.ok(customerProofReadyRow);
assert.strictEqual(customerProofReadyRow.channel, 'Customer proof');
assert.strictEqual(customerProofReadyRow.url, 'https://serviio.ai/customer-proof-request/');

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

const directoryPackRows = directoryRows(trackerRows, { limit: 15 });
assert.strictEqual(directoryPackRows.length, 15);
assert.ok(directoryPackRows.every((row) => [
  'AI directory',
  'Startup directory',
  'Restaurant technology directory',
  'Educational resource listing',
].includes(row.channel)));
assert.strictEqual(directoryPackRows[0].target, 'Restaurant POS and automation directories');

const directoryPack = buildDirectorySubmissionPack(trackerRows, { today: '2026-06-06', limit: 15 });
assert.match(directoryPack, /^# Serviio Directory Submission Pack/m);
assert.match(directoryPack, /Submit\/contact at least 15 authority targets/);
assert.match(directoryPack, /AI tool directories/);
assert.match(directoryPack, /Restaurant POS and automation directories/);
assert.match(directoryPack, /39 Miles, Square, Toast, Clover, MenuSifu, Chowbus, and Mealkeyway/);
assert.match(directoryPack, /npm run marketing:mark -- --target "Restaurant POS and automation directories" --status submitted --date 2026-06-06/);
assert.deepStrictEqual(parseDirectoryPackArgs(['--out', 'docs/directories.md', '--limit', '12', '--today', '2026-06-06']), {
  out: 'docs/directories.md',
  limit: 12,
  today: '2026-06-06',
  help: false,
});
assert.throws(() => parseDirectoryPackArgs(['--limit', '0']), /--limit must be a positive integer/);

const authoritySubmissionRows = buildAuthoritySubmissionLogRows(trackerRows, { limit: 15, today: '2026-06-06' });
assert.strictEqual(authoritySubmissionRows.length, 15);
assert.ok(!authoritySubmissionRows.some((row) => row.target === 'Product Hunt Serviio listing'));
assert.strictEqual(authoritySubmissionRows[0].target, 'Chinese restaurant POS consultants');
assert.strictEqual(authoritySubmissionRows[0].opportunity_score, 100);
assert.strictEqual(authoritySubmissionRows[0].action_status, '');
assert.strictEqual(authoritySubmissionRows[0].follow_up_date, '2026-06-13');
assert.strictEqual(authoritySubmissionRows[0].evidence_url, '');
assert.strictEqual(authoritySubmissionRows[0].submission_type, 'partner_contact');
assert.strictEqual(authoritySubmissionRows[0].lead_priority, 'P1 partner/referral lead source');
assert.strictEqual(authoritySubmissionRows[0].lead_route, 'Partner can refer POS-ready restaurants; keep no-POS owners as POS partner referral prospects.');
assert.strictEqual(authoritySubmissionRows[0].primary_kpi, 'partner reply, referral path, or sent-message evidence');
assert.strictEqual(authoritySubmissionRows[0].expected_lead_acquisition_channel, 'partner_referral');
assert.match(authoritySubmissionRows[0].next_step, /Contact the partner or consultant/);
assert.match(authoritySubmissionRows[0].evidence_needed, /sent-message URL/);
assert.match(authoritySubmissionRows[0].tracker_command, /npm run marketing:mark -- --target "Chinese restaurant POS consultants" --status submitted --date 2026-06-06/);
assert.match(authoritySubmissionRows[0].tracker_command, /Follow up: 2026-06-13/);
assert.match(authoritySubmissionRows[0].message_or_listing_copy, /39 Miles, Square, Toast, Clover, MenuSifu, Chowbus, Mealkeyway/);
assert.ok(authoritySubmissionRows.some((row) => row.target === 'Google Business Profile'));
assert.ok(authoritySubmissionRows.some((row) => row.target === 'Bing Places for Business'));
assert.ok(authoritySubmissionRows.some((row) => row.target === 'Apple Business Connect'));
assert.ok(authoritySubmissionRows.some((row) => row.target === 'Pilot restaurant testimonial'));
const firstHourAuthorityRows = buildAuthoritySubmissionLogRows(trackerRows, { firstHour: true, today: '2026-06-06' });
assert.deepStrictEqual(firstHourAuthorityRows.map((row) => row.target), [
  'Google Business Profile',
  'MenuSifu restaurant consultants',
  '39 Miles restaurant consultants',
  'Pilot restaurant testimonial',
]);
assert.strictEqual(firstHourAuthorityRows[0].expected_lead_acquisition_channel, 'business_profile');
assert.strictEqual(firstHourAuthorityRows[1].expected_lead_acquisition_channel, 'partner_referral');
assert.strictEqual(firstHourAuthorityRows[3].expected_lead_acquisition_channel, 'customer_proof');
assert.match(firstHourAuthorityRows[0].tracker_command, /--target "Google Business Profile" --status submitted --date 2026-06-06/);
assert.match(firstHourAuthorityRows[3].message_or_listing_copy, /You can choose whether the proof can be published, anonymized, or kept internal/);
const allAuthoritySubmissionRows = buildAuthoritySubmissionLogRows(trackerRows, { limit: 60, today: '2026-06-06' });
const googleProfileSubmissionRow = allAuthoritySubmissionRows.find((row) => row.target === 'Google Business Profile');
assert.ok(googleProfileSubmissionRow);
assert.strictEqual(googleProfileSubmissionRow.lead_priority, 'P0 inbound restaurant-owner lead source');
assert.match(googleProfileSubmissionRow.lead_route, /Ask every inbound owner which POS system they use/);
assert.strictEqual(googleProfileSubmissionRow.primary_kpi, 'verified profile plus POS-qualified inbound leads');
assert.strictEqual(googleProfileSubmissionRow.expected_lead_acquisition_channel, 'business_profile');
const productHuntSubmissionRow = allAuthoritySubmissionRows.find((row) => row.target === 'Product Hunt Serviio listing');
assert.strictEqual(productHuntSubmissionRow, undefined);
const authoritySubmissionCsv = authoritySubmissionLogToCsv(authoritySubmissionRows);
assert.match(authoritySubmissionCsv, /action_status,priority,channel,target,submission_type,lead_priority,lead_route,primary_kpi,expected_lead_acquisition_channel,next_step,evidence_needed,opportunity_score/);
assert.match(authoritySubmissionCsv, /evidence_url,account_or_login,confirmation_note,submitted_date,live_date,follow_up_date,tracker_command/);
assert.match(authoritySubmissionCsv, /Chinese restaurant POS consultants/);
assert.deepStrictEqual(parseAuthoritySubmissionLogArgs(['--out', 'docs/log.csv', '--limit', '9', '--today', '2026-06-06']), {
  out: 'docs/log.csv',
  limit: 9,
  today: '2026-06-06',
  firstHour: false,
  help: false,
});
assert.deepStrictEqual(parseAuthoritySubmissionLogArgs(['--first-hour', '--today', '2026-06-06']), {
  out: 'docs/authority-first-hour-submission-log.csv',
  limit: 15,
  today: '2026-06-06',
  firstHour: true,
  help: false,
});
assert.throws(() => parseAuthoritySubmissionLogArgs(['--limit', '0']), /--limit must be a positive integer/);

const nextRows = nextActionRows(trackerRows, { readyLimit: 8, researchLimit: 8 });
assert.strictEqual(nextRows.readyRows.length, 8);
assert.strictEqual(nextRows.researchRows.length, 0);
assert.ok(nextRows.liveOptimizationRows.some((row) => row.target === 'Product Hunt Serviio listing'));

const nextTopTargets = nextRows.readyRows.slice(0, 6).map((row) => row.target);
assert.ok(nextTopTargets.includes('Chinese restaurant POS consultants'));
assert.ok(nextTopTargets.includes('MenuSifu restaurant consultants'));
assert.ok(nextRows.readyRows.map((row) => row.target).includes('POS consultants'));
assert.ok(nextRows.readyRows.every((row) => nextActionOpportunityScore(row).score >= 88));
assert.ok(nextRows.readyRows.slice(0, 6).every((row) => /POS|partner\/referral/.test(nextActionOpportunityScore(row).reasons)));
const nextActionReport = renderNextActionReport(trackerRows, { readyLimit: 8, researchLimit: 8 });
assert.match(nextActionReport, /## Live Listing Optimizations/);
assert.match(nextActionReport, /Product Hunt Serviio listing/);
assert.match(nextActionReport, /After action: keep status=live and record updated listing screenshot or owner\/account confirmation/);
assert.match(packetHint(menusifuTrackerRow), /POS-Specific Partner Outreach Copy/);
assert.match(packetHint(productHuntRow), /Claim or verify the existing Product Hunt page/);
assert.match(packetHint(productHuntRow), /updated listing screenshot/);

const aiDirectoryNextRow = trackerRows.find((row) => row.target === 'AI Directory');
assert.ok(aiDirectoryNextRow);
assert.ok(nextActionOpportunityScore(menusifuTrackerRow).score > nextActionOpportunityScore(aiDirectoryNextRow).score);

assert.deepStrictEqual(researchQueries(customerProofReadyRow), [
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

const sprintMarkdown = buildPartnerSprintMarkdown(trackerRows, { limit: 5, today: '2026-06-06' });
assert.match(sprintMarkdown, /^# Serviio Partner Outreach Sprint/m);
assert.match(sprintMarkdown, /Chinese restaurant POS consultants/);
assert.match(sprintMarkdown, /MenuSifu restaurant consultants/);
assert.match(sprintMarkdown, /npm run marketing:mark -- --target "MenuSifu restaurant consultants" --status submitted --date 2026-06-06/);
assert.match(sprintMarkdown, /Authority score is still blocked until submitted rows become live links, profiles, partner replies, or documented customer proof/);
assert.match(sprintMarkdown, /Evidence capture:/);
assert.match(sprintMarkdown, /Evidence URL: submitted form confirmation, sent-message URL, partner reply, referral-page URL, or live backlink/);
assert.match(sprintMarkdown, /Account or login: email, CRM user, directory account, or social profile used to submit/);
assert.match(sprintMarkdown, /Submitted date: 2026-06-06/);
assert.match(sprintMarkdown, /Follow-up date: 2026-06-13/);
assert.match(sprintMarkdown, /Authority submission log fields:/);
assert.match(sprintMarkdown, /evidence_url, account_or_login, confirmation_note, submitted_date, follow_up_date/);
assert.deepStrictEqual(parseSprintExportArgs(['--out', 'docs/sprint.md', '--limit', '5', '--today', '2026-06-06']), {
  out: 'docs/sprint.md',
  limit: 5,
  today: '2026-06-06',
  help: false,
});
assert.throws(() => parseSprintExportArgs(['--limit', '0']), /--limit must be a positive integer/);

const businessProfilePack = buildBusinessProfilePack(trackerRows, { today: '2026-06-06' });
assert.match(businessProfilePack, /^# Serviio Business Profile Submission Pack/m);
assert.match(businessProfilePack, /Google Business Profile/);
assert.match(businessProfilePack, /Bing Places for Business/);
assert.match(businessProfilePack, /Apple Business Connect/);
assert.match(businessProfilePack, /info@serviio\.ai/);
assert.match(businessProfilePack, /\(408\) 409-9079/);
assert.match(businessProfilePack, /Service-area business serving restaurant owners in the United States/);
assert.match(businessProfilePack, /AI phone ordering for restaurants using POS systems/);
assert.match(businessProfilePack, /Priority service areas/);
assert.match(businessProfilePack, /New York City, Los Angeles, San Francisco Bay Area, Seattle, Houston, Chicago, Boston, Philadelphia/);
assert.match(businessProfilePack, /Profile services to add/);
assert.match(businessProfilePack, /POS-integrated AI phone ordering/);
assert.match(businessProfilePack, /Chinese restaurant AI phone answering/);
assert.match(businessProfilePack, /Profile products to add/);
assert.match(businessProfilePack, /39 Miles AI phone ordering/);
assert.match(businessProfilePack, /https:\/\/serviio\.ai\/pos\/39-miles-ai-phone-ordering\/\?utm_source=business_profile_product/);
assert.match(businessProfilePack, /MenuSifu AI phone ordering/);
assert.match(businessProfilePack, /https:\/\/serviio\.ai\/pos\/menusifu-ai-phone-ordering\/\?utm_source=business_profile_product/);
assert.match(businessProfilePack, /Chowbus AI phone ordering/);
assert.match(businessProfilePack, /No monthly fee; 2% per completed order/);
assert.match(businessProfilePack, /Profile Q&A answers/);
assert.match(businessProfilePack, /Does Serviio work with restaurant POS systems\?/);
assert.match(businessProfilePack, /39 Miles, Square, Toast, Clover, MenuSifu, Chowbus, Mealkeyway/);
assert.match(businessProfilePack, /Is Serviio built for Chinese restaurants\?/);
assert.match(businessProfilePack, /English, Mandarin, Cantonese, or bilingual/);
assert.match(businessProfilePack, /What if my restaurant does not have a POS yet\?/);
assert.match(businessProfilePack, /kept as lower-priority POS recommendation leads/);
assert.match(businessProfilePack, /Lead qualification questions/);
assert.match(businessProfilePack, /Which POS system do you use today/);
assert.match(businessProfilePack, /39 Miles, Square, Toast, Clover, MenuSifu, Chowbus, Mealkeyway/);
assert.match(businessProfilePack, /Profile post drafts/);
assert.match(businessProfilePack, /AI phone ordering for POS-ready restaurants/);
assert.match(businessProfilePack, /Bilingual phone answering for Chinese restaurants/);
assert.match(businessProfilePack, /Estimate missed-call revenue before a demo/);
assert.match(businessProfilePack, /utm_source=business_profile_post/);
assert.match(businessProfilePack, /restaurant-missed-call-revenue-calculator/);
assert.match(businessProfilePack, /Lead capture and attribution/);
assert.match(businessProfilePack, /utm_source=google_business_profile/);
assert.match(businessProfilePack, /Evidence to capture/);
assert.match(businessProfilePack, /verification screenshot or dashboard confirmation/);
assert.match(businessProfilePack, /npm run marketing:mark -- --target "Google Business Profile" --status live --date 2026-06-06 --url/);
assert.match(businessProfilePack, /npm run marketing:mark -- --target "Google Business Profile" --status submitted --date 2026-06-06/);
assert.deepStrictEqual(parseBusinessProfileArgs(['--out', 'docs/profiles.md', '--today', '2026-06-06']), {
  out: 'docs/profiles.md',
  today: '2026-06-06',
  help: false,
});

const authorityRows = parseCsv(`priority,channel,target,url,status,owner,date_submitted,date_live,landing_url,utm_url,anchor_or_listing_phrase,notes
P0,Business profile,Google Business Profile,https://www.google.com/business/,submitted,Serviio,2026-06-06,,https://serviio.ai/,https://serviio.ai/?utm_source=google_business_profile&utm_medium=organic_listing&utm_campaign=free_search_marketing,AI phone ordering for restaurants,Submitted profile.
P1,Partner outreach,POS consultants,https://example.com,follow-up needed,Serviio,2026-06-06,,https://serviio.ai/guides/chinese-restaurant-pos-comparison/,https://serviio.ai/guides/chinese-restaurant-pos-comparison/?utm_source=pos_consultant&utm_medium=partner_referral&utm_campaign=free_search_marketing,Chinese restaurant POS comparison,Need follow-up.
P1,Restaurant technology directory,Restaurant POS directory,https://directory.example.com,live,Serviio,2026-06-06,2026-06-07,https://serviio.ai/chinese-restaurant-pos-ai-phone-agent/,https://serviio.ai/chinese-restaurant-pos-ai-phone-agent/?utm_source=directory&utm_medium=organic_listing&utm_campaign=free_search_marketing,Chinese restaurant POS AI phone agent,Live listing.
P1,AI directory,Unverified AI Directory,https://ai.example.com,submitted,,,,https://serviio.ai/restaurant-ai-phone-order-taker/,https://serviio.ai/restaurant-ai-phone-order-taker/?utm_source=ai&utm_medium=organic_listing&utm_campaign=free_search_marketing,Restaurant AI phone order taker,
P1,Startup directory,Unverified Live Listing,https://startup.example.com,live,Serviio,2026-06-06,,https://serviio.ai/,https://serviio.ai/?utm_source=startup&utm_medium=organic_listing&utm_campaign=free_search_marketing,AI phone ordering for restaurants,Live but missing date.
P0,Webmaster tool,IndexNow priority URL batch,https://api.indexnow.org/indexnow,submitted,Serviio,2026-06-06,,https://serviio.ai/chinese-restaurant-ai-phone-ordering/,https://serviio.ai/chinese-restaurant-ai-phone-ordering/?utm_source=indexnow&utm_medium=indexing&utm_campaign=free_search_marketing,Priority Chinese restaurant and POS URL submission,HTTP 200.
P2,Customer proof,Pilot restaurant testimonial,https://proof.example.com,not_started,,,,https://serviio.ai/chinese-restaurant-ai-phone-ordering/,https://serviio.ai/chinese-restaurant-ai-phone-ordering/?utm_source=customer_testimonial&utm_medium=customer_proof&utm_campaign=free_search_marketing,Chinese restaurant AI phone ordering testimonial,Need target.
`);
const authority = authorityScore(authorityRows);
assert.strictEqual(authority.score, 26);
assert.strictEqual(authority.submittedRows.length, 2);
assert.strictEqual(authority.liveRows.length, 1);
assert.strictEqual(authority.highFitStartedRows.length, 2);
assert.strictEqual(authority.indexingRows.length, 1);
assert.deepStrictEqual(evidenceIssues(authorityRows).map((issue) => issue.target), [
  'Unverified AI Directory',
  'Unverified Live Listing',
]);
assert.match(evidenceIssues(authorityRows)[0].issues.join(' '), /owner/);
assert.match(evidenceIssues(authorityRows)[1].issues.join(' '), /date_live/);
assert.match(nextMilestones(authority)[0], /5 live authority links/);
assert.match(renderAuthorityReport(authorityRows), /Serviio SEO Authority Audit/);
assert.match(renderAuthorityReport(authorityRows), /Authority score: 26\/100/);
assert.match(renderAuthorityReport(authorityRows), /Indexing support rows: 1/);
assert.match(renderAuthorityReport(authorityRows), /Evidence Issues/);
assert.match(renderAuthorityReport(authorityRows), /Unverified AI Directory/);
assert.match(renderAuthorityReport(trackerRows), /Business profile - Google Business Profile/);
assert.match(renderAuthorityReport(trackerRows), /Indexing support rows: 1/);
assert.match(renderAuthorityReport(trackerRows), /Live Authority Optimizations/);
assert.match(renderAuthorityReport(trackerRows), /Product Hunt Serviio listing/);
assert.match(renderAuthorityReport(trackerRows), /Claim or update live listing and record proof/);
assert.match(renderAuthorityReport(trackerRows), /Required Business Profile Actions/);
assert.match(renderAuthorityReport(trackerRows), /Business profile - Google Business Profile/);
assert.match(renderAuthorityReport(trackerRows), /Business profile - Bing Places for Business/);
assert.match(renderAuthorityReport(trackerRows), /Business profile - Apple Business Connect/);
assert.match(renderAuthorityReport(trackerRows), /Required Customer Proof Actions/);
assert.match(renderAuthorityReport(trackerRows), /Customer proof - Pilot restaurant testimonial/);

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
P1,Startup directory,Product Hunt Serviio listing,https://www.producthunt.com/products/serviio,live,Serviio,2026-06-01,2026-06-03,https://serviio.ai/,https://serviio.ai/?utm_source=product_hunt&utm_medium=organic_listing&utm_campaign=free_search_marketing,AI phone ordering for restaurants,Existing Product Hunt product page verified live. Claim/update access still pending.
P1,Restaurant technology directory,Restaurant POS directory,https://directory.example.com,live,Serviio,2026-06-01,2026-06-03,https://serviio.ai/chinese-restaurant-pos-ai-phone-agent/,https://serviio.ai/chinese-restaurant-pos-ai-phone-agent/?utm_source=directory&utm_medium=organic_listing&utm_campaign=free_search_marketing,Chinese restaurant POS AI phone agent,Live.
P1,AI directory,AI Directory,https://ai.example.com,submitted,Serviio,2026-06-07,,https://serviio.ai/restaurant-ai-phone-order-taker/,https://serviio.ai/restaurant-ai-phone-order-taker/?utm_source=ai_directory&utm_medium=organic_listing&utm_campaign=free_search_marketing,Restaurant AI phone order taker,Submitted recently.
P0,Webmaster tool,IndexNow priority URL batch,https://api.indexnow.org/indexnow,submitted,Serviio,2026-06-01,,https://serviio.ai/chinese-restaurant-ai-phone-ordering/,https://serviio.ai/chinese-restaurant-ai-phone-ordering/?utm_source=indexnow&utm_medium=indexing&utm_campaign=free_search_marketing,Priority Chinese restaurant and POS URL submission,Submitted recrawl.
`);
const dueFollowUps = followUpRows(followUpTrackerRows, { today: '2026-06-10', days: 7 });
assert.deepStrictEqual(dueFollowUps.map((row) => row.target), [
  'POS consultants',
  'Product Hunt Serviio listing',
  'MenuSifu restaurant consultants',
]);
assert.strictEqual(dueFollowUps[0].days_waiting, 5);
assert.strictEqual(dueFollowUps[0].due_date, '2026-06-05');
assert.strictEqual(dueFollowUps[1].days_waiting, 7);
assert.strictEqual(dueFollowUps[1].due_date, '2026-06-03');
assert.strictEqual(dueFollowUps[1].follow_up_reason, 'live listing optimization');
assert.strictEqual(dueFollowUps[2].days_waiting, 9);
assert.strictEqual(dueFollowUps[2].due_date, '2026-06-08');
assert.match(renderFollowUpReport(dueFollowUps), /# Serviio Free Search Follow-Up Queue/);
assert.match(renderFollowUpReport(dueFollowUps), /npm run marketing:mark -- --target "POS consultants" --status "follow-up needed"/);
assert.match(renderFollowUpReport(dueFollowUps), /Claim or update the live listing/);
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
P1,Startup directory,Product Hunt Serviio listing,https://www.producthunt.com/products/serviio,live,Serviio,2026-06-01,2026-06-03,https://serviio.ai/,https://serviio.ai/?utm_source=product_hunt&utm_medium=organic_listing&utm_campaign=free_search_marketing,AI phone ordering for restaurants,Existing Product Hunt product page verified live. Claim/update access still pending.
P1,POS-specific outreach,MenuSifu restaurant consultants,https://forms.menusifu.com/pages/demo-request,not_started,,,,https://serviio.ai/pos/menusifu-ai-phone-ordering/,https://serviio.ai/pos/menusifu-ai-phone-ordering/?utm_source=menusifu_pos_consultant&utm_medium=partner_referral&utm_campaign=free_search_marketing,MenuSifu AI phone ordering,Use POS-specific partner path.
P2,Customer proof,Pilot restaurant testimonial,,not_started,,,,https://serviio.ai/chinese-restaurant-ai-phone-ordering/,https://serviio.ai/chinese-restaurant-ai-phone-ordering/?utm_source=customer_testimonial&utm_medium=customer_proof&utm_campaign=free_search_marketing,Chinese restaurant AI phone ordering testimonial,Need target.
P1,Restaurant technology directory,Restaurant POS directory,https://directory.example.com,live,Serviio,2026-06-01,2026-06-03,https://serviio.ai/chinese-restaurant-pos-ai-phone-agent/,https://serviio.ai/chinese-restaurant-pos-ai-phone-agent/?utm_source=directory&utm_medium=organic_listing&utm_campaign=free_search_marketing,Chinese restaurant POS AI phone agent,Live.
P0,Business profile,Google Business Profile,https://www.google.com/business/,not_started,,,,https://serviio.ai/,https://serviio.ai/?utm_source=google_business_profile&utm_medium=organic_listing&utm_campaign=free_search_marketing,AI phone ordering for restaurants,Profile setup.
`), { today: '2026-06-10', followUpLimit: 5, readyLimit: 5, researchLimit: 5 });
assert.deepStrictEqual(gtmQueueRows.map((row) => `${row.action_type}:${row.target}`), [
  'follow_up:POS consultants',
  'optimize_live_listing:Product Hunt Serviio listing',
  'submit_or_contact:MenuSifu restaurant consultants',
  'submit_or_contact:Google Business Profile',
  'research_target:Pilot restaurant testimonial',
]);
assert.match(gtmQueueRows[0].next_step, /Follow up/);
assert.match(gtmQueueRows[0].evidence_needed, /Partner reply/);
assert.strictEqual(gtmQueueRows[0].lead_priority, 'P1 partner/referral lead source');
assert.strictEqual(gtmQueueRows[0].lead_route, 'Partner can refer POS-ready restaurants; keep no-POS owners as POS partner referral prospects.');
assert.strictEqual(gtmQueueRows[0].expected_lead_acquisition_channel, 'partner_referral');
assert.match(gtmQueueRows[1].next_step, /Claim or update the live listing/);
assert.match(gtmQueueRows[1].tracker_command, /--status "live"/);
assert.strictEqual(gtmQueueRows[1].expected_lead_acquisition_channel, 'directory_or_listing');
assert.match(gtmQueueRows[2].message_or_query, /Chinese restaurants and takeout-heavy operators already using MenuSifu/);
assert.match(gtmQueueRows[2].evidence_needed, /submitted form confirmation/);
assert.strictEqual(gtmQueueRows[2].lead_priority, 'P0 POS-ready Chinese restaurant lead source');
assert.match(gtmQueueRows[2].lead_route, /MenuSifu/);
assert.strictEqual(gtmQueueRows[2].expected_lead_acquisition_channel, 'partner_referral');
assert.strictEqual(gtmQueueRows[3].lead_priority, 'P0 inbound restaurant-owner lead source');
assert.match(gtmQueueRows[3].lead_route, /Ask every inbound owner which POS system they use/);
assert.strictEqual(gtmQueueRows[3].expected_lead_acquisition_channel, 'business_profile');
assert.match(gtmQueueRows[4].message_or_query, /"Pilot restaurant testimonial" "submit"/);
assert.match(gtmQueueRows[4].evidence_needed, /Published testimonial/);
assert.strictEqual(gtmQueueRows[4].lead_priority, 'P2 proof asset for conversion');
assert.strictEqual(gtmQueueRows[4].expected_lead_acquisition_channel, 'customer_proof');
const gtmCsv = gtmQueueToCsv(gtmQueueRows);
assert.match(gtmCsv, /action_type,opportunity_score,lead_priority,lead_route,primary_kpi,expected_lead_acquisition_channel,priority,channel,target,status,contact_url/);
assert.match(gtmCsv, /follow_up,90,P1 partner\/referral lead source,Partner can refer POS-ready restaurants/);
assert.match(gtmCsv, /optimize_live_listing,34,P1 authority and discovery lead source/);
assert.match(gtmCsv, /P1,Partner outreach,POS consultants/);
assert.match(gtmCsv, /--date 2026-06-10 --note/);
assert.doesNotMatch(gtmCsv, /Restaurant POS directory/);
const defaultGtmQueueRows = buildGtmQueueRows(trackerRows, { today: '2026-06-10' });
assert.ok(!defaultGtmQueueRows.some((row) => row.target === 'Product Hunt Serviio listing'));
assert.ok(defaultGtmQueueRows.some((row) => row.target === 'US-China Restaurant Alliance'));
assert.ok(defaultGtmQueueRows.some((row) => row.target === 'Google Business Profile'));
assert.ok(defaultGtmQueueRows.some((row) => row.target === 'Pilot restaurant testimonial' && row.action_type === 'submit_or_contact'));
assert.deepStrictEqual(parseGtmQueueArgs(['--today', '2026-06-10', '--out', 'gtm.csv', '--ready-limit', '3', '--research-limit', '2', '--follow-up-limit', '1']), {
  out: 'gtm.csv',
  today: '2026-06-10',
  readyLimit: 3,
  researchLimit: 2,
  followUpLimit: 1,
  help: false,
});
assert.strictEqual(parseGtmQueueArgs([]).out, 'docs/free-search-gtm-queue.csv');
assert.throws(() => parseGtmQueueArgs(['--ready-limit', '0']), /--ready-limit must be a positive integer/);

const weeklyAuthoritySprint = buildWeeklyAuthoritySprint(trackerRows, { today: '2026-06-10', submissionTarget: 15, liveTarget: 5, highFitTarget: 8 });
assert.match(weeklyAuthoritySprint, /^# Serviio Weekly Authority Sprint/m);
assert.match(weeklyAuthoritySprint, /Authority score: 6\/100/);
assert.match(weeklyAuthoritySprint, /15 more evidence-qualified submissions or partner contacts/);
assert.match(weeklyAuthoritySprint, /4 live listings, backlinks, business profiles, or published resource links/);
assert.match(weeklyAuthoritySprint, /High-fit partner\/POS\/association rows started: 0\/8/);
assert.match(weeklyAuthoritySprint, /## First 60 Minutes Authority Block/);
assert.match(weeklyAuthoritySprint, /Start here before generic directory submissions; these actions can create profile authority, POS-ready referral paths, or customer proof/);
assert.match(weeklyAuthoritySprint, /\| 1 \| Google Business Profile \| Business profile \| 92 \| Published profile URL, verification screenshot, or dashboard confirmation\. \|/);
assert.match(weeklyAuthoritySprint, /\| 2 \| MenuSifu restaurant consultants \| POS-specific outreach \| 100 \| Partner reply, referral-page URL, submitted form confirmation, or sent-message URL\. \|/);
assert.match(weeklyAuthoritySprint, /\| 3 \| 39 Miles restaurant consultants \| POS-specific outreach \| 100 \| Partner reply, referral-page URL, submitted form confirmation, or sent-message URL\. \|/);
assert.match(weeklyAuthoritySprint, /\| 4 \| Pilot restaurant testimonial \| Customer proof \| 60 \| Published testimonial\/case-study URL or written customer approval note\. \|/);
assert.match(weeklyAuthoritySprint, /After the block, update `docs\/authority-submission-log.csv`, run `npm run marketing:submission-sync`, then rerun `npm run seo:authority`/);
assert.match(weeklyAuthoritySprint, /\| # \| Action \| Score \| Target \| Channel \| Evidence needed \|/);
assert.match(weeklyAuthoritySprint, /Partner reply, referral-page URL, submitted form confirmation, or sent-message URL\./);
assert.match(weeklyAuthoritySprint, /MenuSifu restaurant consultants/);
assert.match(weeklyAuthoritySprint, /Pilot restaurant testimonial/);
assert.match(weeklyAuthoritySprint, /Google Business Profile/);
assert.match(weeklyAuthoritySprint, /\| \d+ \| submit_or_contact \| 92 \| Google Business Profile \| Business profile \|/);
assert.match(weeklyAuthoritySprint, /\| \d+ \| submit_or_contact \| 74 \| Bing Places for Business \| Business profile \|/);
assert.match(weeklyAuthoritySprint, /\| \d+ \| submit_or_contact \| 74 \| Apple Business Connect \| Business profile \|/);
assert.match(weeklyAuthoritySprint, /\| \d+ \| submit_or_contact \| 60 \| Pilot restaurant testimonial \| Customer proof \|/);
assert.match(weeklyAuthoritySprint, /Customer proof request for restaurant AI phone ordering/);
assert.match(weeklyAuthoritySprint, /You can choose whether the proof can be published, anonymized, or kept internal for sales conversations\./);
assert.match(weeklyAuthoritySprint, /## Daily Authority Checklist/);
assert.match(weeklyAuthoritySprint, /\| \d+ \| Chinese restaurant POS consultants \| P1 \| Partner outreach \| https:\/\/www\.m988\.com\/ \| https:\/\/serviio\.ai\/restaurant-pos-partner-referral\/ \|/);
assert.match(weeklyAuthoritySprint, /Record owner, submitted date, confirmation note, evidence URL if available, and follow-up date 2026-06-17\./);
assert.match(weeklyAuthoritySprint, /npm run marketing:mark -- --target "Chinese restaurant POS consultants" --status "submitted" --date 2026-06-10/);
assert.match(weeklyAuthoritySprint, /## Submission Payloads/);
assert.match(weeklyAuthoritySprint, /Contact URL: https:\/\/forms\.menusifu\.com\/pages\/demo-request/);
assert.match(weeklyAuthoritySprint, /Evidence needed: Partner reply, referral-page URL, submitted form confirmation, or sent-message URL\./);
assert.match(weeklyAuthoritySprint, /UTM URL: https:\/\/serviio\.ai\/pos\/menusifu-ai-phone-ordering\/\?utm_source=menusifu_pos_consultant/);
assert.match(weeklyAuthoritySprint, /Subject: AI phone ordering add-on for MenuSifu restaurants/);
assert.match(weeklyAuthoritySprint, /Field checklist:/);
assert.match(weeklyAuthoritySprint, /Product\/company: MenuSifu AI phone ordering partner referral/);
assert.match(weeklyAuthoritySprint, /Website: https:\/\/serviio\.ai\/pos\/menusifu-ai-phone-ordering\/\?utm_source=menusifu_pos_consultant/);
assert.match(weeklyAuthoritySprint, /Categories: POS partner referral, Restaurant POS, AI phone ordering, Chinese restaurant technology/);
assert.match(weeklyAuthoritySprint, /Features: MenuSifu restaurant owner qualification; AI phone order capture; bilingual calls; POS-ready workflow evaluation; no-POS lead routing/);
assert.match(weeklyAuthoritySprint, /Pricing: 2% per completed order\. No monthly fees and no setup costs\./);
assert.match(weeklyAuthoritySprint, /Contact email: info@serviio\.ai/);
assert.match(weeklyAuthoritySprint, /Contact phone: \(408\) 409-9079/);
assert.match(weeklyAuthoritySprint, /Chinese restaurants and takeout-heavy operators already using MenuSifu/);
assert.match(weeklyAuthoritySprint, /Follow-up date: 2026-06-17/);
assert.match(weeklyAuthoritySprint, /npm run marketing:mark -- --target "MenuSifu restaurant consultants" --status "submitted" --date 2026-06-10/);
assert.match(weeklyAuthoritySprint, /npm run marketing:submission-sync/);
const weeklyAuthoritySprintWithLiveOptimization = buildWeeklyAuthoritySprint(trackerRows, { today: '2026-06-20', submissionTarget: 15, liveTarget: 5, highFitTarget: 8 });
assert.match(weeklyAuthoritySprintWithLiveOptimization, /\| 1 \| optimize_live_listing \| 66 \| Product Hunt Serviio listing \| Startup directory \|/);
assert.match(weeklyAuthoritySprintWithLiveOptimization, /npm run marketing:mark -- --target "Product Hunt Serviio listing" --status "live" --date 2026-06-20/);
assert.doesNotMatch(weeklyAuthoritySprintWithLiveOptimization, /Product Hunt Serviio listing" --status submitted/);
assert.doesNotMatch(weeklyAuthoritySprintWithLiveOptimization, /\| \d+ \| submit_or_contact \| \d+ \| Bing Webmaster Tools sitemap \| Webmaster tool \|/);
assert.match(weeklyAuthoritySprintWithLiveOptimization, /## Indexing Support Queue/);
assert.match(weeklyAuthoritySprintWithLiveOptimization, /\| 1 \| Bing Webmaster Tools sitemap \| P0 \| Webmaster tool \| https:\/\/www\.bing\.com\/webmasters\/ \|/);
assert.match(weeklyAuthoritySprintWithLiveOptimization, /\| \d+ \| submit_or_contact \| 82 \| Prep & Profit vendor directory \| Restaurant technology directory \|/);
assert.match(weeklyAuthoritySprintWithLiveOptimization, /\| \d+ \| submit_or_contact \| 60 \| Pilot restaurant testimonial \| Customer proof \|/);
assert.match(weeklyAuthoritySprintWithLiveOptimization, /### \d+\. Prep & Profit vendor directory/);
assert.match(weeklyAuthoritySprintWithLiveOptimization, /### \d+\. Pilot restaurant testimonial/);
assert.deepStrictEqual(parseWeeklyAuthoritySprintArgs(['--out', 'docs/sprint.md', '--today', '2026-06-10', '--submission-target', '12', '--live-target', '4', '--high-fit-target', '6']), {
  out: 'docs/sprint.md',
  today: '2026-06-10',
  submissionTarget: 12,
  liveTarget: 4,
  highFitTarget: 6,
  help: false,
});
assert.throws(() => parseWeeklyAuthoritySprintArgs(['--live-target', '0']), /--live-target must be a positive integer/);

const submissionLogActions = buildSubmissionLogSyncActions(parseCsv(`action_status,priority,channel,target,opportunity_score,opportunity_reasons,submission_url,clean_url,utm_url,anchor_or_listing_phrase,title_or_subject,tagline,message_or_listing_copy,evidence_url,account_or_login,confirmation_note,submitted_date,live_date,follow_up_date,tracker_command
submitted,P1,POS-specific outreach,MenuSifu restaurant consultants,100,,https://forms.menusifu.com/pages/demo-request,https://serviio.ai/pos/menusifu-ai-phone-ordering/,,,,,,,info@serviio.ai,Submitted MenuSifu partner form.,2026-06-06,,2026-06-13,
live,P1,Restaurant technology directory,Restaurant POS directory,96,,https://directory.example.com,https://serviio.ai/chinese-restaurant-pos-ai-phone-agent/,,,,,,https://directory.example.com/serviio,info@serviio.ai,Live vendor listing.,2026-06-06,2026-06-07,,
submitted,P1,AI directory,Incomplete Directory,80,,https://ai.example.com,https://serviio.ai/restaurant-ai-phone-order-taker/,,,,,,,,,,,
submitted,P1,AI directory,Missing Follow Up,80,,https://ai.example.com,https://serviio.ai/restaurant-ai-phone-order-taker/,,,,,,,info@serviio.ai,Submitted directory form.,2026-06-06,,,
`), { today: '2026-06-10' });
assert.strictEqual(submissionLogActions.length, 4);
assert.deepStrictEqual(submissionLogActions.map((action) => action.issues.length), [0, 0, 3, 1]);
assert.match(renderSubmissionSyncReport(submissionLogActions), /Valid Updates/);
assert.match(renderSubmissionSyncReport(submissionLogActions), /Incomplete Directory: missing submitted_date, missing confirmation evidence, missing follow_up_date/);
assert.match(renderSubmissionSyncReport(submissionLogActions), /Missing Follow Up: missing follow_up_date/);
const submissionSyncTracker = `priority,channel,target,url,status,owner,date_submitted,date_live,landing_url,utm_url,anchor_or_listing_phrase,notes
P1,POS-specific outreach,MenuSifu restaurant consultants,https://forms.menusifu.com/pages/demo-request,not_started,,,,https://serviio.ai/pos/menusifu-ai-phone-ordering/,https://serviio.ai/pos/menusifu-ai-phone-ordering/?utm_source=menusifu_pos_consultant&utm_medium=partner_referral&utm_campaign=free_search_marketing,MenuSifu AI phone ordering,Use POS-specific partner path.
P1,Restaurant technology directory,Restaurant POS directory,https://directory.example.com,not_started,,,,https://serviio.ai/chinese-restaurant-pos-ai-phone-agent/,https://serviio.ai/chinese-restaurant-pos-ai-phone-agent/?utm_source=directory&utm_medium=organic_listing&utm_campaign=free_search_marketing,Chinese restaurant POS AI phone agent,Need listing.
P1,AI directory,Incomplete Directory,https://ai.example.com,not_started,,,,https://serviio.ai/restaurant-ai-phone-order-taker/,https://serviio.ai/restaurant-ai-phone-order-taker/?utm_source=ai&utm_medium=organic_listing&utm_campaign=free_search_marketing,Restaurant AI phone order taker,Need submission.
P1,AI directory,Missing Follow Up,https://ai.example.com,not_started,,,,https://serviio.ai/restaurant-ai-phone-order-taker/,https://serviio.ai/restaurant-ai-phone-order-taker/?utm_source=ai&utm_medium=organic_listing&utm_campaign=free_search_marketing,Restaurant AI phone order taker,Need submission.
`;
const submissionSyncReport = renderSubmissionSyncReport(submissionLogActions, { trackerText: submissionSyncTracker });
assert.match(submissionSyncReport, /Current authority score: 0\/100/);
assert.match(submissionSyncReport, /Projected authority score after valid updates: 19\/100/);
assert.match(submissionSyncReport, /Authority score delta: \+19/);
assert.match(submissionSyncReport, /Projected submitted or follow-up rows: 1 \(was 0, \+1\)/);
assert.match(submissionSyncReport, /Projected live authority rows: 1 \(was 0, \+1\)/);
assert.match(submissionSyncReport, /Projected high-fit started rows: 2 \(was 0, \+2\)/);
assert.match(submissionSyncReport, /Projected business profiles started: 0 \(was 0, \+0\)/);
assert.match(submissionSyncReport, /Projected customer proof rows started: 0 \(was 0, \+0\)/);
const syncedTracker = applySubmissionLogActions(submissionSyncTracker, submissionLogActions);
assert.match(syncedTracker, /MenuSifu restaurant consultants,https:\/\/forms\.menusifu\.com\/pages\/demo-request,submitted,Serviio,2026-06-06/);
assert.match(syncedTracker, /Restaurant POS directory,https:\/\/directory\.example\.com\/serviio,live,Serviio,2026-06-06,2026-06-07/);
assert.match(syncedTracker, /Incomplete Directory,https:\/\/ai\.example\.com,not_started/);
assert.match(syncedTracker, /Missing Follow Up,https:\/\/ai\.example\.com,not_started/);
assert.deepStrictEqual(parseSubmissionSyncArgs(['--apply', '--today', '2026-06-10', '--log', 'log.csv', '--tracker', 'tracker.csv', '--out', 'out.csv']), {
  log: 'log.csv',
  tracker: 'tracker.csv',
  out: 'out.csv',
  today: '2026-06-10',
  apply: true,
  help: false,
});
assert.strictEqual(parseSubmissionSyncArgs([]).log, 'docs/authority-submission-log.csv');
assert.deepStrictEqual(parseTrackerGeneratorArgs(['--out', '/tmp/tracker.csv']), {
  out: '/tmp/tracker.csv',
  help: false,
});
assert.deepStrictEqual(parseTrackerGeneratorArgs([]), {
  out: 'docs/free-search-marketing-tracker.csv',
  help: false,
});
assert.throws(() => parseTrackerGeneratorArgs(['--bad']), /Unexpected argument/);

console.log('Marketing outreach export tests passed');
