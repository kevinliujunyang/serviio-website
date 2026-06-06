const assert = require('assert');
const {
  buildPosPartnerRows,
  parseArgs: parsePosPartnerExportArgs,
  toCsv: posPartnerToCsv,
} = require('./export-pos-partner-leads');
const { classifyPainSignal, hasKnownPos, scoreLead, summarize } = require('./score-formspree-leads');

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
assert.strictEqual(noPosReferral.serviio_fit_status, 'deprioritized_until_pos_ready');
assert.match(noPosReferral.partner_next_action, /POS partner lead/);
assert.match(noPosReferral.pos_partner_lead_package, /New Noodle Shop/);
assert.match(noPosReferral.pos_partner_lead_package, /San Jose, CA/);
assert.match(noPosReferral.pos_partner_lead_package, /76-150/);
assert.match(noPosReferral.pos_partner_lead_package, /Yes, I want POS recommendations/);
assert.match(noPosReferral.pos_partner_lead_package, /Within 1 month/);
assert.strictEqual(noPosReferral.pos_purchase_timeline, 'Within 1 month');
assert.match(noPosReferral.buyer_profile, /partner_referral:hot/);
assert.doesNotMatch(noPosReferral.lead_reason, /existing POS/);

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
  ambiguousPos,
]);
assert.deepStrictEqual(posPartnerExportRows.map((row) => row.restaurant_name), [
  'New Noodle Shop',
  'Small New Cafe',
]);
assert.strictEqual(posPartnerExportRows[0].pos_partner_lead_type, 'hot_no_pos_restaurant');
assert.strictEqual(posPartnerExportRows[0].serviio_fit_status, 'deprioritized_until_pos_ready');
assert.match(posPartnerExportRows[0].handoff_summary, /Restaurant: New Noodle Shop/);
assert.match(posPartnerExportRows[0].partner_next_action, /Package as POS partner lead/);
assert.strictEqual(posPartnerExportRows[1].pos_partner_lead_type, 'warm_no_pos_restaurant');

const posPartnerCsv = posPartnerToCsv(posPartnerExportRows);
assert.match(posPartnerCsv, /pos_partner_lead_type,partner_referral_priority,restaurant_name/);
assert.match(posPartnerCsv, /hot_no_pos_restaurant,hot,New Noodle Shop/);
assert.doesNotMatch(posPartnerCsv, /Golden Dragon Chinese Restaurant/);
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

console.log('Lead scoring tests passed');
