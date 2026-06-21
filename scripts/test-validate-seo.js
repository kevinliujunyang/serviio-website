const assert = require('assert');
const fs = require('fs');
const { runValidation, validateSitemap } = require('./validate-seo');

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
