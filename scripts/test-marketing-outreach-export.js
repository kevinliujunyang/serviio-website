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
  buildBusinessProfileEvidenceLogRows,
  evidenceLogToCsv: businessProfileEvidenceLogToCsv,
  parseArgs: parseBusinessProfileArgs,
} = require('./export-business-profile-pack');
const {
  buildBusinessProfileExecutionRows,
  parseArgs: parseBusinessProfileExecutionArgs,
  toCsv: businessProfileExecutionToCsv,
} = require('./export-business-profile-execution-queue');
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
  buildFirstHourAuthorityRows,
  parseArgs: parseFirstHourAuthorityArgs,
  toCsv: firstHourAuthorityToCsv,
} = require('./export-first-hour-authority-csv');
const {
  buildLiveListingOptimizationRows,
  parseArgs: parseLiveListingArgs,
  toCsv: liveListingToCsv,
} = require('./export-live-listing-optimization-csv');
const {
  applyActions: applyLiveListingActions,
  buildLiveListingPreflightRows,
  buildSyncActions: buildLiveListingSyncActions,
  parseArgs: parseLiveListingSyncArgs,
  renderPreflightReport: renderLiveListingPreflightReport,
  renderReport: renderLiveListingSyncReport,
} = require('./sync-live-listing-optimization-log');
const {
  buildWeeklyAuthoritySprint,
  parseArgs: parseWeeklyAuthoritySprintArgs,
} = require('./export-weekly-authority-sprint');
const {
  buildAuthorityCommandCenter,
  parseArgs: parseAuthorityCommandCenterArgs,
} = require('./export-authority-command-center');
const {
  applyActions: applySubmissionLogActions,
  buildEvidencePreflightRows,
  buildSyncActions: buildSubmissionLogSyncActions,
  parseArgs: parseSubmissionSyncArgs,
  renderEvidencePreflightReport,
  renderReport: renderSubmissionSyncReport,
} = require('./sync-authority-submission-log');
const {
  applyActions: applyProfileEvidenceActions,
  buildProfileEvidencePreflightRows,
  buildSyncActions: buildProfileEvidenceSyncActions,
  parseArgs: parseProfileEvidenceSyncArgs,
  renderPreflightReport: renderProfileEvidencePreflightReport,
  renderReport: renderProfileEvidenceSyncReport,
} = require('./sync-business-profile-evidence-log');
const {
  parseArgs: parseTrackerGeneratorArgs,
} = require('./generate-free-search-tracker');

