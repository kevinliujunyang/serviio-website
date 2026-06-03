const fs = require('fs');
const path = require('path');

const SITE_ORIGIN = 'https://serviio.ai';
const REQUIRED_FORM_FIELDS = [
  'lead_source',
  'ideal_customer_profile',
];
const REQUIRED_QUALIFICATION_FIELDS = [
  'restaurant_city',
  'restaurant_state',
  'phone_orders_per_week',
  'pos_recommendation_interest',
];
const REQUIRED_CORE_LEAD_FIELDS = ['restaurant', 'name', 'phone'];
const POS_QUALIFICATION_FIELDS = ['pos_system', 'pos_status'];

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

function pageUrlFromPath(page) {
  const urlPath = page === 'index.html' ? '/' : '/' + page.replace(/index\.html$/, '');
  return SITE_ORIGIN + urlPath;
}

function extractAttr(html, regex) {
  const match = html.match(regex);
  return match ? match[1] : '';
}

function extractTagAttr(tag, attr) {
  const match = tag.match(new RegExp(`${attr}="([^"]+)"`));
  return match ? match[1] : '';
}

function asArray(value) {
  return Array.isArray(value) ? value : [value];
}

function hasRequiredFormControl(html, field) {
  const controls = html.match(/<(input|select|textarea)\b[^>]*>/g) || [];
  return controls.some((control) =>
    control.includes(`name="${field}"`) && /\srequired(?:\s|>|=)/.test(control)
  );
}

function validateJsonLdOfferPricing(data, file, errors) {
  if (!data || typeof data !== 'object') return;

  const types = asArray(data['@type']);
  if (types.includes('Offer')) {
    const description = String(data.description || '');
    const describesPercentageFee = description.includes('%') || description.includes('％');
    const hasFixedPriceFields = Object.prototype.hasOwnProperty.call(data, 'price') ||
      Object.prototype.hasOwnProperty.call(data, 'priceCurrency');

    if (describesPercentageFee && hasFixedPriceFields) {
      errors.push(`${file}: percentage Offer must use description only, not price or priceCurrency`);
    }
    if (data.price === '2' && data.priceCurrency === 'USD') {
      errors.push(`${file}: 2% fee is encoded as fixed USD price in JSON-LD`);
    }
  }

  for (const value of Object.values(data)) {
    if (Array.isArray(value)) {
      for (const item of value) validateJsonLdOfferPricing(item, file, errors);
    } else if (value && typeof value === 'object') {
      validateJsonLdOfferPricing(value, file, errors);
    }
  }
}

function validateMetadata(pages) {
  const errors = [];
  let jsonLdBlocks = 0;
  let alternateLinks = 0;

  for (const file of pages) {
    const html = fs.readFileSync(file, 'utf8');
    const title = extractAttr(html, /<title>([^<]+)<\/title>/);
    const description = extractAttr(html, /<meta name="description" content="([^"]+)/);
    const canonical = extractAttr(html, /<link rel="canonical" href="([^"]+)/);
    const alternates = [...html.matchAll(/<link\b[^>]*rel="alternate"[^>]*>/g)].map((match) => match[0]);
    const jsonLd = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];

    if (!title) errors.push(`${file}: missing title`);
    if (title.length > 65) errors.push(`${file}: title too long (${title.length})`);
    if (!description) errors.push(`${file}: missing meta description`);
    if (description.length > 170) errors.push(`${file}: meta description too long (${description.length})`);
    if (!canonical) errors.push(`${file}: missing canonical`);
    if (canonical && !canonical.startsWith(SITE_ORIGIN + '/')) errors.push(`${file}: canonical is not on ${SITE_ORIGIN}`);
    if (canonical && canonical !== pageUrlFromPath(file)) errors.push(`${file}: canonical must self-reference ${pageUrlFromPath(file)}`);
    if (alternates.length === 0) errors.push(`${file}: missing hreflang alternates`);
    for (const alternate of alternates) {
      alternateLinks += 1;
      const hreflang = extractTagAttr(alternate, 'hreflang');
      const href = extractTagAttr(alternate, 'href');
      if (!hreflang) errors.push(`${file}: alternate missing hreflang`);
      if (!href) errors.push(`${file}: alternate missing href`);
      if (href && !href.startsWith(SITE_ORIGIN + '/')) errors.push(`${file}: alternate href is not on ${SITE_ORIGIN}`);
      if (href && href.startsWith(SITE_ORIGIN + '/') && !fs.existsSync(pagePathFromUrl(href))) {
        errors.push(`${file}: alternate ${hreflang || 'unknown'} points to missing ${pagePathFromUrl(href)}`);
      }
    }
    if (jsonLd.length === 0) errors.push(`${file}: missing JSON-LD`);

    for (const match of jsonLd) {
      try {
        const data = JSON.parse(match[1]);
        validateJsonLdOfferPricing(data, file, errors);
        jsonLdBlocks += 1;
      } catch (error) {
        errors.push(`${file}: invalid JSON-LD (${error.message})`);
      }
    }
  }

  return { errors, jsonLdBlocks, alternateLinks };
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
    for (const field of REQUIRED_QUALIFICATION_FIELDS) {
      if (!html.includes(`name="${field}"`)) errors.push(`${file}: form missing ${field}`);
      if (!hasRequiredFormControl(html, field)) errors.push(`${file}: lead qualification field ${field} is not required`);
    }
    for (const field of REQUIRED_CORE_LEAD_FIELDS) {
      if (!html.includes(`name="${field}"`)) errors.push(`${file}: form missing core lead field ${field}`);
      if (!hasRequiredFormControl(html, field)) errors.push(`${file}: core lead field ${field} is not required`);
    }
    const hasPosQualification = POS_QUALIFICATION_FIELDS.some((field) => html.includes(`name="${field}"`));
    if (!hasPosQualification) {
      errors.push(`${file}: form missing POS qualification field (${POS_QUALIFICATION_FIELDS.join(' or ')})`);
    }
    const hasRequiredPosQualification = POS_QUALIFICATION_FIELDS.some((field) => hasRequiredFormControl(html, field));
    if (!hasRequiredPosQualification) {
      errors.push(`${file}: POS qualification field is not required`);
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
  `${metadata.alternateLinks} hreflang alternates valid`,
  `${sitemap.locCount} sitemap URLs`,
  `${forms.formCount} lead forms validated`,
  'core lead contact fields validated',
  'required lead qualification fields validated',
  'POS qualification validated',
  'internal links validated',
  'form attribution validated',
  'robots.txt validated',
].join('\n'));
