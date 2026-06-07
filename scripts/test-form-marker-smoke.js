const assert = require('assert');
const {
  buildMarkerFailures,
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

assert.deepStrictEqual(
  buildMarkerFailures('<form><select name="main_pain"></select></form>'),
  [
    'missing name="restaurant_city"',
    'missing name="restaurant_state"',
    'missing name="pos_system"',
    'missing name="phone_orders_per_week"',
    'missing name="pos_recommendation_interest"',
    'missing name="pos_purchase_timeline"',
  ],
);

assert.ok(requiredMarkers.includes('name="pos_system"'));
assert.ok(requiredMarkers.includes('name="phone_orders_per_week"'));
assert.ok(requiredMarkers.includes('name="pos_recommendation_interest"'));
assert.strictEqual(resolveBaseUrl('https://serviio.ai/'), 'https://serviio.ai');
assert.strictEqual(resolveBaseUrl(), 'https://serviio.ai');

console.log('Form marker smoke tests passed');
