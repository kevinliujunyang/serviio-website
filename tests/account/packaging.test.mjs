import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, readdir, symlink, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildPages } from '../../scripts/build-pages.mjs';

test('build publishes only public tracked pages, assets and explicit account files', async () => {
  const root = await mkdtemp(join(tmpdir(), 'serviio-package-'));
  const files = ['index.html', 'zh/index.html', 'pos/square/index.html', 'assets/logo.svg', 'assets/css/styles.css', 'robots.txt', 'sitemap.xml', '_redirects', '_headers', '_routes.json', '13f7c37452042c38a20123e6f2db6946.txt', 'account/index.html', 'zh/account/index.html', 'assets/js/account.js', 'assets/css/account.css', 'preview.html', 'docs/private.html', 'server/private.mjs', 'config/private.json', 'migrations/secret.sql', 'tests/leak.html', 'node_modules/leak.html', 'untracked/index.html', '.dev.vars'];
  try {
    for (const file of files) {
      await mkdir(join(root, file, '..'), { recursive: true });
      await writeFile(join(root, file), file);
    }
    const sitemap = '<urlset><url><loc>https://serviio.ai/pos/square/</loc></url><url><loc>https://serviio.ai/untracked/</loc></url><url><loc>https://serviio.ai/docs/private.html</loc></url></urlset>';
    await writeFile(join(root, 'sitemap.xml'), sitemap);
    const trackedFiles = files.filter(file => !file.includes('account') && file !== 'untracked/index.html');
    await buildPages({ root, trackedFiles });
    const output = await readdir(join(root, 'public-dist'), { recursive: true });
    const privateStart = files.indexOf('preview.html');
    for (const file of files.slice(0, privateStart)) assert.equal(await readFile(join(root, 'public-dist', file), 'utf8'), file === 'sitemap.xml' ? sitemap : file);
    for (const file of files.slice(privateStart)) assert.ok(!output.includes(file), `Published private file ${file}`);
    await writeFile(join(root, 'public-dist', 'stale.html'), 'stale');
    await buildPages({ root, trackedFiles });
    assert.ok(!(await readdir(join(root, 'public-dist'))).includes('stale.html'));
    assert.equal(await readFile(join(root, 'preview.html'), 'utf8'), 'preview.html');
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('build rejects a public symlink and unsafe output location', async () => {
  const root = await mkdtemp(join(tmpdir(), 'serviio-package-'));
  try {
    await writeFile(join(root, 'secret'), 'private');
    await writeFile(join(root, 'sitemap.xml'), '<urlset/>');
    await symlink(join(root, 'secret'), join(root, 'index.html'));
    await assert.rejects(buildPages({ root, trackedFiles: ['index.html'] }), /symbolic link/i);
    await assert.rejects(buildPages({ root, trackedFiles: [], output: root }), /public-dist/i);
    assert.equal(await readFile(join(root, 'secret'), 'utf8'), 'private');
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('Pages route and account header controls stay scoped', async () => {
  const routes = JSON.parse(await readFile(new URL('../../_routes.json', import.meta.url), 'utf8'));
  assert.deepEqual(routes, { version: 1, include: ['/api/account/*'], exclude: [] });
  const headers = await readFile(new URL('../../_headers', import.meta.url), 'utf8');
  for (const route of ['/account', '/account/*', '/zh/account', '/zh/account/*']) assert.ok(headers.includes(`${route}\n`));
  for (const value of ['noindex', 'no-store', 'no-referrer']) assert.ok(headers.includes(value));
});
