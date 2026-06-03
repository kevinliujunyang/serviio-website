const fs = require('fs');
const path = require('path');

const SITE_ORIGIN = 'https://serviio.ai';
const REQUIRED_FORM_FIELDS = [
  'lead_source',
  'ideal_customer_profile',
  'restaurant_city',
  'restaurant_state',
  'phone_orders_per_week',
  'pos_recommendation_interest',
];

function walkHtmlPages(dir = '.') {
  const pages = [];
  for (const name of fs.readdirSync(dir)) {
    if (name === 'node_modules' || name === '.git') continue;
    const filePath = path.join(dir, name);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      pages.push(...walkHtmlPages(filePath));
    } else if (name === 'index.html') {
      pages.push(filePath.replace(/^\.\//, ''));
    }
  }
  return pages.sort();
}

function pagePathFromUrl(url) {
  const pathname = new URL(url).pathname;
  if (pathname === '/') return 'index.html';
  return pathname.replace(/^\//, '').replace(/\/$/, '') + '/index.html';
}

function extractAttr(html, regex) {
  const match = html.match(regex);
  return match ? match[1] : '';
}

function validateMetadata(pages) {
  const errors = [];
  let jsonLdBlocks = 0;

  for (const file of pages) {
    const html = fs.readFileSync(file, 'utf8');
    const title = extractAttr(html, /<title>([^<]+)<\/title>/);
    const description = extractAttr(html, /<meta name="description" content="([^"]+)/);
    const canonical = extractAttr(html, /<link rel="canonical" href="([^"]+)/);
    const jsonLd = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];

    if (!title) errors.push(`${file}: missing title`);
    if (title.length > 65) errors.push(`${file}: title too long (${title.length})`);
    if (!description) errors.push(`${file}: missing meta description`);
    if (description.length > 170) errors.push(`${file}: meta description too long (${description.length})`);
    if (!canonical) errors.push(`${file}: missing canonical`);
    if (canonical && !canonical.startsWith(SITE_ORIGIN + '/')) errors.push(`${file}: canonical is not on ${SITE_ORIGIN}`);
    if (jsonLd.length === 0) errors.push(`${file}: missing JSON-LD`);

    for (const match of jsonLd) {
      try {
        JSON.parse(match[1]);
        jsonLdBlocks += 1;
      } catch (error) {
        errors.push(`${file}: invalid JSON-LD (${error.message})`);
      }
    }
  }

  return { errors, jsonLdBlocks };
}

function validateSitemap(pages) {
  const errors = [];
  const xml = fs.readFileSync('sitemap.xml', 'utf8');
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
  const pageSet = new Set(pages);

  for (const loc of locs) {
    const file = pagePathFromUrl(loc);
    if (!fs.existsSync(file)) errors.push(`sitemap: ${loc} points to missing ${file}`);
  }

  for (const page of pages) {
    if (page === 'preview.html') continue;
    const urlPath = page === 'index.html' ? '/' : '/' + page.replace(/index\.html$/, '');
    const url = SITE_ORIGIN + urlPath;
    if (!locs.includes(url)) errors.push(`sitemap: missing ${url}`);
    pageSet.delete(page);
  }

  return { errors, locCount: locs.length };
}

function validateForms(pages) {
  const errors = [];
  let formCount = 0;

  for (const file of pages) {
    const html = fs.readFileSync(file, 'utf8');
    if (!html.includes('formspree.io')) continue;
    formCount += 1;
    if (!html.includes('/assets/js/form-attribution.js')) {
      errors.push(`${file}: form page missing form-attribution.js`);
    }
    for (const field of REQUIRED_FORM_FIELDS) {
      if (!html.includes(`name="${field}"`)) errors.push(`${file}: form missing ${field}`);
    }
  }

  return { errors, formCount };
}

function validateInternalLinks(pages) {
  const errors = [];

  for (const file of pages) {
    const html = fs.readFileSync(file, 'utf8');
    for (const match of html.matchAll(/href="([^"]+)"/g)) {
      const href = match[1];
      if (
        href.startsWith('#') ||
        href.startsWith('http') ||
        href.startsWith('mailto:') ||
        href.startsWith('tel:') ||
        href.startsWith('https://fonts.')
      ) {
        continue;
      }
      if (/\.(svg|png|jpg|jpeg|webp|pdf|css|js)$/i.test(href.split('#')[0])) continue;
      const cleanHref = href.split('#')[0];
      if (!cleanHref || cleanHref.startsWith('/assets/') || cleanHref.startsWith('../assets/')) continue;
      const linkedFile = cleanHref === '/' ? 'index.html' : cleanHref.replace(/^\//, '').replace(/\/$/, '') + '/index.html';
      if (!fs.existsSync(linkedFile)) errors.push(`${file}: broken internal link ${href} -> ${linkedFile}`);
    }
  }

  return { errors };
}

function validateRobots() {
  const errors = [];
  if (!fs.existsSync('robots.txt')) {
    errors.push('robots.txt: missing');
    return { errors };
  }
  const robots = fs.readFileSync('robots.txt', 'utf8');
  if (!robots.includes('User-agent: *')) errors.push('robots.txt: missing User-agent: *');
  if (!robots.includes('Allow: /')) errors.push('robots.txt: missing Allow: /');
  if (!robots.includes(`Sitemap: ${SITE_ORIGIN}/sitemap.xml`)) errors.push('robots.txt: missing production sitemap URL');
  return { errors };
}

function validateAttributionScript() {
  const errors = [];
  const file = 'assets/js/form-attribution.js';
  if (!fs.existsSync(file)) {
    errors.push(`${file}: missing`);
    return { errors };
  }
  const js = fs.readFileSync(file, 'utf8');
  const requiredSnippets = [
    'sessionStorage',
    'serviio_attribution',
    'landing_page',
    'first_utm_source',
    'current_page',
    'last_page',
    'utm_campaign',
    'gclid',
    'msclkid',
  ];
  for (const snippet of requiredSnippets) {
    if (!js.includes(snippet)) errors.push(`${file}: missing ${snippet}`);
  }
  return { errors };
}

const pages = walkHtmlPages();
const metadata = validateMetadata(pages);
const sitemap = validateSitemap(pages);
const forms = validateForms(pages);
const links = validateInternalLinks(pages);
const robots = validateRobots();
const attribution = validateAttributionScript();
const errors = [
  ...metadata.errors,
  ...sitemap.errors,
  ...forms.errors,
  ...links.errors,
  ...robots.errors,
  ...attribution.errors,
];

if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log([
  `${pages.length} crawlable pages`,
  `${metadata.jsonLdBlocks} JSON-LD blocks valid`,
  `${sitemap.locCount} sitemap URLs`,
  `${forms.formCount} lead forms validated`,
  'internal links validated',
  'form attribution validated',
  'robots.txt validated',
].join('\n'));
