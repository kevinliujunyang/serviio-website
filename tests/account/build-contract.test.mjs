import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
test('the default deployment build always uses the private-file-safe Pages output', () => {
  const pkg = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url)));
  assert.equal(pkg.scripts.build, 'npm run build:pages');
  assert.equal(pkg.scripts['build:pages'], 'npm run build:css && node scripts/build-pages.mjs');
  assert.equal(pkg.scripts['test:account'], 'node --test tests/account/*.test.mjs');
});
