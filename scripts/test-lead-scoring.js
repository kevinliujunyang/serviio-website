const assert = require('assert');
const fs = require('fs');
const {
  buildPosPartnerRows,
  parseArgs: parsePosPartnerExportArgs,
  toCsv: posPartnerToCsv,
} = require('./export-pos-partner-leads');
const {
  buildDemoQueueRows,
  parseArgs: parseDemoQueueExportArgs,
  toCsv: demoQueueToCsv,
} = require('./export-serviio-demo-leads');
const {
  buildCustomerProofRows,
  parseArgs: parseCustomerProofExportArgs,
  toCsv: customerProofToCsv,
} = require('./export-customer-proof-followups');
const {
  classifyPainSignal,
  classifyPhoneVolume,
  classifyPosPurchaseTimeline,
  parseCsv,
  hasKnownPos,
  scoreLead,
  summarize,
} = require('./score-formspree-leads');

function recordsFromCsv(text) {
  const rows = parseCsv(text);
  const headers = rows[0].map((header) => header.trim());
  return rows.slice(1).map((row) => Object.fromEntries(
    headers.map((header, index) => [header, row[index] || '']),
  ));
}

const baseLead = {
  restaurant: 'Golden Dragon Chinese Restaurant',
  name: 'Owner',
  email: 'owner@example.com',
  phone: '(408) 409-9079',
  restaurant_city: 'San Jose',
  restaurant_state: 'CA',
  lead_source: 'chinese_restaurant_pos_ai_phone_agent',
  landing_page: 'https://serviio.ai/chinese-restaurant-pos-ai-phone-agent/',
};

const highPriority = scoreLead({
  ...baseLead,
  pos_system: 'MenuSifu',
  pos_focus: 'MenuSifu',
  phone_orders_per_week: '150+',
  conversion_offer: 'pos_readiness_checklist',
  pos_recommendation_interest: 'Not applicable, I already have a POS',
});
assert.strictEqual(highPriority.lead_priority, 'high');
assert.strictEqual(highPriority.lead_route, 'call_now');
assert.strictEqual(highPriority.pos_readiness, 'pos_ready');
assert.strictEqual(highPriority.phone_volume_tier, 'high');
assert.strictEqual(highPriority.chinese_or_asian_intent, 'yes');
assert.strictEqual(highPriority.priority_seo_source, 'yes');
assert.strictEqual(highPriority.us_location_captured, 'yes');
assert.strictEqual(highPriority.monetization_route, 'serviio_demo');
assert.strictEqual(highPriority.partner_referral_priority, 'none');
assert.strictEqual(highPriority.pos_focus, 'MenuSifu');
assert.strictEqual(highPriority.conversion_offer, 'pos_readiness_checklist');
assert.match(highPriority.lead_reason, /existing POS/);
assert.match(highPriority.buyer_profile, /pos_ready/);
assert.match(highPriority.buyer_profile, /pos_focus:MenuSifu/);
assert.match(highPriority.buyer_profile, /offer:pos_readiness_checklist/);
assert.match(highPriority.buyer_profile, /source:chinese_restaurant_pos_ai_phone_agent/);

const otherPosLead = scoreLead({
  ...baseLead,
  restaurant: 'Busy Wok Asian Takeout',
  pos_system: 'Other POS',
  phone_orders_per_week: '76-150',
  pos_recommendation_interest: 'Not applicable, I already have a POS',
});
assert.strictEqual(otherPosLead.lead_priority, 'high');
assert.strictEqual(otherPosLead.lead_route, 'call_now');