const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
assert.strictEqual(
  packageJson.scripts['marketing:submission-log:first-hour'],
  'node scripts/export-authority-submission-log.js --first-hour',
);
assert.strictEqual(
  packageJson.scripts['marketing:submission-preflight:first-hour'],
  'node scripts/sync-authority-submission-log.js --preflight --log docs/authority-first-hour-submission-log.csv',
);
assert.strictEqual(
  packageJson.scripts['marketing:submission-preflight:first-hour:export'],
  'node scripts/sync-authority-submission-log.js --preflight --log docs/authority-first-hour-submission-log.csv --out docs/authority-evidence-preflight.md',
);
assert.strictEqual(
  packageJson.scripts['marketing:profile-evidence:export'],
  'node scripts/export-business-profile-pack.js --evidence-log --out docs/business-profile-evidence-log.csv',
);
assert.strictEqual(
  packageJson.scripts['marketing:profile-execution:export'],
  'node scripts/export-business-profile-execution-queue.js --out docs/business-profile-execution-queue.csv',
);
assert.strictEqual(
  packageJson.scripts['marketing:profile-evidence-sync'],
  'node scripts/sync-business-profile-evidence-log.js',
);
assert.strictEqual(
  packageJson.scripts['marketing:live-listings-sync'],
  'node scripts/sync-live-listing-optimization-log.js',
);
assert.strictEqual(
  packageJson.scripts['marketing:live-listings-preflight'],
  'node scripts/sync-live-listing-optimization-log.js --preflight',
);
assert.strictEqual(
  packageJson.scripts['marketing:authority-command-center'],
  'node scripts/export-authority-command-center.js',
);
assert.strictEqual(
  packageJson.scripts['marketing:profile-evidence-preflight'],
  'node scripts/sync-business-profile-evidence-log.js --preflight',
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
const liveListingRows = buildLiveListingOptimizationRows(trackerRows, { today: '2026-06-21' });
assert.deepStrictEqual(liveListingRows.map((row) => row.target), ['Product Hunt Serviio listing']);
assert.strictEqual(liveListingRows[0].action_type, 'optimize_live_listing');
assert.strictEqual(liveListingRows[0].live_url, 'https://www.producthunt.com/products/serviio');
assert.match(liveListingRows[0].update_checklist, /Confirm the listing mentions Chinese restaurants/);
assert.match(liveListingRows[0].update_checklist, /39 Miles, Square, Toast, Clover, MenuSifu, Chowbus/);
assert.match(liveListingRows[0].proof_fields, /owner confirmation/);
assert.strictEqual(liveListingRows[0].action_status, '');
assert.strictEqual(liveListingRows[0].evidence_url, '');
assert.strictEqual(liveListingRows[0].completed_date, '');
assert.match(liveListingRows[0].tracker_command, /--target "Product Hunt Serviio listing" --status "live" --date 2026-06-21/);
const liveListingCsv = liveListingToCsv(liveListingRows);
assert.match(liveListingCsv, /action_type,priority,channel,target,live_url/);
assert.match(liveListingCsv, /action_status,evidence_url,account_or_login,screenshot_or_dashboard_confirmation,confirmation_note,completed_date/);
assert.match(liveListingCsv, /AI phone ordering for restaurants using POS systems/);
assert.match(liveListingCsv, /assets\/og-image\.png/);
const pendingLiveListingPreflight = buildLiveListingPreflightRows(liveListingRows);
assert.strictEqual(pendingLiveListingPreflight[0].ready_for_sync, false);
assert.deepStrictEqual(pendingLiveListingPreflight[0].required_fields, [
  '`action_status`',
  '`completed_date`',
  '`evidence_url` live URL',
  'confirmation evidence',
]);
assert.match(renderLiveListingPreflightReport(pendingLiveListingPreflight), /Rows still pending evidence: 1/);
const completedLiveListingRows = [{
  ...liveListingRows[0],
  action_status: 'live',
  evidence_url: 'https://www.producthunt.com/products/serviio',
  account_or_login: 'Product Hunt maker account',
  screenshot_or_dashboard_confirmation: 'Updated Product Hunt screenshot captured',
  confirmation_note: 'Updated listing copy to mention Chinese restaurants and POS-ready phone orders.',
  completed_date: '2026-06-22',
}];
const liveListingActions = buildLiveListingSyncActions(completedLiveListingRows, { today: '2026-06-22' });
assert.strictEqual(liveListingActions.length, 1);
assert.deepStrictEqual(liveListingActions[0].issues, []);
assert.strictEqual(liveListingActions[0].updateArgs.target, 'Product Hunt Serviio listing');
assert.strictEqual(liveListingActions[0].updateArgs.status, 'live');
assert.strictEqual(liveListingActions[0].updateArgs.date, '2026-06-22');
assert.strictEqual(liveListingActions[0].updateArgs.liveDate, '2026-06-22');
assert.strictEqual(liveListingActions[0].updateArgs.url, 'https://www.producthunt.com/products/serviio');
assert.match(liveListingActions[0].updateArgs.note, /Live listing optimization/);
assert.match(liveListingActions[0].updateArgs.note, /Chinese restaurants and POS-ready phone orders/);
assert.match(liveListingActions[0].updateArgs.note, /Updated Product Hunt screenshot captured/);
const completedLiveListingPreflight = buildLiveListingPreflightRows(completedLiveListingRows);
assert.strictEqual(completedLiveListingPreflight[0].ready_for_sync, true);
assert.match(renderLiveListingSyncReport(liveListingActions, {
  trackerText: fs.readFileSync('docs/free-search-marketing-tracker.csv', 'utf8'),
}), /Projected authority score after valid live listing updates/);
const syncedLiveListingTracker = applyLiveListingActions(
  fs.readFileSync('docs/free-search-marketing-tracker.csv', 'utf8'),
  liveListingActions,
);
const syncedProductHuntRow = parseCsv(syncedLiveListingTracker)
  .find((row) => row.target === 'Product Hunt Serviio listing');
assert.match(syncedProductHuntRow.notes, /Live listing optimization/);
assert.match(syncedProductHuntRow.notes, /Product Hunt maker account/);
assert.deepStrictEqual(parseLiveListingSyncArgs(['--log', 'docs/live.csv', '--today', '2026-06-22', '--apply']), {
  log: 'docs/live.csv',
  tracker: 'docs/free-search-marketing-tracker.csv',
  out: 'docs/free-search-marketing-tracker.csv',
  today: '2026-06-22',
  apply: true,
  preflight: false,
  help: false,
});
assert.deepStrictEqual(parseLiveListingSyncArgs(['--preflight', '--out', 'docs/live-preflight.md']), {
  log: 'docs/live-listing-optimization.csv',
  tracker: 'docs/free-search-marketing-tracker.csv',
  out: 'docs/live-preflight.md',
  today: parseLiveListingSyncArgs([]).today,
  apply: false,
  preflight: true,
  help: false,
});
assert.deepStrictEqual(parseLiveListingArgs(['--today', '2026-06-21', '--out', 'docs/live.csv']), {
  out: 'docs/live.csv',
  today: '2026-06-21',
  limit: 10,
  help: false,
});
assert.throws(() => parseLiveListingArgs(['--limit', '0']), /--limit must be a positive integer/);
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
assert.match(firstHourAuthorityRows[0].execution_checklist, /Use clean homepage URL if Google rejects UTM parameters/);
assert.match(firstHourAuthorityRows[0].execution_checklist, /Capture verification screenshot or dashboard confirmation/);
assert.match(firstHourAuthorityRows[1].execution_checklist, /Submit MenuSifu partner or demo form/);
assert.match(firstHourAuthorityRows[1].execution_checklist, /Ask for referral or integration contact path/);
assert.match(firstHourAuthorityRows[2].execution_checklist, /Contact 39 Miles\/MENUPO using the official contact path/);
assert.match(firstHourAuthorityRows[3].execution_checklist, /Send customer proof request link/);
assert.match(firstHourAuthorityRows[3].message_or_listing_copy, /You can choose whether the proof can be published, anonymized, or kept internal/);
const allAuthoritySubmissionRows = buildAuthoritySubmissionLogRows(trackerRows, { limit: 60, today: '2026-06-06' });
const googleProfileSubmissionRow = allAuthoritySubmissionRows.find((row) => row.target === 'Google Business Profile');
assert.ok(googleProfileSubmissionRow);
assert.strictEqual(googleProfileSubmissionRow.lead_priority, 'P0 inbound restaurant-owner lead source');
assert.match(googleProfileSubmissionRow.lead_route, /Ask every inbound owner which POS system they use/);
assert.strictEqual(googleProfileSubmissionRow.primary_kpi, 'verified profile plus POS-qualified inbound leads');
assert.strictEqual(googleProfileSubmissionRow.expected_lead_acquisition_channel, 'business_profile');
const bingProfileSubmissionRow = allAuthoritySubmissionRows.find((row) => row.target === 'Bing Places for Business');
assert.ok(bingProfileSubmissionRow);
assert.match(bingProfileSubmissionRow.execution_checklist, /Import from Google only after Google Business Profile fields are accurate/);
assert.match(bingProfileSubmissionRow.execution_checklist, /Use Bing Places website URL with utm_source=bing_places if accepted/);
assert.match(bingProfileSubmissionRow.execution_checklist, /Mirror Google services and include Chinese restaurant AI phone answering/);
const appleProfileSubmissionRow = allAuthoritySubmissionRows.find((row) => row.target === 'Apple Business Connect');
assert.ok(appleProfileSubmissionRow);
assert.match(appleProfileSubmissionRow.execution_checklist, /Add action link to the Chinese restaurant POS AI phone agent page/);
assert.match(appleProfileSubmissionRow.execution_checklist, /Use 39 Miles AI phone ordering or MenuSifu AI phone ordering as the first POS-specific showcase/);
assert.match(appleProfileSubmissionRow.execution_checklist, /Capture Business Connect dashboard screenshot/);
const productHuntSubmissionRow = allAuthoritySubmissionRows.find((row) => row.target === 'Product Hunt Serviio listing');
assert.strictEqual(productHuntSubmissionRow, undefined);
const authoritySubmissionCsv = authoritySubmissionLogToCsv(authoritySubmissionRows);
assert.match(authoritySubmissionCsv, /action_status,priority,channel,target,submission_type,lead_priority,lead_route,primary_kpi,expected_lead_acquisition_channel,next_step,evidence_needed,execution_checklist,opportunity_score/);
assert.match(authoritySubmissionCsv, /execution_checklist/);
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
assert.match(businessProfilePack, /Profile asset checklist/);
assert.match(businessProfilePack, /https:\/\/serviio\.ai\/assets\/logo\.svg/);
assert.match(businessProfilePack, /https:\/\/serviio\.ai\/assets\/og-image\.png/);
assert.match(businessProfilePack, /Platform setup checklist/);
assert.match(businessProfilePack, /Google Business Profile: use clean homepage if UTM is rejected/);
assert.match(businessProfilePack, /Bing Places for Business: mirror Google NAP and service details/);
assert.match(businessProfilePack, /Apple Business Connect: add action link to POS fit check/);
assert.match(businessProfilePack, /Do not mark submitted or live until profile evidence is captured/);
assert.match(businessProfilePack, /## Business Profile Evidence Log Template/);
assert.match(businessProfilePack, /profile_item_type \| profile_platform \| item_name \| destination_url \| evidence_url \| account_or_login \| screenshot_or_dashboard_confirmation \| submitted_date \| live_date \| follow_up_date/);
assert.match(businessProfilePack, /profile_core \| Google Business Profile \| Serviio profile \| https:\/\/serviio\.ai\/\?utm_source=google_business_profile/);
assert.match(businessProfilePack, /product_card \| Google Business Profile \| 39 Miles AI phone ordering \| https:\/\/serviio\.ai\/pos\/39-miles-ai-phone-ordering\/\?utm_source=business_profile_product/);
assert.match(businessProfilePack, /profile_post \| Google Business Profile \| AI phone ordering for POS-ready restaurants \| https:\/\/serviio\.ai\/chinese-restaurant-pos-ai-phone-agent\/\?utm_source=business_profile_post/);
assert.match(businessProfilePack, /profile_core \| Bing Places for Business \| Serviio profile \| https:\/\/serviio\.ai\/\?utm_source=bing_places/);
assert.match(businessProfilePack, /product_card \| Bing Places for Business \| MenuSifu AI phone ordering \| https:\/\/serviio\.ai\/pos\/menusifu-ai-phone-ordering\/\?utm_source=business_profile_product/);
assert.match(businessProfilePack, /profile_core \| Apple Business Connect \| Serviio profile \| https:\/\/serviio\.ai\/\?utm_source=apple_business_connect/);
assert.match(businessProfilePack, /profile_post \| Apple Business Connect \| Bilingual phone answering for Chinese restaurants \| https:\/\/serviio\.ai\/chinese-restaurant-ai-phone-ordering\/\?utm_source=business_profile_post/);
assert.match(businessProfilePack, /## Platform field mapping/);
assert.match(businessProfilePack, /### Google Business Profile/);
assert.match(businessProfilePack, /- Primary category: Software company/);
assert.match(businessProfilePack, /- Service areas: United States service-area business; prioritize New York City, Los Angeles, San Francisco Bay Area, Seattle, Houston, Chicago, Boston, and Philadelphia/);
assert.match(businessProfilePack, /- Website field: https:\/\/serviio\.ai\/ \(use clean URL if Google rejects UTM parameters\)/);
assert.match(businessProfilePack, /- Evidence before tracker update: dashboard confirmation screenshot, account email, submitted date, and verification or review status/);
assert.match(businessProfilePack, /### Bing Places for Business/);
assert.match(businessProfilePack, /- Import source: import from Google only after the Google profile fields are accurate/);
assert.match(businessProfilePack, /- Website field: https:\/\/serviio\.ai\/\?utm_source=bing_places&utm_medium=organic_listing&utm_campaign=free_search_marketing/);
assert.match(businessProfilePack, /### Apple Business Connect/);
assert.match(businessProfilePack, /- Action link: https:\/\/serviio\.ai\/chinese-restaurant-pos-ai-phone-agent\/\?utm_source=apple_business_connect/);
assert.match(businessProfilePack, /- Showcase: use 39 Miles AI phone ordering or MenuSifu AI phone ordering as the first POS-specific showcase/);
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
assert.match(businessProfilePack, /Product evidence fields to record/);
assert.match(businessProfilePack, /product_card_url/);
assert.match(businessProfilePack, /product_destination_url/);
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
assert.match(businessProfilePack, /Post evidence fields to record/);
assert.match(businessProfilePack, /profile_post_url/);
assert.match(businessProfilePack, /post_destination_url/);
assert.match(businessProfilePack, /Lead capture and attribution/);
assert.match(businessProfilePack, /utm_source=google_business_profile/);
assert.match(businessProfilePack, /Evidence to capture/);
assert.match(businessProfilePack, /verification screenshot or dashboard confirmation/);
assert.match(businessProfilePack, /npm run marketing:mark -- --target "Google Business Profile" --status live --date 2026-06-06 --url/);
assert.match(businessProfilePack, /npm run marketing:mark -- --target "Google Business Profile" --status submitted --date 2026-06-06/);
const businessProfileEvidenceRows = buildBusinessProfileEvidenceLogRows(trackerRows);
assert.ok(businessProfileEvidenceRows.some((row) =>
  row.profile_item_type === 'profile_core' &&
  row.profile_platform === 'Bing Places for Business' &&
  /utm_source=bing_places/.test(row.destination_url)
));
assert.ok(businessProfileEvidenceRows.some((row) =>
  row.profile_item_type === 'product_card' &&
  row.profile_platform === 'Apple Business Connect' &&
  row.item_name === 'MenuSifu AI phone ordering'
));
const businessProfileEvidenceCsv = businessProfileEvidenceLogToCsv(businessProfileEvidenceRows);
assert.match(businessProfileEvidenceCsv, /^profile_item_type,profile_platform,item_name,destination_url,evidence_url,account_or_login,screenshot_or_dashboard_confirmation,submitted_date,live_date,follow_up_date/m);
assert.match(businessProfileEvidenceCsv, /profile_core,Bing Places for Business,Serviio profile,https:\/\/serviio\.ai\/\?utm_source=bing_places/);
assert.match(businessProfileEvidenceCsv, /product_card,Apple Business Connect,MenuSifu AI phone ordering,https:\/\/serviio\.ai\/pos\/menusifu-ai-phone-ordering\/\?utm_source=business_profile_product/);
const businessProfileExecutionRows = buildBusinessProfileExecutionRows(trackerRows, { today: '2026-06-10' });
assert.strictEqual(businessProfileExecutionRows.length, 15);
assert.deepStrictEqual(businessProfileExecutionRows.slice(0, 6).map((row) => `${row.position}:${row.profile_platform}:${row.item_name}`), [
  '1:Google Business Profile:Serviio profile',
  '2:Google Business Profile:39 Miles AI phone ordering',
  '3:Google Business Profile:MenuSifu AI phone ordering',
  '4:Google Business Profile:AI phone ordering for POS-ready restaurants',
  '5:Google Business Profile:Bilingual phone answering for Chinese restaurants',
  '6:Google Business Profile:Estimate missed-call revenue before a demo',
]);
assert.strictEqual(businessProfileExecutionRows[0].authority_reason, 'P0 profile authority and inbound restaurant-owner lead source');
assert.strictEqual(businessProfileExecutionRows[0].authority_media_kit_url, 'https://serviio.ai/authority-media-kit/');
assert.strictEqual(businessProfileExecutionRows[0].lead_route, 'Ask every inbound owner which POS system they use; prioritize 39 Miles, Square, Toast, Clover, MenuSifu, Chowbus, and Mealkeyway users.');
assert.strictEqual(businessProfileExecutionRows[0].expected_lead_acquisition_channel, 'business_profile');
assert.match(businessProfileExecutionRows[0].copy_paste_payload, /Serviio is an AI phone ordering system for restaurants/);
assert.match(businessProfileExecutionRows[0].copy_paste_payload, /Authority media kit: https:\/\/serviio\.ai\/authority-media-kit\//);
assert.match(businessProfileExecutionRows[0].evidence_needed, /dashboard confirmation screenshot/);
assert.match(businessProfileExecutionRows[0].tracker_command, /--target "Google Business Profile" --status submitted --date 2026-06-10/);
assert.match(businessProfileExecutionRows[1].copy_paste_payload, /AI phone ordering workflow for Chinese restaurants using 39 Miles POS/);
assert.match(businessProfileExecutionRows[1].evidence_needed, /product_card_url/);
assert.match(businessProfileExecutionRows[2].destination_url, /menusifu-ai-phone-ordering/);
assert.match(businessProfileExecutionRows[3].copy_paste_payload, /Serviio helps restaurants answer phone orders 24\/7/);
assert.match(businessProfileExecutionRows[3].evidence_needed, /profile_post_url/);
assert.ok(businessProfileExecutionRows.some((row) =>
  row.profile_platform === 'Bing Places for Business' &&
  row.item_name === 'Serviio profile' &&
  /Import from Google only after Google profile fields are accurate/.test(row.copy_paste_payload)
));
assert.ok(businessProfileExecutionRows.some((row) =>
  row.profile_platform === 'Apple Business Connect' &&
  row.item_name === 'Serviio profile' &&
  /Action link: https:\/\/serviio\.ai\/chinese-restaurant-pos-ai-phone-agent/.test(row.copy_paste_payload)
));
const businessProfileExecutionCsv = businessProfileExecutionToCsv(businessProfileExecutionRows);
assert.match(businessProfileExecutionCsv, /^position,profile_platform,profile_item_type,item_name,destination_url,authority_reason,authority_media_kit_url,lead_route,expected_lead_acquisition_channel,next_step,copy_paste_payload,evidence_needed,tracker_command/m);
assert.match(businessProfileExecutionCsv, /Google Business Profile,profile_core,Serviio profile/);
assert.match(businessProfileExecutionCsv, /https:\/\/serviio\.ai\/authority-media-kit\//);
assert.match(businessProfileExecutionCsv, /Google Business Profile,product_card,39 Miles AI phone ordering/);
assert.match(businessProfileExecutionCsv, /Apple Business Connect,profile_core,Serviio profile/);
assert.deepStrictEqual(parseBusinessProfileExecutionArgs(['--today', '2026-06-10', '--out', 'docs/profile-queue.csv', '--limit', '9']), {
  out: 'docs/profile-queue.csv',
  today: '2026-06-10',
  limit: 9,
  help: false,
});
assert.throws(() => parseBusinessProfileExecutionArgs(['--limit', '0']), /--limit must be a positive integer/);
assert.deepStrictEqual(parseBusinessProfileArgs(['--out', 'docs/profiles.md', '--today', '2026-06-06']), {
  out: 'docs/profiles.md',
  today: '2026-06-06',
  evidenceLog: false,
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
assert.match(renderFollowUpReport(dueFollowUps), /Authority media kit: https:\/\/serviio\.ai\/authority-media-kit\//);
assert.match(renderFollowUpReport(dueFollowUps), /https:\/\/serviio.ai\/restaurant-pos-partner-referral\//);
assert.deepStrictEqual(parseFollowUpArgs(['--today', '2026-06-10', '--days', '5', '--limit', '3', '--out', 'docs/follow-ups.md']), {
  csvPath: 'docs/free-search-marketing-tracker.csv',
  today: '2026-06-10',
  days: 5,
  limit: 3,
  out: 'docs/follow-ups.md',
});
assert.throws(() => parseFollowUpArgs(['--days', '0']), /--days must be a positive integer/);

const gtmQueueRows = buildGtmQueueRows(parseCsv(`priority,channel,target,url,status,owner,date_submitted,date_live,landing_url,utm_url,anchor_or_listing_phrase,notes
P1,Partner outreach,POS consultants,https://example.com,follow-up needed,Serviio,2026-06-05,,https://serviio.ai/restaurant-pos-partner-referral/,https://serviio.ai/restaurant-pos-partner-referral/?utm_source=pos_consultant&utm_medium=partner_referral&utm_campaign=free_search_marketing,Restaurant POS partner referral,Needs reply.
P1,Startup directory,Product Hunt Serviio listing,https://www.producthunt.com/products/serviio,live,Serviio,2026-06-01,2026-06-03,https://serviio.ai/,https://serviio.ai/?utm_source=product_hunt&utm_medium=organic_listing&utm_campaign=free_search_marketing,AI phone ordering for restaurants,Existing Product Hunt product page verified live. Claim/update access still pending.
P1,POS-specific outreach,MenuSifu restaurant consultants,https://forms.menusifu.com/pages/demo-request,not_started,,,,https://serviio.ai/pos/menusifu-ai-phone-ordering/,https://serviio.ai/pos/menusifu-ai-phone-ordering/?utm_source=menusifu_pos_consultant&utm_medium=partner_referral&utm_campaign=free_search_marketing,MenuSifu AI phone ordering,Use POS-specific partner path.
P2,Customer proof,Pilot restaurant testimonial,,not_started,,,,https://serviio.ai/chinese-restaurant-ai-phone-ordering/,https://serviio.ai/chinese-restaurant-ai-phone-ordering/?utm_source=customer_testimonial&utm_medium=customer_proof&utm_campaign=free_search_marketing,Chinese restaurant AI phone ordering testimonial,Need target.
P1,Restaurant technology directory,Restaurant POS directory,https://directory.example.com,live,Serviio,2026-06-01,2026-06-03,https://serviio.ai/chinese-restaurant-pos-ai-phone-agent/,https://serviio.ai/chinese-restaurant-pos-ai-phone-agent/?utm_source=directory&utm_medium=organic_listing&utm_campaign=free_search_marketing,Chinese restaurant POS AI phone agent,Live.
P0,Business profile,Google Business Profile,https://www.google.com/business/,not_started,,,,https://serviio.ai/,https://serviio.ai/?utm_source=google_business_profile&utm_medium=organic_listing&utm_campaign=free_search_marketing,AI phone ordering for restaurants,Profile setup.
P0,Business profile,Bing Places for Business,https://www.bingplaces.com/,not_started,,,,https://serviio.ai/,https://serviio.ai/?utm_source=bing_places&utm_medium=organic_listing&utm_campaign=free_search_marketing,Restaurant AI phone answering,Mirror Google listing details.
P0,Business profile,Apple Business Connect,https://businessconnect.apple.com/,not_started,,,,https://serviio.ai/,https://serviio.ai/?utm_source=apple_business_connect&utm_medium=organic_listing&utm_campaign=free_search_marketing,AI phone ordering for restaurants,Add action link.
`), { today: '2026-06-10', followUpLimit: 5, readyLimit: 5, researchLimit: 5 });
assert.deepStrictEqual(gtmQueueRows.map((row) => `${row.action_type}:${row.target}`), [
  'follow_up:POS consultants',
  'optimize_live_listing:Product Hunt Serviio listing',
  'submit_or_contact:MenuSifu restaurant consultants',
  'submit_or_contact:Apple Business Connect',
  'submit_or_contact:Bing Places for Business',
  'submit_or_contact:Google Business Profile',
  'research_target:Pilot restaurant testimonial',
]);
assert.match(gtmQueueRows[0].next_step, /Follow up/);
assert.match(gtmQueueRows[0].evidence_needed, /Partner reply/);
assert.strictEqual(gtmQueueRows[0].lead_priority, 'P1 partner/referral lead source');
assert.strictEqual(gtmQueueRows[0].lead_route, 'Partner can refer POS-ready restaurants; keep no-POS owners as POS partner referral prospects.');
assert.strictEqual(gtmQueueRows[0].expected_lead_acquisition_channel, 'partner_referral');
assert.match(gtmQueueRows[1].next_step, /Claim or update the live listing/);
assert.match(gtmQueueRows[1].message_or_query, /Product Hunt update checklist/);
assert.match(gtmQueueRows[1].message_or_query, /Tagline: AI phone ordering for restaurants using POS systems\./);
assert.match(gtmQueueRows[1].message_or_query, /Categories: AI agents, Voice AI, Restaurant technology, Food and beverage/);
assert.match(gtmQueueRows[1].message_or_query, /Website: https:\/\/serviio\.ai\/\?utm_source=product_hunt/);
assert.match(gtmQueueRows[1].message_or_query, /Logo: https:\/\/serviio\.ai\/assets\/logo\.svg/);
assert.match(gtmQueueRows[1].message_or_query, /Cover\/social image: https:\/\/serviio\.ai\/assets\/og-image\.png/);
assert.match(gtmQueueRows[1].message_or_query, /Confirm the listing mentions Chinese restaurants, 39 Miles, Square, Toast, Clover, MenuSifu, Chowbus, and POS-ready phone orders/);
assert.match(gtmQueueRows[1].tracker_command, /--status "live"/);
assert.strictEqual(gtmQueueRows[1].expected_lead_acquisition_channel, 'directory_or_listing');
assert.match(gtmQueueRows[2].message_or_query, /Chinese restaurants and takeout-heavy operators already using MenuSifu/);
assert.match(gtmQueueRows[2].evidence_needed, /submitted form confirmation/);
assert.strictEqual(gtmQueueRows[2].lead_priority, 'P0 POS-ready Chinese restaurant lead source');
assert.match(gtmQueueRows[2].lead_route, /MenuSifu/);
assert.strictEqual(gtmQueueRows[2].expected_lead_acquisition_channel, 'partner_referral');
assert.strictEqual(gtmQueueRows[5].lead_priority, 'P0 inbound restaurant-owner lead source');
assert.match(gtmQueueRows[5].lead_route, /Ask every inbound owner which POS system they use/);
assert.strictEqual(gtmQueueRows[5].expected_lead_acquisition_channel, 'business_profile');
assert.match(gtmQueueRows[4].next_step, /Import from Google only after Google Business Profile fields are accurate/);
assert.match(gtmQueueRows[4].next_step, /Use Bing Places website URL with utm_source=bing_places if accepted/);
assert.strictEqual(gtmQueueRows[4].expected_lead_acquisition_channel, 'business_profile');
assert.match(gtmQueueRows[3].next_step, /Add action link to the Chinese restaurant POS AI phone agent page/);
assert.match(gtmQueueRows[3].next_step, /Use 39 Miles AI phone ordering or MenuSifu AI phone ordering as the first POS-specific showcase/);
assert.strictEqual(gtmQueueRows[3].expected_lead_acquisition_channel, 'business_profile');
assert.match(gtmQueueRows[6].message_or_query, /"Pilot restaurant testimonial" "submit"/);
assert.match(gtmQueueRows[6].evidence_needed, /Published testimonial/);
assert.strictEqual(gtmQueueRows[6].lead_priority, 'P2 proof asset for conversion');
assert.strictEqual(gtmQueueRows[6].expected_lead_acquisition_channel, 'customer_proof');
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
assert.match(weeklyAuthoritySprint, /## Business Profile Field Mapping/);
assert.match(weeklyAuthoritySprint, /### Google Business Profile fields/);
assert.match(weeklyAuthoritySprint, /- Primary category: Software company/);
assert.match(weeklyAuthoritySprint, /- Website field: https:\/\/serviio\.ai\/ \(use clean URL if Google rejects UTM parameters\)/);
assert.match(weeklyAuthoritySprint, /### Bing Places for Business fields/);
assert.match(weeklyAuthoritySprint, /- Website field: https:\/\/serviio\.ai\/\?utm_source=bing_places&utm_medium=organic_listing&utm_campaign=free_search_marketing/);
assert.match(weeklyAuthoritySprint, /### Apple Business Connect fields/);
assert.match(weeklyAuthoritySprint, /- Action link: https:\/\/serviio\.ai\/chinese-restaurant-pos-ai-phone-agent\/\?utm_source=apple_business_connect/);
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
assert.match(weeklyAuthoritySprint, /Authority media kit: https:\/\/serviio\.ai\/authority-media-kit\//);
assert.match(weeklyAuthoritySprint, /Customer proof request: https:\/\/serviio\.ai\/customer-proof-request\//);
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
const firstHourExecutionRows = buildFirstHourAuthorityRows(trackerRows, { today: '2026-06-10' });
assert.deepStrictEqual(firstHourExecutionRows.map((row) => row.target), [
  'Google Business Profile',
  'MenuSifu restaurant consultants',
  '39 Miles restaurant consultants',
  'Pilot restaurant testimonial',
]);
assert.strictEqual(firstHourExecutionRows[0].position, 1);
assert.strictEqual(firstHourExecutionRows[0].action_type, 'submit_or_contact');
assert.match(firstHourExecutionRows[0].copy_paste_payload, /Serviio is an AI phone ordering system for restaurants/);
assert.match(firstHourExecutionRows[1].copy_paste_payload, /Chinese restaurants and takeout-heavy operators already using MenuSifu/);
assert.match(firstHourExecutionRows[2].copy_paste_payload, /already using 39 Miles/);
assert.match(firstHourExecutionRows[3].copy_paste_payload, /city, restaurant type, POS system, weekly phone-order volume/);
assert.match(firstHourExecutionRows[1].tracker_command, /--target "MenuSifu restaurant consultants" --status submitted --date 2026-06-10/);
assert.match(firstHourExecutionRows[3].proof_fields, /written customer approval note/);
assert.strictEqual(firstHourExecutionRows[0].projected_authority_delta, 7);
assert.strictEqual(firstHourExecutionRows[0].projected_authority_score, 13);
assert.strictEqual(firstHourExecutionRows[0].cumulative_authority_delta, 7);
assert.strictEqual(firstHourExecutionRows[0].cumulative_authority_score, 13);
assert.strictEqual(firstHourExecutionRows[1].projected_authority_delta, 8);
assert.strictEqual(firstHourExecutionRows[1].projected_authority_score, 14);
assert.strictEqual(firstHourExecutionRows[1].cumulative_authority_delta, 15);
assert.strictEqual(firstHourExecutionRows[1].cumulative_authority_score, 21);
assert.strictEqual(firstHourExecutionRows[2].projected_authority_delta, 8);
assert.strictEqual(firstHourExecutionRows[2].projected_authority_score, 14);
assert.strictEqual(firstHourExecutionRows[2].cumulative_authority_delta, 23);
assert.strictEqual(firstHourExecutionRows[2].cumulative_authority_score, 29);
assert.strictEqual(firstHourExecutionRows[3].projected_authority_delta, 18);
assert.strictEqual(firstHourExecutionRows[3].projected_authority_score, 24);
assert.strictEqual(firstHourExecutionRows[3].cumulative_authority_delta, 41);
assert.strictEqual(firstHourExecutionRows[3].cumulative_authority_score, 47);
const firstHourAuthorityCsv = firstHourAuthorityToCsv(firstHourExecutionRows);
assert.match(firstHourAuthorityCsv, /position,action_type,priority,channel,target,projected_authority_delta,projected_authority_score,cumulative_authority_delta,cumulative_authority_score,contact_url/);
assert.match(firstHourAuthorityCsv, /Google Business Profile/);
assert.match(firstHourAuthorityCsv, /MenuSifu AI phone ordering/);
assert.match(firstHourAuthorityCsv, /Pilot restaurant testimonial/);
assert.deepStrictEqual(parseFirstHourAuthorityArgs(['--today', '2026-06-10', '--out', 'docs/first-hour.csv']), {
  out: 'docs/first-hour.csv',
  today: '2026-06-10',
  help: false,
});
assert.throws(() => parseFirstHourAuthorityArgs(['--today', '06-10-2026']), /--today must use YYYY-MM-DD/);
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
const firstHourPreflightRows = buildEvidencePreflightRows(parseCsv(fs.readFileSync('docs/authority-first-hour-submission-log.csv', 'utf8')));
assert.deepStrictEqual(firstHourPreflightRows.map((row) => row.target), [
  'Google Business Profile',
  'MenuSifu restaurant consultants',
  '39 Miles restaurant consultants',
  'Pilot restaurant testimonial',
]);
assert.match(firstHourPreflightRows[0].required_fields.join(' '), /action_status/);
assert.match(firstHourPreflightRows[0].required_fields.join(' '), /submitted_date/);
assert.match(firstHourPreflightRows[0].required_fields.join(' '), /confirmation evidence/);
assert.match(firstHourPreflightRows[0].required_fields.join(' '), /follow_up_date/);
const firstHourPreflightReport = renderEvidencePreflightReport(firstHourPreflightRows);
assert.match(firstHourPreflightReport, /# Authority Evidence Preflight/);
assert.match(firstHourPreflightReport, /Rows ready for sync: 0/);
assert.match(firstHourPreflightReport, /Rows still pending evidence: 4/);
assert.match(firstHourPreflightReport, /Google Business Profile: set `action_status`, `submitted_date`, confirmation evidence, `follow_up_date`/);
assert.match(firstHourPreflightReport, /Checklist: Use clean homepage URL if Google rejects UTM parameters/);
assert.match(firstHourPreflightReport, /Checklist: Submit MenuSifu partner or demo form with Serviio POS-ready phone-order copy/);
assert.match(firstHourPreflightReport, /Checklist: Contact 39 Miles\/MENUPO using the official contact path/);
assert.match(firstHourPreflightReport, /Checklist: Send customer proof request link to a pilot, demo, or customer contact/);
assert.match(firstHourPreflightReport, /Pilot restaurant testimonial: set `action_status`, `submitted_date`, confirmation evidence, `follow_up_date`/);
const authorityCommandCenter = buildAuthorityCommandCenter({
  trackerRows,
  firstHourRows: firstHourExecutionRows,
  firstHourPreflightRows,
  liveListingPreflightRows: pendingLiveListingPreflight,
  today: '2026-06-21',
});
assert.match(authorityCommandCenter, /^# Serviio Authority Command Center/m);
assert.match(authorityCommandCenter, /Generated: 2026-06-21/);
assert.match(authorityCommandCenter, /Current authority score: 6\/100/);
assert.match(authorityCommandCenter, /First-hour projected score after ordered completion: 47\/100/);
assert.match(authorityCommandCenter, /First-hour projected delta: \+41/);
assert.match(authorityCommandCenter, /Google Business Profile \| 7 \| 13 \| 7 \| 13/);
assert.match(authorityCommandCenter, /Pilot restaurant testimonial \| 18 \| 24 \| 41 \| 47/);
assert.match(authorityCommandCenter, /## Immediate Execution Details/);
assert.match(authorityCommandCenter, /### 2\. MenuSifu restaurant consultants/);
assert.match(authorityCommandCenter, /- Contact URL: https:\/\/forms\.menusifu\.com\/pages\/demo-request/);
assert.match(authorityCommandCenter, /- Subject: AI phone ordering add-on for MenuSifu restaurants/);
assert.match(authorityCommandCenter, /- Proof fields: Partner reply, referral-page URL, submitted form confirmation, or sent-message URL\./);
assert.match(authorityCommandCenter, /npm run marketing:mark -- --target "MenuSifu restaurant consultants" --status submitted --date 2026-06-10/);
assert.match(authorityCommandCenter, /Rows ready for first-hour sync: 0\/4/);
assert.match(authorityCommandCenter, /Rows ready for live-listing sync: 0\/1/);
assert.match(authorityCommandCenter, /Product Hunt Serviio listing: set `action_status`, `completed_date`, `evidence_url` live URL, confirmation evidence/);
assert.match(authorityCommandCenter, /npm run marketing:submission-preflight:first-hour/);
assert.match(authorityCommandCenter, /npm run marketing:submission-sync -- --apply --log docs\/authority-first-hour-submission-log.csv/);
assert.match(authorityCommandCenter, /npm run marketing:live-listings-preflight/);
assert.match(authorityCommandCenter, /npm run marketing:live-listings-sync -- --apply/);
assert.deepStrictEqual(parseAuthorityCommandCenterArgs(['--today', '2026-06-21', '--out', 'docs/authority.md']), {
  out: 'docs/authority.md',
  today: '2026-06-21',
  help: false,
});
assert.throws(() => parseAuthorityCommandCenterArgs(['--today', '06-21-2026']), /--today must use YYYY-MM-DD/);
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
const businessProfileEvidenceRowsForSync = parseCsv(`profile_item_type,profile_platform,item_name,destination_url,evidence_url,account_or_login,screenshot_or_dashboard_confirmation,submitted_date,live_date,follow_up_date
profile_core,Google Business Profile,Serviio profile,https://serviio.ai/?utm_source=google_business_profile&utm_medium=organic_listing&utm_campaign=free_search_marketing,https://maps.google.com/?cid=serviio,info@serviio.ai,Verified Google dashboard screenshot,2026-06-10,2026-06-11,
product_card,Google Business Profile,39 Miles AI phone ordering,https://serviio.ai/pos/39-miles-ai-phone-ordering/?utm_source=business_profile_product&utm_medium=organic_listing&utm_campaign=free_search_marketing,https://maps.google.com/?cid=serviio-products,info@serviio.ai,Product card screenshot,2026-06-10,2026-06-11,
profile_core,Bing Places for Business,Serviio profile,https://serviio.ai/?utm_source=bing_places&utm_medium=organic_listing&utm_campaign=free_search_marketing,,info@serviio.ai,Bing dashboard submitted screenshot,2026-06-12,,2026-06-19
profile_core,Apple Business Connect,Serviio profile,https://serviio.ai/?utm_source=apple_business_connect&utm_medium=organic_listing&utm_campaign=free_search_marketing,,,Apple draft only,,,
`);
const profileEvidenceActions = buildProfileEvidenceSyncActions(businessProfileEvidenceRowsForSync, { today: '2026-06-12' });
assert.deepStrictEqual(profileEvidenceActions.map((action) => `${action.status}:${action.target}:${action.issues.length}`), [
  'live:Google Business Profile:0',
  'submitted:Bing Places for Business:0',
  'submitted:Apple Business Connect:2',
]);
assert.strictEqual(profileEvidenceActions[0].updateArgs.url, 'https://maps.google.com/?cid=serviio');
assert.match(profileEvidenceActions[0].updateArgs.note, /Business profile evidence: Serviio profile/);
assert.match(profileEvidenceActions[0].updateArgs.note, /Verified Google dashboard screenshot/);
assert.match(profileEvidenceActions[1].updateArgs.note, /Follow up: 2026-06-19/);
assert.deepStrictEqual(profileEvidenceActions[2].issues, [
  'missing submitted_date',
  'missing follow_up_date',
]);
const profilePreflightRows = buildProfileEvidencePreflightRows(businessProfileEvidenceRowsForSync);
assert.deepStrictEqual(profilePreflightRows.map((row) => `${row.profile_platform}:${row.ready_for_sync}`), [
  'Google Business Profile:true',
  'Bing Places for Business:true',
  'Apple Business Connect:false',
]);
const profilePreflightReport = renderProfileEvidencePreflightReport(profilePreflightRows);
assert.match(profilePreflightReport, /# Business Profile Evidence Preflight/);
assert.match(profilePreflightReport, /Rows ready for sync: 2/);
assert.match(profilePreflightReport, /Apple Business Connect: set `submitted_date`, `follow_up_date`/);
const profileSyncTracker = `priority,channel,target,url,status,owner,date_submitted,date_live,landing_url,utm_url,anchor_or_listing_phrase,notes
P0,Business profile,Google Business Profile,https://www.google.com/business/,not_started,,,,https://serviio.ai/,https://serviio.ai/?utm_source=google_business_profile&utm_medium=organic_listing&utm_campaign=free_search_marketing,AI phone ordering for restaurants,Profile setup.
P0,Business profile,Bing Places for Business,https://www.bingplaces.com/,not_started,,,,https://serviio.ai/,https://serviio.ai/?utm_source=bing_places&utm_medium=organic_listing&utm_campaign=free_search_marketing,Restaurant AI phone answering,Mirror Google listing details.
P0,Business profile,Apple Business Connect,https://businessconnect.apple.com/,not_started,,,,https://serviio.ai/,https://serviio.ai/?utm_source=apple_business_connect&utm_medium=organic_listing&utm_campaign=free_search_marketing,AI phone ordering for restaurants,Add action link.
`;
const profileSyncReport = renderProfileEvidenceSyncReport(profileEvidenceActions, { trackerText: profileSyncTracker });
assert.match(profileSyncReport, /# Business Profile Evidence Sync/);
assert.match(profileSyncReport, /Valid updates: 2/);
assert.match(profileSyncReport, /Rows with issues: 1/);
assert.match(profileSyncReport, /Projected business profiles started: 2 \(was 0, \+2\)/);
assert.match(profileSyncReport, /Projected live authority rows: 1 \(was 0, \+1\)/);
const syncedProfileTracker = applyProfileEvidenceActions(profileSyncTracker, profileEvidenceActions);
assert.match(syncedProfileTracker, /Google Business Profile,https:\/\/maps\.google\.com\/\?cid=serviio,live,Serviio,2026-06-10,2026-06-11/);
assert.match(syncedProfileTracker, /Bing Places for Business,https:\/\/www\.bingplaces\.com\/,submitted,Serviio,2026-06-12,/);
assert.match(syncedProfileTracker, /Apple Business Connect,https:\/\/businessconnect\.apple\.com\/,not_started/);
assert.deepStrictEqual(parseProfileEvidenceSyncArgs(['--apply', '--evidence-log', 'profile.csv', '--tracker', 'tracker.csv', '--out', 'out.csv', '--today', '2026-06-12']), {
  evidenceLog: 'profile.csv',
  tracker: 'tracker.csv',
  out: 'out.csv',
  today: '2026-06-12',
  apply: true,
  preflight: false,
  help: false,
});
assert.deepStrictEqual(parseProfileEvidenceSyncArgs(['--preflight']), {
  evidenceLog: 'docs/business-profile-evidence-log.csv',
  tracker: 'docs/free-search-marketing-tracker.csv',
  out: 'docs/free-search-marketing-tracker.csv',
  today: parseProfileEvidenceSyncArgs([]).today,
  apply: false,
  preflight: true,
  help: false,
});
assert.deepStrictEqual(parseSubmissionSyncArgs(['--apply', '--today', '2026-06-10', '--log', 'log.csv', '--tracker', 'tracker.csv', '--out', 'out.csv']), {
  log: 'log.csv',
  tracker: 'tracker.csv',
  out: 'out.csv',
  today: '2026-06-10',
  apply: true,
  preflight: false,
  help: false,
});
assert.deepStrictEqual(parseSubmissionSyncArgs(['--preflight', '--log', 'docs/authority-first-hour-submission-log.csv']), {
  log: 'docs/authority-first-hour-submission-log.csv',
  tracker: 'docs/free-search-marketing-tracker.csv',
  out: 'docs/free-search-marketing-tracker.csv',
  today: parseSubmissionSyncArgs([]).today,
  apply: false,
  preflight: true,
  help: false,
});
assert.deepStrictEqual(parseSubmissionSyncArgs(['--preflight', '--log', 'docs/authority-first-hour-submission-log.csv', '--out', 'docs/authority-evidence-preflight.md']), {
  log: 'docs/authority-first-hour-submission-log.csv',
  tracker: 'docs/free-search-marketing-tracker.csv',
  out: 'docs/authority-evidence-preflight.md',
  today: parseSubmissionSyncArgs([]).today,
  apply: false,
  preflight: true,
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
