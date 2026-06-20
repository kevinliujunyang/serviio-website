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
  'lead_acquisition_channel',
  'directory_or_listing',
  'pos_referral_candidate',
  'serviio_demo',
]) {
  assert.ok(attributionScript.includes(snippet), `form-attribution.js missing ${snippet}`);
}

function createField(name, value = '') {
  return {
    name,
    value,
    type: '',
    getAttribute(attribute) {
      return attribute === 'value' ? this.value : '';
    },
  };
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
      fields.push(field);
    },
    addEventListener(name, handler) {
      listeners[name] = handler;
    },
    querySelector(selector) {
      const nameMatch = selector.match(/name="([^"]+)"/) || selector.match(/\[name="([^"]+)"\]/);
      if (!nameMatch) return null;
      return fields.find((field) => field.name === nameMatch[1]) || null;
    },
    submit() {
      listeners.submit();
    },
  };
}

const form = createForm();
form.fields.push(createField('lead_source', 'homepage'));
const context = {
  URLSearchParams,
  Date,
  String,
  Boolean,
  Object,
  window: {
    location: {
      href: 'https://serviio.ai/?utm_source=product_hunt&utm_medium=organic_listing&utm_campaign=free_search_marketing',
      pathname: '/',
      search: '?utm_source=product_hunt&utm_medium=organic_listing&utm_campaign=free_search_marketing',
    },
    sessionStorage: {
      getItem() { return null; },
      setItem() {},
    },
  },
  document: {
    referrer: '',
    createElement() {
      return createField('');
    },
    querySelectorAll(selector) {
      return selector === 'form[action*="formspree.io"]' ? [form] : [];
    },
  },
};

vm.runInNewContext(attributionScript, context);
assert.strictEqual(form.querySelector('input[name="pos_readiness_signal"]').value, 'unknown_pos_status');
assert.strictEqual(form.querySelector('input[name="lead_acquisition_channel"]').value, 'directory_or_listing');
form.querySelector('[name="pos_system"]').value = 'Toast';
form.querySelector('[name="pos_recommendation_interest"]').value = 'Not applicable, I already have a POS';
form.submit();
assert.strictEqual(form.querySelector('input[name="pos_readiness_signal"]').value, 'pos_ready');
assert.strictEqual(form.querySelector('input[name="lead_route_hint"]').value, 'serviio_demo');
assert.strictEqual(form.querySelector('input[name="monetization_route_hint"]').value, 'serviio_demo');
assert.strictEqual(form.querySelector('input[name="lead_acquisition_channel"]').value, 'directory_or_listing');

console.log('Form marker smoke tests passed');