const noPosReferral = scoreLead({
  ...baseLead,
  restaurant: 'New Noodle Shop',
  pos_system: 'No POS yet',
  phone_orders_per_week: '76-150',
  pos_recommendation_interest: 'Yes, I want POS recommendations',
  pos_purchase_timeline: 'Within 1 month',
});
assert.strictEqual(noPosReferral.lead_priority, 'nurture');
assert.strictEqual(noPosReferral.lead_route, 'pos_referral');
assert.strictEqual(noPosReferral.pos_readiness, 'pos_referral_candidate');
assert.strictEqual(noPosReferral.monetization_route, 'pos_partner_referral');
assert.strictEqual(noPosReferral.partner_referral_priority, 'hot');
assert.strictEqual(noPosReferral.pos_partner_lead_status, 'qualified_for_pos_partner');
assert.strictEqual(noPosReferral.pos_partner_lead_type, 'hot_no_pos_restaurant');
assert.match(noPosReferral.recommended_pos_partner_targets, /39 Miles/);
assert.match(noPosReferral.recommended_pos_partner_targets, /MenuSifu/);
assert.match(noPosReferral.recommended_pos_partner_targets, /Chowbus/);
assert.strictEqual(noPosReferral.serviio_fit_status, 'deprioritized_until_pos_ready');
assert.match(noPosReferral.partner_next_action, /POS partner lead/);
assert.match(noPosReferral.pos_partner_lead_package, /New Noodle Shop/);
assert.match(noPosReferral.pos_partner_lead_package, /San Jose, CA/);
assert.match(noPosReferral.pos_partner_lead_package, /76-150/);
assert.match(noPosReferral.pos_partner_lead_package, /Yes, I want POS recommendations/);
assert.match(noPosReferral.pos_partner_lead_package, /Within 1 month/);
assert.strictEqual(noPosReferral.pos_purchase_timeline, 'Within 1 month');
assert.strictEqual(noPosReferral.pos_purchase_timeline_urgency, 'urgent');
assert.match(noPosReferral.buyer_profile, /partner_referral:hot/);
assert.doesNotMatch(noPosReferral.lead_reason, /existing POS/);

const calculatorNoPosReferral = scoreLead({
  ...baseLead,
  restaurant: 'Calculator Noodle Shop',
  lead_source: 'restaurant_missed_call_revenue_calculator',
  landing_page: 'https://serviio.ai/restaurant-missed-call-revenue-calculator/',
  pos_system: 'No POS yet',
  phone_orders_per_week: '76-150',
  main_pain: 'Missed calls during rush',
  conversion_offer: 'ai_phone_order_fit_check',
  pos_recommendation_interest: 'Yes, I want POS recommendations',
  pos_purchase_timeline: 'Within 1 month',
  calculator_missed_calls_per_week: '40',
  calculator_order_rate_percent: '55',
  calculator_average_order_value: '32',
  calculator_recovery_rate_percent: '70',
  estimated_lost_orders: '22',
  estimated_lost_revenue: '$704',
  estimated_recoverable_revenue: '$493',
  estimated_serviio_fee: '$10',
});
assert.strictEqual(calculatorNoPosReferral.lead_route, 'pos_referral');
assert.strictEqual(calculatorNoPosReferral.partner_referral_priority, 'hot');

const warmNoPosReferral = scoreLead({
  ...baseLead,
  restaurant: 'Small New Cafe',
  restaurant_city: '',
  restaurant_state: '',
  lead_source: 'general_contact',
  landing_page: 'https://serviio.ai/',
  pos_system: 'No POS yet',
  phone_orders_per_week: 'Under 25',
  pos_recommendation_interest: 'Yes, I want POS recommendations',
  pos_purchase_timeline: 'Not sure yet',
});
assert.strictEqual(warmNoPosReferral.lead_route, 'pos_referral');
assert.strictEqual(warmNoPosReferral.monetization_route, 'pos_partner_referral');
assert.strictEqual(warmNoPosReferral.partner_referral_priority, 'warm');
assert.strictEqual(warmNoPosReferral.pos_partner_lead_status, 'qualified_for_pos_partner');
assert.strictEqual(warmNoPosReferral.pos_partner_lead_type, 'warm_no_pos_restaurant');
assert.strictEqual(warmNoPosReferral.pos_purchase_timeline, 'Not sure yet');
assert.strictEqual(warmNoPosReferral.pos_purchase_timeline_urgency, 'unknown');

