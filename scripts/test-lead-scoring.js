const assert = require('assert');
const { hasKnownPos, scoreLead, summarize } = require('./score-formspree-leads');

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
});
assert.strictEqual(noPosReferral.lead_priority, 'nurture');
assert.strictEqual(noPosReferral.lead_route, 'pos_referral');
assert.strictEqual(noPosReferral.pos_readiness, 'pos_referral_candidate');
assert.strictEqual(noPosReferral.monetization_route, 'pos_partner_referral');
assert.strictEqual(noPosReferral.partner_referral_priority, 'hot');
assert.match(noPosReferral.partner_next_action, /POS partner lead/);
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
});
assert.strictEqual(warmNoPosReferral.lead_route, 'pos_referral');
assert.strictEqual(warmNoPosReferral.monetization_route, 'pos_partner_referral');
assert.strictEqual(warmNoPosReferral.partner_referral_priority, 'warm');

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
});
assert.strictEqual(homepagePosFitDemo.lead_priority, 'high');
assert.strictEqual(homepagePosFitDemo.lead_route, 'call_now');
assert.strictEqual(homepagePosFitDemo.priority_seo_source, 'yes');
assert.match(homepagePosFitDemo.buyer_profile, /offer:homepage_pos_fit_check/);
assert.match(homepagePosFitDemo.lead_reason, /priority SEO source/);

const summary = summarize([highPriority, otherPosLead, noPosReferral, ambiguousPos]);
assert.match(summary, /Hot POS partner referrals: 1/);
assert.match(summary, /High priority: 2/);
assert.match(summary, /POS referral route: 1/);
assert.match(summary, /Manual review route: 1/);

console.log('Lead scoring tests passed');
