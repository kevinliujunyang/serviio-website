const assert = require('assert');
const fs = require('fs');
const {
  buildAnchorFailures,
  requiredHomepageAnchors,
  resolveBaseUrl,
} = require('./deploy-anchor-smoke');

const html = `
<html>
  <body>
    <a class="link" href="/pos/chowbus-ai-phone-ordering/">Chowbus POS AI phone agent</a>
  </body>
</html>
`;

assert.deepStrictEqual(
  buildAnchorFailures(html, [
    { href: '/pos/chowbus-ai-phone-ordering/', text: 'Chowbus POS AI phone agent' },
  ]),
  [],
);

assert.deepStrictEqual(
  buildAnchorFailures(html, [
    { href: '/restaurant-phone-order-automation/', text: 'Restaurant phone order automation' },
  ]),
  ['missing anchor "Restaurant phone order automation" to /restaurant-phone-order-automation/'],
);

assert.ok(requiredHomepageAnchors.some((anchor) => anchor.text === 'Chowbus POS AI phone agent'));
assert.ok(requiredHomepageAnchors.some((anchor) => anchor.text === 'Restaurant phone order automation'));
assert.strictEqual(resolveBaseUrl('https://serviio.ai/'), 'https://serviio.ai');
assert.strictEqual(resolveBaseUrl(), 'https://serviio.ai');

const posHubHtml = fs.readFileSync('restaurant-pos-phone-order-integration/index.html', 'utf8');
assert.deepStrictEqual(
  buildAnchorFailures(posHubHtml, [
    { href: '/pos/39-miles-ai-phone-ordering/', text: '39 Miles AI phone answering' },
    { href: '/pos/39-miles-ai-phone-ordering/', text: '39 Miles AI order taker' },
  ]),
  [],
);

assert.ok(requiredHomepageAnchors.every((anchor) => !/menusifu/i.test(anchor.href + anchor.text)));
console.log('Deploy anchor smoke tests passed');
