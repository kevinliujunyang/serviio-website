(function () {
  var params = new URLSearchParams(window.location.search);
  var storageKey = 'serviio_attribution';
  var sessionKey = 'serviio_session_attribution';
  var now = new Date().toISOString();
  var currentAttribution = {
    current_page: window.location.href,
    current_path: window.location.pathname,
    referrer: document.referrer || '',
    utm_source: params.get('utm_source') || '',
    utm_medium: params.get('utm_medium') || '',
    utm_campaign: params.get('utm_campaign') || '',
    utm_term: params.get('utm_term') || '',
    utm_content: params.get('utm_content') || '',
    gclid: params.get('gclid') || '',
    msclkid: params.get('msclkid') || '',
  };
  var hasCampaignSignal = [
    'utm_source',
    'utm_medium',
    'utm_campaign',
    'utm_term',
    'utm_content',
    'gclid',
    'msclkid',
  ].some(function (name) {
    return Boolean(currentAttribution[name]);
  });

  function readStoredAttribution(key, persist) {
    if (persist) {
      try {
        return JSON.parse(window.localStorage.getItem(key) || 'null') || {};
      } catch (error) {
        // Fall back to session storage below.
      }
    }
    try {
      return JSON.parse(window.sessionStorage.getItem(key) || 'null') || {};
    } catch (error) {
      return {};
    }
  }

  function writeStoredAttribution(key, value, persist) {
    if (persist) {
      try {
        window.localStorage.setItem(key, JSON.stringify(value));
      } catch (error) {
        // Ignore private-mode or blocked-storage failures; session storage still helps.
      }
    }
    try {
      window.sessionStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      // Ignore private-mode or blocked-storage failures; current-page fields still submit.
    }
  }

  var firstTouch = readStoredAttribution(storageKey, true);
  if (!firstTouch.landing_page || hasCampaignSignal) {
    firstTouch = {
      landing_page: window.location.href,
      landing_path: window.location.pathname,
      first_referrer: document.referrer || firstTouch.first_referrer || '',
      first_utm_source: currentAttribution.utm_source || firstTouch.first_utm_source || '',
      first_utm_medium: currentAttribution.utm_medium || firstTouch.first_utm_medium || '',
      first_utm_campaign: currentAttribution.utm_campaign || firstTouch.first_utm_campaign || '',
      first_utm_term: currentAttribution.utm_term || firstTouch.first_utm_term || '',
      first_utm_content: currentAttribution.utm_content || firstTouch.first_utm_content || '',
      first_gclid: currentAttribution.gclid || firstTouch.first_gclid || '',
      first_msclkid: currentAttribution.msclkid || firstTouch.first_msclkid || '',
      first_seen_at: firstTouch.first_seen_at || now,
    };
    writeStoredAttribution(storageKey, firstTouch, true);
  }

  var sessionAttribution = readStoredAttribution(sessionKey);
  sessionAttribution.last_page = window.location.href;
  sessionAttribution.last_path = window.location.pathname;
  sessionAttribution.last_seen_at = now;
  writeStoredAttribution(sessionKey, sessionAttribution);

  var attributionFields = Object.assign({}, firstTouch, currentAttribution, sessionAttribution);

  function ensureHiddenField(form, name, value, overwrite) {
    var field = form.querySelector('input[name="' + name + '"]');
    if (!field) {
      field = document.createElement('input');
      field.type = 'hidden';
      field.name = name;
      form.appendChild(field);
    }
    if (overwrite || !field.value) field.value = value;
  }

  function fieldValue(form, name) {
    var field = form.querySelector('[name="' + name + '"]');
    return field ? String(field.value || field.getAttribute('value') || '').trim() : '';
  }

  function classifyPosReadiness(posSystem, posRecommendationInterest) {
    var pos = String(posSystem || '').toLowerCase();
    var recommendation = String(posRecommendationInterest || '').toLowerCase();
    var noPos = /no pos|none|without pos|暂时没有|没有 pos/.test(pos);
    var wantsPos = /yes|recommend|希望|需要/.test(recommendation);

    if (noPos && wantsPos) return 'pos_referral_candidate';
    if (noPos) return 'no_pos_nurture';
    if (pos) return 'pos_ready';
    return 'unknown_pos_status';
  }

  function leadRouteHint(posReadiness) {
    if (posReadiness === 'pos_ready') return 'serviio_demo';
    if (posReadiness === 'pos_referral_candidate') return 'pos_partner_referral';
    if (posReadiness === 'no_pos_nurture') return 'nurture_no_pos';
    return 'manual_review';
  }

  function monetizationRouteHint(posReadiness) {
    if (posReadiness === 'pos_ready') return 'serviio_demo';
    if (posReadiness === 'pos_referral_candidate') return 'pos_partner_referral';
    return 'unknown';
  }

  function recommendedPosPartnerTargets(posReadiness) {
    if (posReadiness !== 'pos_referral_candidate') return 'none';
    return 'chinese_restaurant_pos_consultants,39_miles,menusifu,chowbus,clover,square,toast';
  }

  function classifyLeadAcquisitionChannel(form) {
    var sourceText = [
      fieldValue(form, 'lead_source'),
      fieldValue(form, 'conversion_offer'),
      attributionFields.landing_page,
      attributionFields.landing_path,
      attributionFields.current_page,
      attributionFields.current_path,
      attributionFields.first_utm_source,
      attributionFields.first_utm_medium,
      attributionFields.first_utm_campaign,
      attributionFields.utm_source,
      attributionFields.utm_medium,
      attributionFields.utm_campaign,
      attributionFields.referrer,
      attributionFields.first_referrer,
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

  function enrichPosReadiness(form) {
    var posSystem = fieldValue(form, 'pos_system') || fieldValue(form, 'pos_status');
    var posRecommendationInterest = fieldValue(form, 'pos_recommendation_interest');
    var posReadiness = classifyPosReadiness(posSystem, posRecommendationInterest);

    ensureHiddenField(form, 'pos_readiness_signal', posReadiness, true);
    ensureHiddenField(form, 'lead_route_hint', leadRouteHint(posReadiness), true);
    ensureHiddenField(form, 'monetization_route_hint', monetizationRouteHint(posReadiness), true);
    ensureHiddenField(form, 'recommended_pos_partner_targets', recommendedPosPartnerTargets(posReadiness), true);
    ensureHiddenField(form, 'lead_acquisition_channel', classifyLeadAcquisitionChannel(form), true);
  }

  document.querySelectorAll('form[action*="formspree.io"]').forEach(function (form) {
    Object.keys(attributionFields).forEach(function (name) {
      ensureHiddenField(form, name, attributionFields[name]);
    });
    enrichPosReadiness(form);
    form.addEventListener('submit', function () {
      enrichPosReadiness(form);
    });
  });
})();
