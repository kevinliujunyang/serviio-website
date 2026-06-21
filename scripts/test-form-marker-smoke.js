const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
const {
  buildMarkerFailures,
  requiredMarkerGroups,
  requiredMarkers,
  resolveBaseUrl,
} = require('./form-marker-smoke');

const completeHtml = `
<form>
  <input name="restaurant_city">
  <input name="restaurant_state">
  <select name="pos_system"></select>
  <select name="phone_orders_per_week"></select>
  <select name="main_pain"></select>
  <select name="pos_recommendation_interest"></select>
  <select name="pos_purchase_timeline"></select>
</form>
`;

assert.deepStrictEqual(buildMarkerFailures(completeHtml), []);

const posStatusHtml = completeHtml
  .replace('name="pos_system"', 'name="pos_status"');
assert.deepStrictEqual(buildMarkerFailures(posStatusHtml), []);

assert.deepStrictEqual(
  buildMarkerFailures('<form><select name="main_pain"></select></form>'),
  [
    'missing name="restaurant_city"',
    'missing name="restaurant_state"',
    'missing name="pos_system" or name="pos_status"',
    'missing name="phone_orders_per_week"',
    'missing name="pos_recommendation_interest"',
    'missing name="pos_purchase_timeline"',
  ],
);

assert.ok(requiredMarkers.includes('name="pos_system"'));
assert.ok(requiredMarkerGroups.some((group) => group.includes('name="pos_system"') && group.includes('name="pos_status"')));
assert.ok(requiredMarkers.includes('name="phone_orders_per_week"'));
assert.ok(requiredMarkers.includes('name="pos_recommendation_interest"'));
assert.strictEqual(resolveBaseUrl('https://serviio.ai/'), 'https://serviio.ai');
assert.strictEqual(resolveBaseUrl(), 'https://serviio.ai');

const attributionScript = fs.readFileSync('assets/js/form-attribution.js', 'utf8');
for (const snippet of [
  'pos_readiness_signal',
  'lead_route_hint',
  'monetization_route_hint',
  'recommended_pos_partner_targets',
  'lead_acquisition_channel',
  'directory_or_listing',
  'pos_referral_candidate',
  'serviio_demo',
  'pos_partner_consent',
]) {
  assert.ok(attributionScript.includes(snippet), `form-attribution.js missing ${snippet}`);
}

function createField(name, value = '') {
  return {
    name,
    value,
    type: '',
    id: '',
    className: '',
    required: false,
    textContent: '',
    children: [],
    parentNode: null,
    getAttribute(attribute) {
      if (attribute === 'value') return this.value;
      return this[attribute] || '';
    },
    setAttribute(attribute, attributeValue) {
      this[attribute] = attributeValue;
    },
    appendChild(child) {
      child.parentNode = this;
      this.children.push(child);
    },
    addEventListener() {
      // The test invokes submit handlers directly; field-level change listeners only need to register cleanly.
    },
  };
}

function findField(fields, name) {
  for (const field of fields) {
    if (field.name === name) return field;
    const child = findField(field.children || [], name);
    if (child) return child;
  }
  return null;
}

function createForm() {
  const fields = [
    createField('pos_system', ''),
    createField('pos_recommendation_interest', ''),
  ];
  const listeners = {};
  return {
    fields,
    appendChild(field) {
      field.parentNode = this;
      fields.push(field);
    },
    insertBefore(field) {
      field.parentNode = this;
      fields.push(field);
    },
    addEventListener(name, handler) {
      listeners[name] = handler;
    },
    querySelector(selector) {
      const nameMatch = selector.match(/name="([^"]+)"/) || selector.match(/\[name="([^"]+)"\]/);
      if (!nameMatch) return null;
      return findField(fields, nameMatch[1]);
    },
    submit() {
      listeners.submit();
    },
  };
}

function runAttributionScript({ href, pathname = '/', search = '', referrer = '', sessionStore = {}, localStore = {}, form: targetForm }) {
  const writes = {
    session: {},
    local: {},
  };
  const context = {
    URLSearchParams,
    Date,
    String,
    Boolean,
    Object,
    window: {
      location: {
        href,
        pathname,
        search,
      },
      sessionStorage: {
        getItem(key) { return sessionStore[key] || null; },
        setItem(key, value) {
          sessionStore[key] = value;
          writes.session[key] = value;
        },
      },
      localStorage: {
        getItem(key) { return localStore[key] || null; },
        setItem(key, value) {
          localStore[key] = value;
          writes.local[key] = value;
        },
      },
    },
    document: {
      referrer,
      createElement() {
        return createField('');
      },
      querySelectorAll(selector) {
        return selector === 'form[action*="formspree.io"]' ? [targetForm] : [];
      },
    },
  };
  vm.runInNewContext(attributionScript, context);
  return writes;
}

