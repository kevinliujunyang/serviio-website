import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
test('the default deployment build always uses the private-file-safe Pages output', () => {
  const pkg = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url)));
  assert.equal(pkg.scripts.build, 'npm run build:pages');
  assert.equal(pkg.scripts['build:pages'], 'npm run build:css && node scripts/build-pages.mjs');
  assert.equal(pkg.scripts['test:account'], 'node --test tests/account/*.test.mjs');
});
test('account assets revalidate and page references bypass previously cached unversioned assets', () => {
  const headers = readFileSync(new URL('../../_headers', import.meta.url), 'utf8');
  for (const asset of ['js/account.js', 'css/account.css']) {
    assert.ok(headers.includes(`/assets/${asset}\n  Cache-Control: no-cache`));
    const references = ['account/index.html', 'zh/account/index.html'].map(page => {
      const html = readFileSync(new URL(`../../${page}`, import.meta.url), 'utf8');
      const reference = html.match(new RegExp(`/assets/${asset.replaceAll('.', '\\.')}\\?v=[a-zA-Z0-9-]+`));
      assert.ok(reference, `${page} should version ${asset}`);
      return reference[0];
    });
    assert.equal(references[0], references[1]);
  }
});