const urgentTimelineNoPosReferral = scoreLead({
  ...baseLead,
  restaurant: 'Fast POS Dumpling',
  restaurant_city: 'Fremont',
  restaurant_state: 'CA',
  lead_source: 'general_contact',
  landing_page: 'https://serviio.ai/',
  pos_system: 'No POS yet',
  phone_orders_per_week: 'Under 25',
  pos_recommendation_interest: 'Yes, I want POS recommendations',
  pos_purchase_timeline: 'Immediately',
});
assert.strictEqual(urgentTimelineNoPosReferral.lead_route, 'pos_referral');
assert.strictEqual(urgentTimelineNoPosReferral.partner_referral_priority, 'hot');
assert.strictEqual(urgentTimelineNoPosReferral.pos_purchase_timeline_urgency, 'urgent');
assert.match(urgentTimelineNoPosReferral.partner_next_action, /timeline/);
assert.match(urgentTimelineNoPosReferral.lead_reason, /urgent POS purchase timeline/);
assert.match(urgentTimelineNoPosReferral.buyer_profile, /pos_timeline_urgency:urgent/);
assert.match(urgentTimelineNoPosReferral.pos_partner_lead_package, /POS buying timeline: Immediately \(urgent\)/);
assert.strictEqual(classifyPosPurchaseTimeline('Within 1 month'), 'urgent');
assert.strictEqual(classifyPosPurchaseTimeline('1-3 months'), 'near_term');
assert.strictEqual(classifyPosPurchaseTimeline('Not sure yet'), 'unknown');

const ambiguousPos = scoreLead({
  ...baseLead,
  restaurant: 'Planning Cafe',
  pos_system: 'Considering a POS',
  phone_orders_per_week: '25-75',
  pos_recommendation_interest: 'Maybe later',
});
assert.strictEqual(ambiguousPos.lead_route, 'manual_review');
assert.strictEqual(ambiguousPos.pos_readiness, 'unknown_pos_status');
assert.strictEqual(ambiguousPos.phone_volume_tier, 'medium');
assert.strictEqual(hasKnownPos('Considering a POS'), false);
assert.strictEqual(hasKnownPos('I use a local POS'), true);
assert.strictEqual(classifyPhoneVolume('Under 25'), 'low');
assert.strictEqual(classifyPhoneVolume('Less than 25'), 'low');
assert.strictEqual(classifyPhoneVolume('少于 25 单'), 'low');
assert.strictEqual(classifyPhoneVolume('25-75'), 'medium');
assert.strictEqual(classifyPhoneVolume('25-75 单'), 'medium');
assert.strictEqual(classifyPhoneVolume('76-150 单'), 'high');
assert.strictEqual(classifyPhoneVolume('150 单以上'), 'high');

const localPosFitDemo = scoreLead({
  ...baseLead,
  restaurant: 'Boston Wok',
  restaurant_city: 'Boston',
  restaurant_state: 'MA',
  lead_source: 'general_contact',
  landing_page: 'https://serviio.ai/service-areas/boston-restaurant-ai-phone-ordering/',
  pos_system: 'Clover',
  phone_orders_per_week: '25-75',
  conversion_offer: 'local_pos_fit_check',
  pos_recommendation_interest: 'Not applicable, I already have a POS',
});
assert.strictEqual(localPosFitDemo.lead_priority, 'medium');
assert.strictEqual(localPosFitDemo.lead_route, 'demo_queue');
assert.strictEqual(localPosFitDemo.priority_seo_source, 'yes');
assert.match(localPosFitDemo.lead_reason, /priority SEO source/);
assert.match(localPosFitDemo.buyer_profile, /offer:local_pos_fit_check/);

