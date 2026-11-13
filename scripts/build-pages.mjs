import { execFileSync } from 'node:child_process';
import { copyFile, lstat, mkdir, readFile, rm } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const accountFiles = ['account/index.html', 'zh/account/index.html', 'assets/js/account.js', 'assets/css/account.css', '_headers', '_routes.json'];
const metadata = new Set(['robots.txt', 'sitemap.xml', '_redirects', '_headers', '_routes.json', '13f7c37452042c38a20123e6f2db6946.txt']);
const privateRoots = new Set(['server', 'workers', 'migrations', 'tests', 'docs', 'config', 'scripts', 'src', 'node_modules', 'public-dist', 'secrets', 'secret-exports', 'screenshots', 'test-results']);

export async function buildPages({ root = resolve(dirname(fileURLToPath(import.meta.url)), '..'), trackedFiles, output = resolve(root, 'public-dist') } = {}) {
  root = resolve(root);
  output = resolve(output);
  if (output !== resolve(root, 'public-dist')) throw new Error('Output must be public-dist under the project root');
  const files = trackedFiles ?? execFileSync('git', ['ls-files', '-z'], { cwd: root, encoding: 'utf8' }).split('\0').filter(Boolean);
  const pages = new Set(['index.html', 'zh/index.html', 'interested.html']);
  // The public SEO inventory is the allowlist for existing marketing pages.
  const sitemap = await readFile(resolve(root, 'sitemap.xml'), 'utf8');
  for (const [, loc] of sitemap.matchAll(/<loc>\s*([^<]+)\s*<\/loc>/g)) {
    const url = new URL(loc.trim());
    if (url.origin !== 'https://serviio.ai' || url.search || url.hash) throw new Error('Unexpected sitemap URL');
    const path = url.pathname.replace(/^\//, '').replace(/\/$/, '');
    if (path && !path.endsWith('.html')) pages.add(path + '/index.html');
    else if (path) pages.add(path);
  }
  function isPublic(file) {
    if (file.split('/').some(part => part.startsWith('.') || part === '..') || privateRoots.has(file.split('/')[0]) || file === 'preview.html') return false;
    return pages.has(file) || metadata.has(file) || /^assets\/(?:[a-zA-Z0-9_-]+\/)*[a-zA-Z0-9_.-]+\.(?:css|js|svg|png|jpg|jpeg|webp|gif|ico|pdf|woff2?)$/.test(file);
  }
  const selected = [...new Set([...files.filter(isPublic), ...accountFiles])].sort();
  const available = [];
  for (const file of selected) {
    let missing = false;
    const parts = file.split('/');
    for (let index = 1; index <= parts.length; index++) {
      try {
        if ((await lstat(resolve(root, ...parts.slice(0, index)))).isSymbolicLink()) throw new Error('Public files cannot use a symbolic link: ' + file);
      } catch (error) {
        if (error.code !== 'ENOENT') throw error;
        missing = true;
        break;
      }
    }
    if (!missing && (await lstat(resolve(root, file))).isFile()) available.push(file);
  }
  try { if ((await lstat(output)).isSymbolicLink()) throw new Error('public-dist cannot be a symbolic link'); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  // Only the generated output is replaced. Source files are never removed.
  await rm(output, { recursive: true, force: true });
  await mkdir(output, { recursive: true });
  for (const file of available) {
    await mkdir(dirname(resolve(output, file)), { recursive: true });
    await copyFile(resolve(root, file), resolve(output, file));
  }
  return available;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const files = await buildPages();
  console.log('Packaged ' + files.length + ' public files into public-dist');
}