const form = createForm();
form.fields.push(createField('lead_source', 'homepage'));
const persistentAttribution = {};
const firstVisitWrites = runAttributionScript({
  href: 'https://serviio.ai/?utm_source=product_hunt&utm_medium=organic_listing&utm_campaign=free_search_marketing',
  search: '?utm_source=product_hunt&utm_medium=organic_listing&utm_campaign=free_search_marketing',
  localStore: persistentAttribution,
  form,
});
assert.ok(firstVisitWrites.local.serviio_attribution, 'first-touch attribution should be written to localStorage');
assert.strictEqual(form.querySelector('input[name="pos_readiness_signal"]').value, 'unknown_pos_status');
assert.strictEqual(form.querySelector('input[name="lead_acquisition_channel"]').value, 'directory_or_listing');
form.querySelector('[name="pos_system"]').value = 'Toast';
form.querySelector('[name="pos_recommendation_interest"]').value = 'Not applicable, I already have a POS';
form.submit();
assert.strictEqual(form.querySelector('input[name="pos_readiness_signal"]').value, 'pos_ready');
assert.strictEqual(form.querySelector('input[name="lead_route_hint"]').value, 'serviio_demo');
assert.strictEqual(form.querySelector('input[name="monetization_route_hint"]').value, 'serviio_demo');
assert.strictEqual(form.querySelector('input[name="recommended_pos_partner_targets"]').value, 'none');
assert.strictEqual(form.querySelector('input[name="lead_acquisition_channel"]').value, 'directory_or_listing');

const noPosForm = createForm();
noPosForm.fields.push(createField('lead_source', 'homepage'));
runAttributionScript({
  href: 'https://serviio.ai/restaurant-pos-partner-referral/?utm_source=chinese_pos_workflow_partner&utm_medium=partner_referral&utm_campaign=free_search_marketing',
  pathname: '/restaurant-pos-partner-referral/',
  search: '?utm_source=chinese_pos_workflow_partner&utm_medium=partner_referral&utm_campaign=free_search_marketing',
  form: noPosForm,
});
assert.ok(noPosForm.querySelector('[name="pos_partner_consent"]'), 'POS recommendation forms should collect partner-sharing consent');
noPosForm.querySelector('[name="pos_system"]').value = 'No POS yet';
noPosForm.querySelector('[name="pos_recommendation_interest"]').value = 'Yes, I want POS recommendations';
noPosForm.submit();
assert.strictEqual(noPosForm.querySelector('input[name="pos_readiness_signal"]').value, 'pos_referral_candidate');
assert.strictEqual(noPosForm.querySelector('input[name="lead_route_hint"]').value, 'pos_partner_referral');
assert.strictEqual(noPosForm.querySelector('input[name="monetization_route_hint"]').value, 'pos_partner_referral');
assert.strictEqual(noPosForm.querySelector('[name="pos_partner_consent"]').required, true);
assert.match(noPosForm.querySelector('input[name="recommended_pos_partner_targets"]').value, /39_miles/);
assert.match(noPosForm.querySelector('input[name="recommended_pos_partner_targets"]').value, /menusifu/);
assert.match(noPosForm.querySelector('input[name="recommended_pos_partner_targets"]').value, /chowbus/);
assert.strictEqual(noPosForm.querySelector('input[name="lead_acquisition_channel"]').value, 'partner_referral');

const returnVisitForm = createForm();
returnVisitForm.fields.push(createField('lead_source', 'homepage'));
runAttributionScript({
  href: 'https://serviio.ai/',
  localStore: persistentAttribution,
  form: returnVisitForm,
});
assert.strictEqual(returnVisitForm.querySelector('input[name="first_utm_source"]').value, 'product_hunt');
assert.strictEqual(returnVisitForm.querySelector('input[name="lead_acquisition_channel"]').value, 'directory_or_listing');

console.log('Form marker smoke tests passed');