const localPosFitReferral = scoreLead({
  ...baseLead,
  restaurant: 'Philadelphia Dumpling House',
  restaurant_city: 'Philadelphia',
  restaurant_state: 'PA',
  lead_source: 'general_contact',
  landing_page: 'https://serviio.ai/service-areas/philadelphia-restaurant-ai-phone-ordering/',
  pos_system: 'No POS yet',
  phone_orders_per_week: '76-150',
  conversion_offer: 'local_pos_fit_check',
  pos_recommendation_interest: 'Yes, I want POS recommendations',
});
assert.strictEqual(localPosFitReferral.lead_route, 'pos_referral');
assert.strictEqual(localPosFitReferral.partner_referral_priority, 'hot');
assert.strictEqual(localPosFitReferral.priority_seo_source, 'yes');
assert.match(localPosFitReferral.buyer_profile, /partner_referral:hot/);

const homepagePosFitDemo = scoreLead({
  ...baseLead,
  restaurant: 'Homepage POS Fit Bistro',
  restaurant_city: 'San Francisco',
  restaurant_state: 'CA',
  lead_source: 'homepage',
  landing_page: 'https://serviio.ai/',
  pos_system: 'Toast',
  phone_orders_per_week: '76-150',
  conversion_offer: 'homepage_pos_fit_check',
  pos_recommendation_interest: 'Not applicable, I already have a POS',
  pos_purchase_timeline: 'Not applicable, I already have a POS',
});
assert.strictEqual(homepagePosFitDemo.lead_priority, 'high');
assert.strictEqual(homepagePosFitDemo.lead_route, 'call_now');
assert.strictEqual(homepagePosFitDemo.priority_seo_source, 'yes');
assert.strictEqual(homepagePosFitDemo.pos_partner_lead_status, 'not_partner_referral');
assert.strictEqual(homepagePosFitDemo.serviio_fit_status, 'serviio_demo_fit');
assert.match(homepagePosFitDemo.buyer_profile, /offer:homepage_pos_fit_check/);
assert.match(homepagePosFitDemo.lead_reason, /priority SEO source/);

const namedPosOfferDemo = scoreLead({
  ...baseLead,
  restaurant: 'POS Offer Bistro',
  lead_source: 'general_contact',
  landing_page: 'https://serviio.ai/pos/square-ai-phone-ordering/',
  pos_system: 'Square',
  phone_orders_per_week: 'Under 25',
  conversion_offer: 'named_pos_fit_check',
  pos_recommendation_interest: 'Not applicable, I already have a POS',
});
assert.strictEqual(namedPosOfferDemo.lead_priority, 'medium');
assert.strictEqual(namedPosOfferDemo.lead_route, 'demo_queue');
assert.strictEqual(namedPosOfferDemo.priority_seo_source, 'yes');
assert.match(namedPosOfferDemo.buyer_profile, /offer:named_pos_fit_check/);

const posRecommendationOfferReferral = scoreLead({
  ...baseLead,
  restaurant: 'POS Recommendation Noodle Shop',
  lead_source: 'general_contact',
  landing_page: 'https://serviio.ai/best-pos-for-chinese-restaurant-phone-orders/',
  pos_system: 'No POS yet',
  phone_orders_per_week: '25-75',
  conversion_offer: 'pos_recommendation_fit_check',
  pos_recommendation_interest: 'Yes, I want POS recommendations',
});
assert.strictEqual(posRecommendationOfferReferral.lead_route, 'pos_referral');
assert.strictEqual(posRecommendationOfferReferral.partner_referral_priority, 'hot');
assert.strictEqual(posRecommendationOfferReferral.priority_seo_source, 'yes');
assert.match(posRecommendationOfferReferral.buyer_profile, /offer:pos_recommendation_fit_check/);

