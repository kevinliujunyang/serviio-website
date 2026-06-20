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

  function readStoredAttribution(key) {
    try {
      return JSON.parse(window.sessionStorage.getItem(key) || 'null') || {};
    } catch (error) {
      return {};
    }
  }

  function writeStoredAttribution(key, value) {
    try {
      window.sessionStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      // Ignore private-mode or blocked-storage failures; current-page fields still submit.
    }
  }

  var firstTouch = readStoredAttribution(storageKey);
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
    writeStoredAttribution(storageKey, firstTouch);
  }

  var sessionAttribution = readStoredAttribution(sessionKey);
  sessionAttribution.last_page = window.location.href;
  sessionAttribution.last_path = window.location.pathname;
  sessionAttribution.last_seen_at = now;
  writeStoredAttribution(sessionKey, sessionAttribution);

  var attributionFields = Object.assign({}, firstTouch, currentAttribution, sessionAttribution);

  function ensureHiddenField(form, name, value) {
    var field = form.querySelector('input[name="' + name + '"]');
    if (!field) {
      field = document.createElement('input');
      field.type = 'hidden';
      field.name = name;
      form.appendChild(field);
    }
    if (!field.value) field.value = value;
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

  function enrichPosReadiness(form) {
    var posSystem = fieldValue(form, 'pos_system') || fieldValue(form, 'pos_status');
    var posRecommendationInterest = fieldValue(form, 'pos_recommendation_interest');
    var posReadiness = classifyPosReadiness(posSystem, posRecommendationInterest);

    ensureHiddenField(form, 'pos_readiness_signal', posReadiness);
    ensureHiddenField(form, 'lead_route_hint', leadRouteHint(posReadiness));
    ensureHiddenField(form, 'monetization_route_hint', monetizationRouteHint(posReadiness));
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
