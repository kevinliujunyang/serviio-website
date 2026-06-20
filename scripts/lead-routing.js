function posSystemFor(row) {
  const text = `${row.target} ${row.anchor_or_listing_phrase} ${row.notes}`;
  return ['39 Miles', 'Square', 'Toast', 'Clover', 'MenuSifu', 'Chowbus', 'Mealkeyway']
    .find((system) => new RegExp(system.replace(/\s+/g, '\\s+'), 'i').test(text));
}

function leadPriority(row) {
  if (/POS-specific outreach/i.test(row.channel)) return 'P0 POS-ready Chinese restaurant lead source';
  if (/business profile/i.test(row.channel)) return 'P0 inbound restaurant-owner lead source';
  if (/customer proof/i.test(row.channel)) return 'P2 proof asset for conversion';
  if (/partner|consultant|association|chamber|community/i.test(`${row.channel} ${row.target}`)) return 'P1 partner/referral lead source';
  if (/directory|listing|startup/i.test(row.channel)) return 'P1 authority and discovery lead source';
  return 'P2 organic authority support';
}

function leadRoute(row) {
  const system = posSystemFor(row);
  if (/POS-specific outreach/i.test(row.channel) && system) {
    return `Route ${system} restaurant owners to a POS-specific demo; keep no-POS owners as POS partner referral prospects.`;
  }
  if (/business profile/i.test(row.channel)) {
    return 'Ask every inbound owner which POS system they use; prioritize POS-ready Chinese restaurants and keep no-POS owners for POS partner referral.';
  }
  if (/customer proof/i.test(row.channel)) {
    return 'Use proof in demos and profile/listing submissions to improve conversion from restaurant-owner traffic.';
  }
  if (/partner|consultant|association|chamber|community/i.test(`${row.channel} ${row.target}`)) {
    return 'Partner can refer POS-ready restaurants; keep no-POS owners as POS partner referral prospects.';
  }
  if (/directory|listing|startup/i.test(row.channel)) {
    return 'Route inbound directory leads to POS qualification before demo scheduling.';
  }
  return 'Qualify POS system, phone-order volume, language need, and demo readiness before follow-up.';
}

function primaryKpi(row) {
  if (/business profile/i.test(row.channel)) return 'verified profile plus POS-qualified inbound leads';
  if (/customer proof/i.test(row.channel)) return 'published proof URL';
  if (/partner|consultant|association|chamber|community/i.test(`${row.channel} ${row.target}`)) return 'partner reply, referral path, or sent-message evidence';
  if (/directory|listing|startup/i.test(row.channel)) return 'submitted listing or live backlink URL';
  return 'submission evidence and qualified lead source';
}

function leadAcquisitionChannel(row) {
  const sourceText = [
    row.channel,
    row.target,
    row.landing_url,
    row.utm_url,
    row.anchor_or_listing_phrase,
    row.notes,
  ].join(' ');

  if (/business[_\s-]?profile|google_business_profile|bing_places|apple_business_connect/i.test(sourceText)) return 'business_profile';
  if (/partner[_\s-]?referral|pos[_\s-]?consultant|restaurant[_\s-]?website[_\s-]?agency/i.test(sourceText)) return 'partner_referral';
  if (/customer[_\s-]?proof|testimonial/i.test(sourceText)) return 'customer_proof';
  if (/missed[_\s-]?call[_\s-]?revenue[_\s-]?calculator|restaurant-missed-call-revenue-calculator/i.test(sourceText)) return 'calculator';
  if (/directory|organic[_\s-]?listing|product_hunt|startup/i.test(sourceText)) return 'directory_or_listing';
  if (/community[_\s-]?post|wechat|reddit|meetup|chamber|association/i.test(sourceText)) return 'community_or_association';
  if (/search_console|indexing|indexnow|webmaster/i.test(sourceText)) return 'indexing_or_webmaster';
  if (/service[_\s-]?area|service-areas|chinese|pos|restaurant-ai|ai-phone|phone-order/i.test(sourceText)) return 'seo_landing_page';
  return 'direct_or_unknown';
}

module.exports = {
  leadAcquisitionChannel,
  leadPriority,
  leadRoute,
  posSystemFor,
  primaryKpi,
};