const partnerInquiry = scoreLead({
  ...baseLead,
  restaurant: 'Restaurant Tech Partner',
  restaurant_city: 'New York',
  restaurant_state: 'NY',
  lead_source: 'restaurant_pos_partner_referral',
  landing_page: 'https://serviio.ai/restaurant-pos-partner-referral/',
  pos_system: 'Multiple POS systems',
  phone_orders_per_week: '76-150',
  main_pain: 'Our restaurant clients miss calls during rush and need less manual POS entry.',
  conversion_offer: 'pos_recommendation_fit_check',
  pos_recommendation_interest: 'Yes, route no-POS leads for POS recommendations',
});
assert.strictEqual(partnerInquiry.lead_priority, 'medium');
assert.strictEqual(partnerInquiry.lead_route, 'partner_pipeline');
assert.strictEqual(partnerInquiry.partner_inquiry, 'yes');
assert.strictEqual(partnerInquiry.monetization_route, 'partner_relationship');
assert.strictEqual(partnerInquiry.partner_referral_priority, 'strategic');
assert.match(partnerInquiry.recommended_pos_partner_targets, /POS consultants/);
assert.match(partnerInquiry.recommended_pos_partner_targets, /MenuSifu/);
assert.match(partnerInquiry.lead_next_action, /partner\/referral opportunity/);
assert.match(partnerInquiry.partner_next_action, /referral economics/);
assert.match(partnerInquiry.lead_reason, /partner\/referral inquiry/);
assert.match(partnerInquiry.buyer_profile, /partner_referral:strategic/);

const posIntegrationOfferDemo = scoreLead({
  ...baseLead,
  restaurant: 'Integration Test Kitchen',
  lead_source: 'general_contact',
  landing_page: 'https://serviio.ai/guides/connect-phone-orders-to-pos/',
  pos_system: 'Other POS',
  phone_orders_per_week: 'Under 25',
  conversion_offer: 'pos_integration_fit_check',
  pos_recommendation_interest: 'Not applicable, I already have a POS',
});
assert.strictEqual(posIntegrationOfferDemo.lead_priority, 'medium');
assert.strictEqual(posIntegrationOfferDemo.lead_route, 'demo_queue');
assert.match(posIntegrationOfferDemo.buyer_profile, /offer:pos_integration_fit_check/);

const aiPhoneOrderOfferDemo = scoreLead({
  ...baseLead,
  restaurant: 'General Restaurant',
  lead_source: 'general_contact',
  landing_page: 'https://serviio.ai/restaurant-ai-assistant/',
  pos_system: 'Clover',
  phone_orders_per_week: 'Under 25',
  conversion_offer: 'ai_phone_order_fit_check',
  pos_recommendation_interest: 'Not applicable, I already have a POS',
});
assert.strictEqual(aiPhoneOrderOfferDemo.lead_priority, 'medium');
assert.strictEqual(aiPhoneOrderOfferDemo.lead_route, 'demo_queue');
assert.match(aiPhoneOrderOfferDemo.buyer_profile, /offer:ai_phone_order_fit_check/);

const urgentPainDemo = scoreLead({
  ...baseLead,
  restaurant: 'Rush Hour Dumpling',
  pos_system: 'Toast',
  phone_orders_per_week: '25-75',
  main_pain: 'We miss calls during dinner rush and staff re-enter phone orders into POS.',
  pos_recommendation_interest: 'Not applicable, I already have a POS',
});
assert.strictEqual(urgentPainDemo.lead_priority, 'high');
assert.strictEqual(urgentPainDemo.lead_route, 'call_now');
assert.strictEqual(urgentPainDemo.pain_signal, 'missed_calls+rush_hour+manual_entry');
assert.strictEqual(urgentPainDemo.urgent_pain_signal, 'yes');
assert.match(urgentPainDemo.lead_reason, /urgent pain: missed_calls\+rush_hour\+manual_entry/);
assert.match(urgentPainDemo.buyer_profile, /pain:missed_calls\+rush_hour\+manual_entry/);

