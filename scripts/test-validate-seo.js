const assert = require('assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { runValidation, validateSitemap, walkHtmlPages } = require('./validate-seo');

const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'serviio-seo-'));
try {
  for (const file of ['index.html', 'account/index.html', 'zh/account/index.html', 'ordinary/index.html', 'account/help/index.html', 'public-dist/index.html', 'docs/index.html', 'server/index.html', 'tests/index.html', 'config/index.html', 'migrations/index.html', 'workers/index.html', '.wrangler/index.html']) {
    fs.mkdirSync(path.dirname(path.join(fixtureRoot, file)), { recursive: true });
    fs.writeFileSync(path.join(fixtureRoot, file), '<meta name="robots" content="noindex, nofollow">');
  }
  const discovered = () => walkHtmlPages(fixtureRoot).map(file => path.relative(fixtureRoot, file).split(path.sep).join('/'));
  assert.deepStrictEqual(discovered(), ['account/help/index.html', 'index.html', 'ordinary/index.html']);
  fs.writeFileSync(path.join(fixtureRoot, 'account/index.html'), '<title>Indexable account page</title>');
  assert.ok(discovered().includes('account/index.html'), 'account without explicit noindex must still be validated');
} finally {
  fs.rmSync(fixtureRoot, { recursive: true, force: true });
}

assert.strictEqual(typeof validateSitemap, 'function');

const originalReadFileSync = fs.readFileSync;
try {
  fs.readFileSync = (file, ...args) => {
    if (file === 'sitemap.xml') {
      return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://serviio.ai/</loc>
    <lastmod>2099-01-01</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>
trailing garbage`;
    }
    return originalReadFileSync(file, ...args);
  };

  const result = validateSitemap(['index.html']);
  assert.ok(
    result.errors.some((error) => /trailing content after closing urlset/.test(error)),
    `expected trailing sitemap content error, got: ${result.errors.join('; ')}`
  );
  assert.ok(
    validateSitemap(['index.html', 'ordinary/index.html']).errors.some(error => error === 'sitemap: missing https://serviio.ai/ordinary/'),
    'ordinary pages must still require sitemap coverage'
  );
} finally {
  fs.readFileSync = originalReadFileSync;
}

try {
  fs.readFileSync = (file, ...args) => {
    if (file === 'package.json') {
      const packageJson = JSON.parse(originalReadFileSync(file, ...args));
      delete packageJson.scripts['marketing:profile-evidence:export'];
      return JSON.stringify(packageJson);
    }
    return originalReadFileSync(file, ...args);
  };

  const result = runValidation();
  assert.ok(
    result.errors.some((error) => /missing marketing:profile-evidence:export script/.test(error)),
    `expected missing profile evidence export script error, got: ${result.errors.join('; ')}`
  );
} finally {
  fs.readFileSync = originalReadFileSync;
}

try {
  fs.readFileSync = (file, ...args) => {
    if (file === 'package.json') {
      const packageJson = JSON.parse(originalReadFileSync(file, ...args));
      delete packageJson.scripts['leads:partner-pipeline'];
      return JSON.stringify(packageJson);
    }
    return originalReadFileSync(file, ...args);
  };

  const result = runValidation();
  assert.ok(
    result.errors.some((error) => /missing leads:partner-pipeline script/.test(error)),
    `expected missing partner pipeline export script error, got: ${result.errors.join('; ')}`
  );
} finally {
  fs.readFileSync = originalReadFileSync;
}

try {
  fs.readFileSync = (file, ...args) => {
    if (file === 'assets/js/form-attribution.js') {
      return originalReadFileSync(file, ...args).replace(/pos_partner_consent/g, 'pos_partner_permission_removed');
    }
    return originalReadFileSync(file, ...args);
  };

  const result = runValidation();
  assert.ok(
    result.errors.some((error) => /form-attribution\.js: missing pos_partner_consent/.test(error)),
    `expected missing POS partner consent attribution error, got: ${result.errors.join('; ')}`
  );
} finally {
  fs.readFileSync = originalReadFileSync;
}

try {
  fs.readFileSync = (file, ...args) => {
    if (file === 'bilingual-restaurant-phone-ordering/index.html') {
      return originalReadFileSync(file, ...args).replace(/name="pos_partner_consent"/g, 'name="pos_partner_permission_removed"');
    }
    return originalReadFileSync(file, ...args);
  };

  const result = runValidation();
  assert.ok(
    result.errors.some((error) => /bilingual-restaurant-phone-ordering\/index\.html: lead form missing optional pos_partner_consent/.test(error)),
    `expected missing static POS partner consent field error, got: ${result.errors.join('; ')}`
  );
} finally {
  fs.readFileSync = originalReadFileSync;
}

try {
  fs.readFileSync = (file, ...args) => {
    if (file === 'restaurant-pos-partner-referral/index.html') {
      return originalReadFileSync(file, ...args)
        .replace(/Suggested listing copy/g, 'Listing copy removed')
        .replace(/AI phone ordering partner program/g, 'AI ordering partnership');
    }
    return originalReadFileSync(file, ...args);
  };

  const result = runValidation();
  assert.ok(
    result.errors.some((error) => /restaurant-pos-partner-referral\/index\.html: missing Suggested listing copy/.test(error)),
    `expected missing partner listing copy error, got: ${result.errors.join('; ')}`
  );
  assert.ok(
    result.errors.some((error) => /restaurant-pos-partner-referral\/index\.html: missing AI phone ordering partner program/.test(error)),
    `expected missing partner program keyword error, got: ${result.errors.join('; ')}`
  );
} finally {
  fs.readFileSync = originalReadFileSync;
}

try {
  fs.readFileSync = (file, ...args) => {
    if (file === 'service-areas/boston-chinese-restaurant-ai-phone-ordering/index.html') {
      return originalReadFileSync(file, ...args)
        .replace(/restaurant AI assistant/gi, 'AI answering')
        .replace(/restaurant POS phone order integration/gi, 'POS workflow');
    }
    return originalReadFileSync(file, ...args);
  };

  const result = runValidation();
  assert.ok(
    result.errors.some((error) => /missing local restaurant AI assistant intent/.test(error)),
    `expected missing local restaurant AI assistant intent error, got: ${result.errors.join('; ')}`
  );
  assert.ok(
    result.errors.some((error) => /missing local restaurant POS phone order integration intent/.test(error)),
    `expected missing local restaurant POS phone order integration intent error, got: ${result.errors.join('; ')}`
  );
} finally {
  fs.readFileSync = originalReadFileSync;
}

console.log('SEO validator tests passed');
