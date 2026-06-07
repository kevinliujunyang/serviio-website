const assert = require('assert');
const {
  buildAnchorFailures,
  requiredHomepageAnchors,
  resolveBaseUrl,
} = require('./deploy-anchor-smoke');

const html = `
<html>
  <body>
    <a href="/pos/menusifu-ai-phone-ordering/">MenuSifu AI phone ordering</a>
    <a class="link" href="/pos/chowbus-ai-phone-ordering/">Chowbus POS AI phone agent</a>
  </body>
</html>
`;

assert.deepStrictEqual(
  buildAnchorFailures(html, [
    { href: '/pos/menusifu-ai-phone-ordering/', text: 'MenuSifu AI phone ordering' },
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

assert.ok(requiredHomepageAnchors.some((anchor) => anchor.text === 'MenuSifu AI phone ordering'));
assert.ok(requiredHomepageAnchors.some((anchor) => anchor.text === 'Chowbus POS AI phone agent'));
assert.ok(requiredHomepageAnchors.some((anchor) => anchor.text === 'Restaurant phone order automation'));
assert.strictEqual(resolveBaseUrl('https://serviio.ai/'), 'https://serviio.ai');
assert.strictEqual(resolveBaseUrl(), 'https://serviio.ai');

console.log('Deploy anchor smoke tests passed');