const urgentNoPosReferral = scoreLead({
  ...baseLead,
  restaurant: 'Late Night Noodle',
  pos_system: 'No POS yet',
  phone_orders_per_week: 'Under 25',
  main_pain: 'Customers call after hours and leave voicemail orders.',
  pos_recommendation_interest: 'Yes, I want POS recommendations',
});
assert.strictEqual(urgentNoPosReferral.lead_route, 'pos_referral');
assert.strictEqual(urgentNoPosReferral.partner_referral_priority, 'hot');
assert.strictEqual(urgentNoPosReferral.urgent_pain_signal, 'yes');

const calculatorDemoLead = scoreLead({
  ...baseLead,
  restaurant: 'Calculator Wok',
  lead_source: 'restaurant_missed_call_revenue_calculator',
  landing_page: 'https://serviio.ai/restaurant-missed-call-revenue-calculator/',
  pos_system: 'Toast',
  phone_orders_per_week: '76-150',
  main_pain: 'Missed calls during rush',
  conversion_offer: 'ai_phone_order_fit_check',
  pos_recommendation_interest: 'Not applicable, I already have a POS',
  pos_purchase_timeline: 'Not applicable, I already have a POS',
  calculator_missed_calls_per_week: '40',
  calculator_order_rate_percent: '55',
  calculator_average_order_value: '32',
  calculator_recovery_rate_percent: '70',
  estimated_lost_orders: '22',
  estimated_lost_revenue: '$704',
  estimated_recoverable_revenue: '$493',
  estimated_serviio_fee: '$10',
});
assert.strictEqual(calculatorDemoLead.lead_route, 'call_now');
assert.strictEqual(calculatorDemoLead.estimated_recoverable_revenue, '$493');

assert.strictEqual(classifyPainSignal('Need Mandarin and Cantonese call handling'), 'bilingual_calls');
assert.strictEqual(classifyPainSignal('General question'), 'other');
assert.strictEqual(classifyPainSignal(''), 'unknown');

const summary = summarize([highPriority, otherPosLead, noPosReferral, ambiguousPos]);
assert.match(summary, /Qualified POS partner leads: 1/);
assert.match(summary, /Hot POS partner referrals: 1/);
assert.match(summary, /High priority: 2/);
assert.match(summary, /POS referral route: 1/);
assert.match(summary, /Manual review route: 1/);

const partnerSummary = summarize([partnerInquiry]);
assert.match(partnerSummary, /Partner pipeline route: 1/);
assert.match(partnerSummary, /Strategic partner inquiries: 1/);

const posPartnerExportRows = buildPosPartnerRows([
  highPriority,
  warmNoPosReferral,
  noPosReferral,
  calculatorNoPosReferral,
  urgentTimelineNoPosReferral,
  ambiguousPos,
]);
assert.deepStrictEqual(posPartnerExportRows.map((row) => row.restaurant_name), [
  'New Noodle Shop',
  'Calculator Noodle Shop',
  'Fast POS Dumpling',
  'Small New Cafe',
]);
assert.strictEqual(posPartnerExportRows[0].pos_partner_lead_type, 'hot_no_pos_restaurant');
assert.match(posPartnerExportRows[0].recommended_pos_partner_targets, /39 Miles/);
assert.match(posPartnerExportRows[0].recommended_pos_partner_targets, /MenuSifu/);
assert.match(posPartnerExportRows[0].pos_partner_pitch, /New Noodle Shop/);
assert.match(posPartnerExportRows[0].pos_partner_pitch, /San Jose, CA/);
assert.match(posPartnerExportRows[0].pos_partner_pitch, /76-150 weekly phone orders/);
assert.match(posPartnerExportRows[0].pos_partner_pitch, /39 Miles \| MenuSifu/);
assert.strictEqual(posPartnerExportRows[0].serviio_fit_status, 'deprioritized_until_pos_ready');
assert.strictEqual(posPartnerExportRows[0].pos_purchase_timeline_urgency, 'urgent');
assert.match(posPartnerExportRows[0].handoff_summary, /Restaurant: New Noodle Shop/);
assert.match(posPartnerExportRows[0].partner_next_action, /Package as POS partner lead/);
const calculatorPosPartnerRow = posPartnerExportRows.find((row) => row.restaurant_name === 'Calculator Noodle Shop');
assert.ok(calculatorPosPartnerRow);
assert.strictEqual(calculatorPosPartnerRow.estimated_recoverable_revenue, '$493');
assert.strictEqual(posPartnerExportRows[3].pos_partner_lead_type, 'warm_no_pos_restaurant');
assert.strictEqual(posPartnerExportRows[2].pos_purchase_timeline_urgency, 'urgent');

