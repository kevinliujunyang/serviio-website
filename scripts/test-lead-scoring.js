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
  pos_recommendation_interest: 'Not applicable, I already have a POS',
});
assert.strictEqual(highPriority.lead_priority, 'high');
assert.strictEqual(highPriority.lead_route, 'call_now');
assert.strictEqual(highPriority.pos_readiness, 'pos_ready');
assert.strictEqual(highPriority.phone_volume_tier, 'high');
assert.strictEqual(highPriority.chinese_or_asian_intent, 'yes');
assert.strictEqual(highPriority.priority_seo_source, 'yes');
assert.strictEqual(highPriority.us_location_captured, 'yes');
assert.strictEqual(highPriority.pos_focus, 'MenuSifu');
assert.match(highPriority.lead_reason, /existing POS/);
assert.match(highPriority.buyer_profile, /pos_ready/);
assert.match(highPriority.buyer_profile, /pos_focus:MenuSifu/);
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
assert.doesNotMatch(noPosReferral.lead_reason, /existing POS/);

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

const summary = summarize([highPriority, otherPosLead, noPosReferral, ambiguousPos]);
assert.match(summary, /High priority: 2/);
assert.match(summary, /POS referral route: 1/);
assert.match(summary, /Manual review route: 1/);

console.log('Lead scoring tests passed');