const posPartnerCsv = posPartnerToCsv(posPartnerExportRows);
assert.match(posPartnerCsv, /pos_recommendation_interest,pos_purchase_timeline,pos_purchase_timeline_urgency/);
assert.match(posPartnerCsv, /recommended_pos_partner_targets/);
assert.match(posPartnerCsv, /pos_partner_pitch/);
assert.match(posPartnerCsv, /calculator_missed_calls_per_week,calculator_order_rate_percent,calculator_average_order_value,calculator_recovery_rate_percent/);
assert.match(posPartnerCsv, /Calculator Noodle Shop/);
assert.match(posPartnerCsv, /\$493/);
assert.match(posPartnerCsv, /\$10/);
assert.match(posPartnerCsv, /hot_no_pos_restaurant,hot,Fast POS Dumpling/);
assert.doesNotMatch(posPartnerCsv, /Golden Dragon Chinese Restaurant/);

const demoQueueRows = buildDemoQueueRows([
  highPriority,
  localPosFitDemo,
  namedPosOfferDemo,
  calculatorDemoLead,
  noPosReferral,
  partnerInquiry,
  ambiguousPos,
]);
assert.deepStrictEqual(demoQueueRows.map((row) => row.restaurant_name), [
  'Golden Dragon Chinese Restaurant',
  'Calculator Wok',
  'Boston Wok',
  'POS Offer Bistro',
]);
assert.strictEqual(demoQueueRows[0].lead_route, 'call_now');
assert.strictEqual(demoQueueRows[0].demo_priority, 'call_now');
assert.match(demoQueueRows[0].call_script, /Confirm they still use MenuSifu/);
assert.match(demoQueueRows[0].call_script, /150\+/);
assert.match(demoQueueRows[0].call_script, /2% per completed order/);
assert.strictEqual(demoQueueRows[1].demo_priority, 'call_now');
assert.strictEqual(demoQueueRows[2].demo_priority, 'demo_queue');
const demoQueueCsv = demoQueueToCsv(demoQueueRows);
assert.match(demoQueueCsv, /demo_priority,lead_priority,lead_route,restaurant_name/);
assert.match(demoQueueCsv, /call_now,high,call_now,Golden Dragon Chinese Restaurant/);
assert.match(demoQueueCsv, /calculator_missed_calls_per_week,calculator_order_rate_percent,calculator_average_order_value,calculator_recovery_rate_percent/);
assert.match(demoQueueCsv, /Calculator Wok/);
assert.match(demoQueueCsv, /\$493/);
assert.match(demoQueueCsv, /\$10/);
assert.doesNotMatch(demoQueueCsv, /New Noodle Shop/);
assert.doesNotMatch(demoQueueCsv, /Restaurant Tech Partner/);

const customerProofRows = buildCustomerProofRows([
  highPriority,
  localPosFitDemo,
  namedPosOfferDemo,
  noPosReferral,
  partnerInquiry,
  ambiguousPos,
]);
assert.deepStrictEqual(customerProofRows.map((row) => row.restaurant_name), [
  'Golden Dragon Chinese Restaurant',
  'Boston Wok',
  'POS Offer Bistro',
]);
assert.strictEqual(customerProofRows[0].proof_priority, 'P0');
assert.strictEqual(customerProofRows[1].proof_priority, 'P1');
assert.strictEqual(customerProofRows[0].proof_request_url, 'https://serviio.ai/customer-proof-request/');
assert.strictEqual(customerProofRows[0].authority_tracker_target, 'Pilot restaurant testimonial');
assert.match(customerProofRows[0].proof_angle, /San Jose, CA/);
assert.match(customerProofRows[0].proof_angle, /MenuSifu/);
assert.match(customerProofRows[0].suggested_message, /customer-proof-request/);
assert.match(customerProofRows[0].authority_tracker_note, /Golden Dragon Chinese Restaurant/);
const customerProofCsv = customerProofToCsv(customerProofRows);
assert.match(customerProofCsv, /proof_priority,restaurant_name,restaurant_city/);
assert.match(customerProofCsv, /Pilot restaurant testimonial/);
assert.doesNotMatch(customerProofCsv, /New Noodle Shop/);
assert.deepStrictEqual(parseDemoQueueExportArgs(['formspree.csv', '--out', 'demo-leads.csv']), {
  input: 'formspree.csv',
  out: 'demo-leads.csv',
  summaryOnly: false,
});
assert.deepStrictEqual(parseDemoQueueExportArgs(['formspree.csv', '--summary-only']), {
  input: 'formspree.csv',
  out: '',
  summaryOnly: true,
});
assert.deepStrictEqual(parsePosPartnerExportArgs(['formspree.csv', '--out', 'pos-partner.csv']), {
  input: 'formspree.csv',
  out: 'pos-partner.csv',
  summaryOnly: false,
});
assert.deepStrictEqual(parsePosPartnerExportArgs(['formspree.csv', '--summary-only']), {
  input: 'formspree.csv',
  out: '',
  summaryOnly: true,
});
assert.deepStrictEqual(parseCustomerProofExportArgs(['formspree.csv', '--out', 'proof.csv']), {
  input: 'formspree.csv',
  out: 'proof.csv',
  summaryOnly: false,
});
assert.deepStrictEqual(parseCustomerProofExportArgs(['formspree.csv', '--summary-only']), {
  input: 'formspree.csv',
  out: '',
  summaryOnly: true,
});

const sampleLeadRecords = recordsFromCsv(fs.readFileSync('docs/sample-formspree-leads.csv', 'utf8'));
const sampleScoredRows = sampleLeadRecords.map(scoreLead);
assert.strictEqual(sampleScoredRows.length, 5);
assert.deepStrictEqual(buildDemoQueueRows(sampleScoredRows).map((row) => row.restaurant_name), [
  'Golden Dragon Chinese Restaurant',
  'Boston Wok',
]);
assert.deepStrictEqual(buildPosPartnerRows(sampleScoredRows).map((row) => row.restaurant_name), [
  'New Noodle Shop',
  'Fast POS Dumpling',
]);
assert.deepStrictEqual(buildCustomerProofRows(sampleScoredRows).map((row) => row.restaurant_name), [
  'Golden Dragon Chinese Restaurant',
  'Boston Wok',
]);
assert.strictEqual(sampleScoredRows.find((row) => row.restaurant_name === 'Restaurant Tech Partner').lead_route, 'partner_pipeline');
assert.match(summarize(sampleScoredRows), /Serviio demo|Lead scoring summary/);
assert.ok(fs.readFileSync('docs/sample-scored-leads.csv', 'utf8').includes('pos_purchase_timeline_urgency'));
assert.ok(fs.readFileSync('docs/sample-demo-leads.csv', 'utf8').includes('call_script'));
assert.ok(fs.readFileSync('docs/sample-pos-partner-leads.csv', 'utf8').includes('handoff_summary'));
assert.ok(fs.readFileSync('docs/sample-customer-proof-followups.csv', 'utf8').includes('proof_request_url'));

console.log('Lead scoring tests passed');
