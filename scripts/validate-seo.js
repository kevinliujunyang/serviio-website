const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const SITE_ORIGIN = 'https://serviio.ai';
const REQUIRED_FORM_FIELDS = [
  'lead_source',
  'ideal_customer_profile',
  'conversion_offer',
];
const REQUIRED_QUALIFICATION_FIELDS = [
  'restaurant_city',
  'restaurant_state',
  'phone_orders_per_week',
  'main_pain',
  'pos_recommendation_interest',
  'pos_purchase_timeline',
];
const REQUIRED_CORE_LEAD_FIELDS = ['restaurant', 'name', 'phone', 'email'];
const POS_QUALIFICATION_FIELDS = ['pos_system', 'pos_status'];
const ALLOWED_CONVERSION_OFFERS = new Set([
  'ai_phone_order_fit_check',
  'chinese_restaurant_fit_check',
  'homepage_pos_fit_check',
  'local_pos_fit_check',
  'named_pos_fit_check',
  'pos_integration_fit_check',
  'pos_recommendation_fit_check',
  'pos_readiness_checklist',
  'customer_proof_request',
]);
const INDEXNOW_KEY = '13f7c37452042c38a20123e6f2db6946';
const REQUIRED_ORGANIZATION_TOPICS = [
  'restaurant AI phone ordering',
  'AI phone answering for Chinese restaurants',
  'restaurant AI phone order taker',
  'restaurant customer service AI',
  'POS integrated AI phone agent for restaurants',
  'Chinese restaurant POS integration',
  '39 Miles POS',
  'Square POS',
  'Toast POS',
  'Clover POS',
  'MenuSifu POS',
  'Chowbus POS',
  'Mealkeyway POS',
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
  const closingUrlsetIndex = xml.indexOf('</urlset>');
  if (closingUrlsetIndex === -1) {
    errors.push('sitemap: missing closing urlset tag');
  } else {
    const trailingContent = xml.slice(closingUrlsetIndex + '</urlset>'.length).trim();
    if (trailingContent) {
      errors.push('sitemap: trailing content after closing urlset');
    }
    if (xml.indexOf('</urlset>', closingUrlsetIndex + 1) !== -1) {
      errors.push('sitemap: multiple closing urlset tags');
    }
  }
  const urlEntries = [...xml.matchAll(/<url>([\s\S]*?)<\/url>/g)].map((match) => match[1]);
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
  const pageSet = new Set(pages);

  for (const entry of urlEntries) {
    const loc = extractAttr(entry, /<loc>([^<]+)<\/loc>/);
    const lastmod = extractAttr(entry, /<lastmod>([^<]+)<\/lastmod>/);
    const changefreq = extractAttr(entry, /<changefreq>([^<]+)<\/changefreq>/);
    const priority = extractAttr(entry, /<priority>([^<]+)<\/priority>/);

    if (!loc) {
      errors.push('sitemap: url entry missing loc');
      continue;
    }
    const file = pagePathFromUrl(loc);
    if (!fs.existsSync(file)) errors.push(`sitemap: ${loc} points to missing ${file}`);
    if (!lastmod) errors.push(`sitemap: ${loc} missing lastmod`);
    if (lastmod && !/^\d{4}-\d{2}-\d{2}$/.test(lastmod)) {
      errors.push(`sitemap: ${loc} has invalid lastmod ${lastmod}`);
    }
    if (!changefreq) errors.push(`sitemap: ${loc} missing changefreq`);
    if (!priority) errors.push(`sitemap: ${loc} missing priority`);
    if (priority && (Number(priority) < 0 || Number(priority) > 1)) {
      errors.push(`sitemap: ${loc} priority must be between 0 and 1`);
    }
    if (fs.existsSync(file) && lastmod) {
      const gitDate = gitLastCommitDate(file);
      if (gitDate && gitDate > lastmod) {
        errors.push(`sitemap: ${loc} lastmod ${lastmod} is older than latest page commit ${gitDate}`);
      }
    }
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

function gitLastCommitDate(file) {
  try {
    return execFileSync('git', ['log', '-1', '--format=%cs', '--', file], { encoding: 'utf8' }).trim();
  } catch {
    return '';
  }
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
    const conversionOffer = extractAttr(html, /name="conversion_offer"\s+value="([^"]+)"/);
    if (conversionOffer && !ALLOWED_CONVERSION_OFFERS.has(conversionOffer)) {
      errors.push(`${file}: unknown conversion_offer "${conversionOffer}"`);
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

function validateIndexNowSetup() {
  const errors = [];
  const requiredTopPriorityPaths = [
    '/',
    '/zh/',
    '/restaurant-pos-phone-order-integration/',
    '/zh/restaurant-pos-phone-order-integration/',
    '/guides/connect-phone-orders-to-pos/',
    '/zh/guides/connect-phone-orders-to-pos/',
    '/best-pos-for-chinese-restaurant-phone-orders/',
    '/zh/best-pos-for-chinese-restaurant-phone-orders/',
    '/restaurant-pos-integration-checklist/',
    '/zh/restaurant-pos-integration-checklist/',
    '/restaurant-missed-call-revenue-calculator/',
    '/pos/mealkeyway-ai-phone-ordering/',
    '/zh/pos/mealkeyway-ai-phone-ordering/',
  ];
  const keyFile = `${INDEXNOW_KEY}.txt`;
  if (!fs.existsSync(keyFile)) {
    errors.push(`${keyFile}: missing IndexNow key file`);
  } else {
    const keyFileValue = fs.readFileSync(keyFile, 'utf8').trim();
    if (keyFileValue !== INDEXNOW_KEY) {
      errors.push(`${keyFile}: IndexNow key file content mismatch`);
    }
  }

  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  if (packageJson.scripts?.['indexnow:payload'] !== 'node scripts/submit-indexnow.js') {
    errors.push('package.json: missing indexnow:payload script');
  }
  if (packageJson.scripts?.['indexnow:payload:all'] !== 'node scripts/submit-indexnow.js --all') {
    errors.push('package.json: missing indexnow:payload:all script');
  }
  if (packageJson.scripts?.['indexnow:submit'] !== 'node scripts/submit-indexnow.js --submit') {
    errors.push('package.json: missing indexnow:submit script');
  }
  if (packageJson.scripts?.['indexnow:submit:all'] !== 'node scripts/submit-indexnow.js --all --submit') {
    errors.push('package.json: missing indexnow:submit:all script');
  }

  const script = fs.readFileSync('scripts/submit-indexnow.js', 'utf8');
  if (!script.includes(INDEXNOW_KEY)) {
    errors.push('scripts/submit-indexnow.js: missing IndexNow key');
  }
  if (!script.includes('INDEXNOW_KEY_LOCATION') || !script.includes('${SITE_ORIGIN}/${INDEXNOW_KEY}.txt')) {
    errors.push('scripts/submit-indexnow.js: missing IndexNow keyLocation constant');
  }
  for (const path of requiredTopPriorityPaths) {
    if (!script.includes(`'${path}'`)) {
      errors.push(`scripts/submit-indexnow.js: top-priority IndexNow batch missing ${path}`);
    }
  }

  return { errors };
}

function extractJsonLdObjects(file) {
  const html = fs.readFileSync(file, 'utf8');
  const objects = [];
  for (const match of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    objects.push(JSON.parse(match[1]));
  }
  return objects;
}

function hasType(data, type) {
  return asArray(data?.['@type']).includes(type);
}

function validateOrganizationAuthority() {
  const errors = [];
  const homepageFiles = ['index.html', 'zh/index.html'];

  for (const file of homepageFiles) {
    const organization = extractJsonLdObjects(file).find((data) => hasType(data, 'Organization'));

    if (!organization) {
      errors.push(`${file}: missing Organization JSON-LD`);
      continue;
    }
    if (organization['@id'] !== `${SITE_ORIGIN}/#organization`) {
      errors.push(`${file}: Organization JSON-LD missing canonical @id`);
    }
    if (organization.url !== SITE_ORIGIN) {
      errors.push(`${file}: Organization JSON-LD must use ${SITE_ORIGIN} as url`);
    }
    if (organization.telephone !== '+1-408-409-9079') {
      errors.push(`${file}: Organization JSON-LD telephone must match public phone`);
    }
    if (organization.email !== 'info@serviio.ai') {
      errors.push(`${file}: Organization JSON-LD email must match public email`);
    }

    const contactPoints = asArray(organization.contactPoint).filter(Boolean);
    const contactTypes = new Set(contactPoints.map((point) => point.contactType));
    for (const contactType of ['sales', 'customer support']) {
      if (!contactTypes.has(contactType)) {
        errors.push(`${file}: Organization JSON-LD missing ${contactType} contactPoint`);
      }
    }
    for (const point of contactPoints) {
      const languages = asArray(point.availableLanguage).filter(Boolean);
      for (const language of ['English', 'Chinese']) {
        if (!languages.includes(language)) {
          errors.push(`${file}: Organization JSON-LD ${point.contactType || 'unknown'} contactPoint missing ${language}`);
        }
      }
    }

    const topics = asArray(organization.knowsAbout).filter(Boolean);
    for (const topic of REQUIRED_ORGANIZATION_TOPICS) {
      if (!topics.includes(topic)) {
        errors.push(`${file}: Organization JSON-LD missing knowsAbout topic "${topic}"`);
      }
    }
    if (!organization.hasOfferCatalog || organization.hasOfferCatalog['@type'] !== 'OfferCatalog') {
      errors.push(`${file}: Organization JSON-LD missing hasOfferCatalog`);
    }
    const catalogItems = asArray(organization.hasOfferCatalog?.itemListElement).filter(Boolean);
    if (catalogItems.length < 3) {
      errors.push(`${file}: Organization JSON-LD offer catalog must include at least 3 offers`);
    }
    const offerText = JSON.stringify([organization.hasOfferCatalog, organization.makesOffer]);
    for (const phrase of ['2%', '39 Miles', 'Square', 'Toast', 'Clover', 'MenuSifu', 'Chowbus']) {
      if (!offerText.includes(phrase)) {
        errors.push(`${file}: Organization JSON-LD offer text missing ${phrase}`);
      }
    }
  }

  return { errors, homepageCount: homepageFiles.length };
}

function validateHomepageSoftwareApplication() {
  const errors = [];
  const homepageFiles = ['index.html', 'zh/index.html'];
  const featureRequirements = {
    'index.html': ['AI phone ordering', 'Chinese phone answering', '39 Miles', 'Square', 'Toast', 'Clover', 'MenuSifu', 'Chowbus', 'Mealkeyway', 'SMS', 'Multi-line'],
    'zh/index.html': ['餐厅 AI 电话接单', '中英文', '39 Miles', 'Square', 'Toast', 'Clover', 'MenuSifu', 'Chowbus', 'Mealkeyway', '短信', '多线路'],
  };

  for (const file of homepageFiles) {
    const software = extractJsonLdObjects(file).find((data) => hasType(data, 'SoftwareApplication'));
    if (!software) {
      errors.push(`${file}: missing SoftwareApplication JSON-LD`);
      continue;
    }
    if (!software.audience || software.audience['@type'] !== 'Audience') {
      errors.push(`${file}: SoftwareApplication JSON-LD missing target Audience`);
    }
    const audienceType = String(software.audience?.audienceType || '');
    if (!audienceType.includes('POS')) {
      errors.push(`${file}: SoftwareApplication audience must mention POS`);
    }
    const featureText = JSON.stringify(asArray(software.featureList).filter(Boolean));
    for (const phrase of featureRequirements[file]) {
      if (!featureText.includes(phrase)) {
        errors.push(`${file}: SoftwareApplication featureList missing ${phrase}`);
      }
    }
  }

  return { errors, homepageCount: homepageFiles.length };
}

function validateHomepagePriorityNavLinks() {
  const errors = [];
  const requiredLinks = {
    'index.html': [
      '/restaurant-phone-answering-service/',
      '/restaurant-pos-phone-order-integration/',
      '/chinese-restaurant-ai-phone-ordering/',
      '/service-areas/',
    ],
    'zh/index.html': [
      '/zh/restaurant-phone-answering-service/',
      '/zh/restaurant-pos-phone-order-integration/',
      '/zh/chinese-restaurant-ai-phone-ordering/',
      '/zh/service-areas/',
    ],
  };

  for (const [file, links] of Object.entries(requiredLinks)) {
    const html = fs.readFileSync(file, 'utf8');
    for (const href of links) {
      if (!html.includes(`href="${href}"`)) {
        errors.push(`${file}: homepage priority nav missing ${href}`);
      }
    }
  }

  return { errors, homepageCount: Object.keys(requiredLinks).length };
}

function validateHomepageAuthorityHubLinks() {
  const errors = [];
  const html = fs.readFileSync('index.html', 'utf8');
  const requiredAnchors = [
    { href: '/pos/39-miles-ai-phone-ordering/', text: '39 Miles POS AI phone agent' },
    { href: '/pos/menusifu-ai-phone-ordering/', text: 'MenuSifu AI phone ordering' },
    { href: '/pos/chowbus-ai-phone-ordering/', text: 'Chowbus POS AI phone agent' },
    { href: '/pos/mealkeyway-ai-phone-ordering/', text: 'Mealkeyway POS AI phone agent' },
    { href: '/pos/square-ai-phone-ordering/', text: 'AI phone agent Square POS' },
    { href: '/pos/toast-ai-phone-ordering/', text: 'AI phone agent Toast POS' },
    { href: '/pos/clover-ai-phone-ordering/', text: 'AI phone agent Clover POS' },
    { href: '/takeout-pos-system/', text: 'POS system for takeout restaurant' },
    { href: '/chinese-takeout-pos-system/', text: 'Chinese takeout order POS' },
    { href: '/chinese-restaurant-phone-answering-service/', text: 'Chinese restaurant phone answering service' },
    { href: '/restaurant-tech-ai-phone-ordering/', text: 'Restaurant tech AI phone ordering' },
    { href: '/restaurant-call-answering-ai/', text: 'Restaurant call answering AI' },
    { href: '/restaurant-phone-order-automation/', text: 'Restaurant phone order automation' },
    { href: '/restaurant-pos-phone-order-integration/', text: 'Restaurant POS phone order integration' },
  ];

  for (const { href, text } of requiredAnchors) {
    const linkPattern = new RegExp(`<a\\b[^>]*href="${href.replace(/\//g, '\\/')}"[^>]*>[\\s\\S]*?${text}[\\s\\S]*?<\\/a>`);
    if (!linkPattern.test(html)) {
      errors.push(`index.html: homepage authority hub missing anchor "${text}" to ${href}`);
    }
  }

  return { errors, anchorCount: requiredAnchors.length };
}

function validateHomepageConversionOffers() {
  const errors = [];
  const homepageFiles = ['index.html', 'zh/index.html'];

  for (const file of homepageFiles) {
    const html = fs.readFileSync(file, 'utf8');
    if (!html.includes('name="conversion_offer" value="homepage_pos_fit_check"')) {
      errors.push(`${file}: homepage form missing homepage_pos_fit_check conversion_offer`);
    }
  }

  return { errors, homepageCount: homepageFiles.length };
}

function validatePosFocusFields(pages) {
  const errors = [];
  const posPages = pages.filter((file) => file.startsWith('pos/') || file.startsWith('zh/pos/'));

  for (const file of posPages) {
    const html = fs.readFileSync(file, 'utf8');
    const posFocus = html.match(/name="pos_focus"\s+value="([^"]+)"/);
    if (!posFocus) {
      errors.push(`${file}: POS-specific form missing hidden pos_focus`);
      continue;
    }
    if (!posFocus[1].trim()) {
      errors.push(`${file}: POS-specific form has empty pos_focus`);
    }
  }

  return { errors, posPageCount: posPages.length };
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
    'localStorage',
    'sessionStorage',
    'serviio_attribution',
    'landing_page',
    'first_utm_source',
    'current_page',
    'last_page',
    'utm_campaign',
    'gclid',
    'msclkid',
    'pos_readiness_signal',
    'lead_route_hint',
    'monetization_route_hint',
    'lead_acquisition_channel',
    'directory_or_listing',
    'pos_referral_candidate',
    'serviio_demo',
  ];
  for (const snippet of requiredSnippets) {
    if (!js.includes(snippet)) errors.push(`${file}: missing ${snippet}`);
  }
  return { errors };
}

function extractScorecardPriorityPaths() {
  const scorecard = fs.readFileSync('docs/google-search-console-scorecard.md', 'utf8');
  const section = scorecard.match(/## Priority Landing Pages([\s\S]*?)(?:\n## |\n$)/);
  if (!section) return [];
  return [...section[1].matchAll(/^- `([^`]+)`/gm)].map((match) => match[1]);
}

function extractIndexingPriorityPatterns() {
  const script = fs.readFileSync('scripts/print-indexing-urls.js', 'utf8');
  const section = script.match(/const priorityPatterns = \[([\s\S]*?)\];/);
  if (!section) return [];
  return [...section[1].matchAll(/'([^']+)'/g)].map((match) => match[1]);
}

function validateSearchConsoleCoverage() {
  const errors = [];
  const scorecardPaths = extractScorecardPriorityPaths();
  const indexingPatterns = extractIndexingPriorityPatterns();
  const xml = fs.readFileSync('sitemap.xml', 'utf8');
  const sitemapPaths = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => new URL(match[1]).pathname);

  if (scorecardPaths.length === 0) {
    errors.push('docs/google-search-console-scorecard.md: missing Priority Landing Pages paths');
  }
  if (indexingPatterns.length === 0) {
    errors.push('scripts/print-indexing-urls.js: missing priorityPatterns');
  }

  for (const scorecardPath of scorecardPaths) {
    if (!scorecardPath.startsWith('/')) {
      errors.push(`docs/google-search-console-scorecard.md: priority path must start with / (${scorecardPath})`);
      continue;
    }
    if (!fs.existsSync(pagePathFromUrl(SITE_ORIGIN + scorecardPath))) {
      errors.push(`docs/google-search-console-scorecard.md: priority path points to missing page ${scorecardPath}`);
    }
    if (!sitemapPaths.includes(scorecardPath)) {
      errors.push(`docs/google-search-console-scorecard.md: priority path missing from sitemap ${scorecardPath}`);
    }
    if (!indexingPatterns.includes(scorecardPath)) {
      errors.push(`scripts/print-indexing-urls.js: missing scorecard priority path ${scorecardPath}`);
    }
  }

  for (const indexingPattern of indexingPatterns) {
    if (!scorecardPaths.includes(indexingPattern) && !['/service-areas/', '/zh/service-areas/'].includes(indexingPattern)) {
      errors.push(`docs/google-search-console-scorecard.md: missing indexing priority path ${indexingPattern}`);
    }
  }

  return { errors, priorityPathCount: scorecardPaths.length };
}

function validateFreeSearchTracker() {
  const errors = [];
  const tracker = fs.readFileSync('docs/free-search-marketing-tracker.csv', 'utf8');
  const generator = fs.readFileSync('scripts/generate-free-search-tracker.js', 'utf8');
  const authorityAudit = fs.readFileSync('scripts/audit-seo-authority.js', 'utf8');
  const marketingTest = fs.readFileSync('scripts/test-marketing-outreach-export.js', 'utf8');
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));

  for (const content of [tracker, generator]) {
    if (!content.includes('IndexNow priority URL batch')) {
      errors.push('free search tracker: missing IndexNow priority URL batch row');
      break;
    }
  }

  if (!tracker.includes('https://api.indexnow.org/indexnow')) {
    errors.push('docs/free-search-marketing-tracker.csv: missing IndexNow endpoint URL');
  }
  if (!tracker.includes('utm_source=indexnow&utm_medium=indexing&utm_campaign=free_search_marketing')) {
    errors.push('docs/free-search-marketing-tracker.csv: missing IndexNow UTM URL');
  }
  if (!tracker.includes('Submitted top-priority Chinese restaurant and POS URLs')) {
    errors.push('docs/free-search-marketing-tracker.csv: missing IndexNow submission evidence note');
  }
  if (!tracker.includes('indexnow:submit:all')) {
    errors.push('docs/free-search-marketing-tracker.csv: missing full-site IndexNow follow-up note');
  }
  if (packageJson.scripts?.['marketing:next'] !== 'node scripts/print-free-search-next-actions.js') {
    errors.push('package.json: missing marketing:next script');
  }
  if (packageJson.scripts?.['marketing:sprint:export'] !== 'node scripts/export-partner-outreach-sprint.js') {
    errors.push('package.json: missing marketing:sprint:export script');
  }
  if (packageJson.scripts?.['marketing:profiles'] !== 'node scripts/export-business-profile-pack.js') {
    errors.push('package.json: missing marketing:profiles script');
  }
  if (packageJson.scripts?.['marketing:directories'] !== 'node scripts/export-directory-submission-pack.js') {
    errors.push('package.json: missing marketing:directories script');
  }
  if (packageJson.scripts?.['marketing:submission-log'] !== 'node scripts/export-authority-submission-log.js') {
    errors.push('package.json: missing marketing:submission-log script');
  }
  if (packageJson.scripts?.['marketing:submission-sync'] !== 'node scripts/sync-authority-submission-log.js') {
    errors.push('package.json: missing marketing:submission-sync script');
  }
  if (packageJson.scripts?.['marketing:authority-sprint'] !== 'node scripts/export-weekly-authority-sprint.js') {
    errors.push('package.json: missing marketing:authority-sprint script');
  }
  if (packageJson.scripts?.['marketing:gtm-queue:export'] !== 'node scripts/export-free-search-gtm-queue.js --out docs/free-search-gtm-queue.csv') {
    errors.push('package.json: missing marketing:gtm-queue:export script');
  }
  if (!fs.existsSync('scripts/print-free-search-next-actions.js')) {
    errors.push('scripts/print-free-search-next-actions.js: missing free search next-action brief');
  }
  if (!fs.existsSync('scripts/export-partner-outreach-sprint.js')) {
    errors.push('scripts/export-partner-outreach-sprint.js: missing partner outreach sprint export');
  }
  if (!fs.existsSync('scripts/export-business-profile-pack.js')) {
    errors.push('scripts/export-business-profile-pack.js: missing business profile export');
  }
  if (!fs.existsSync('scripts/export-directory-submission-pack.js')) {
    errors.push('scripts/export-directory-submission-pack.js: missing directory submission pack export');
  }
  if (!fs.existsSync('scripts/export-authority-submission-log.js')) {
    errors.push('scripts/export-authority-submission-log.js: missing authority submission log export');
  }
  if (!fs.existsSync('scripts/sync-authority-submission-log.js')) {
    errors.push('scripts/sync-authority-submission-log.js: missing authority submission log sync');
  }
  if (!fs.existsSync('scripts/export-weekly-authority-sprint.js')) {
    errors.push('scripts/export-weekly-authority-sprint.js: missing weekly authority sprint export');
  }
  if (!fs.existsSync('docs/free-search-gtm-queue.csv')) {
    errors.push('docs/free-search-gtm-queue.csv: missing exported GTM execution queue');
  }
  if (!fs.existsSync('docs/weekly-authority-sprint.md')) {
    errors.push('docs/weekly-authority-sprint.md: missing weekly authority sprint scorecard');
  }
  const checklist = fs.readFileSync('docs/free-search-marketing-checklist.md', 'utf8');
  if (!checklist.includes('npm run marketing:next')) {
    errors.push('docs/free-search-marketing-checklist.md: missing marketing:next workflow');
  }
  if (!checklist.includes('npm run marketing:sprint:export')) {
    errors.push('docs/free-search-marketing-checklist.md: missing marketing:sprint:export workflow');
  }
  if (!checklist.includes('npm run marketing:profiles')) {
    errors.push('docs/free-search-marketing-checklist.md: missing marketing:profiles workflow');
  }
  if (!checklist.includes('npm run marketing:directories')) {
    errors.push('docs/free-search-marketing-checklist.md: missing marketing:directories workflow');
  }
  if (!checklist.includes('npm run marketing:submission-log')) {
    errors.push('docs/free-search-marketing-checklist.md: missing marketing:submission-log workflow');
  }
  if (!checklist.includes('npm run marketing:submission-sync') || !checklist.includes('action_status=submitted')) {
    errors.push('docs/free-search-marketing-checklist.md: missing marketing:submission-sync workflow');
  }
  if (!checklist.includes('npm run marketing:authority-sprint') || !checklist.includes('docs/weekly-authority-sprint.md')) {
    errors.push('docs/free-search-marketing-checklist.md: missing weekly authority sprint workflow');
  }
  if (!checklist.includes('npm run marketing:gtm-queue:export') || !checklist.includes('docs/free-search-gtm-queue.csv')) {
    errors.push('docs/free-search-marketing-checklist.md: missing checked-in GTM queue workflow');
  }
  if (!checklist.includes('npm run indexnow:submit:all')) {
    errors.push('docs/free-search-marketing-checklist.md: missing full-site IndexNow workflow');
  }
  if (!authorityAudit.includes('evidenceIssues') || !authorityAudit.includes('isSubmittedWithEvidence') || !authorityAudit.includes('isLiveWithEvidence')) {
    errors.push('scripts/audit-seo-authority.js: missing evidence-qualified authority scoring');
  }
  if (!marketingTest.includes('Unverified AI Directory') || !marketingTest.includes('Evidence Issues')) {
    errors.push('scripts/test-marketing-outreach-export.js: missing authority evidence regression coverage');
  }
  if (!checklist.includes('owner`, `date_submitted`') || !checklist.includes('date_live')) {
    errors.push('docs/free-search-marketing-checklist.md: missing authority evidence requirements');
  }
  if (fs.existsSync('docs/free-search-gtm-queue.csv')) {
    const gtmQueue = fs.readFileSync('docs/free-search-gtm-queue.csv', 'utf8');
    if (!gtmQueue.includes('tracker_command') || !gtmQueue.includes('--date ')) {
      errors.push('docs/free-search-gtm-queue.csv: missing dated tracker commands');
    }
  }
  if (fs.existsSync('docs/weekly-authority-sprint.md')) {
    const authoritySprint = fs.readFileSync('docs/weekly-authority-sprint.md', 'utf8');
    if (!authoritySprint.includes('Authority score:') || !authoritySprint.includes('Evidence-qualified submitted or follow-up rows: 0/15')) {
      errors.push('docs/weekly-authority-sprint.md: missing authority score or submission target');
    }
    if (!authoritySprint.includes('## Execution Queue') || !authoritySprint.includes('Evidence needed')) {
      errors.push('docs/weekly-authority-sprint.md: missing execution queue evidence requirements');
    }
  }

  return { errors };
}

function validateKeywordCoverageTooling() {
  const errors = [];
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  if (packageJson.scripts?.['seo:coverage'] !== 'node scripts/audit-keyword-coverage.js') {
    errors.push('package.json: missing seo:coverage script');
  }
  if (!fs.existsSync('scripts/audit-keyword-coverage.js')) {
    errors.push('scripts/audit-keyword-coverage.js: missing keyword coverage audit');
  }
  const scorecard = fs.readFileSync('docs/google-search-console-scorecard.md', 'utf8');
  if (!scorecard.includes('npm run seo:coverage')) {
    errors.push('docs/google-search-console-scorecard.md: missing seo:coverage workflow');
  }
  const keywordMap = fs.readFileSync('docs/seo-keyword-map.md', 'utf8');
  if (!keywordMap.includes('npm run seo:coverage')) {
    errors.push('docs/seo-keyword-map.md: missing seo:coverage workflow');
  }

  return { errors };
}

function validateSearchConsoleAnalyzerWorkflow() {
  const errors = [];
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const analyzer = fs.readFileSync('scripts/analyze-search-console.js', 'utf8');
  const test = fs.readFileSync('scripts/test-search-console-analyzer.js', 'utf8');
  const scorecard = fs.readFileSync('docs/google-search-console-scorecard.md', 'utf8');
  const runbook = fs.readFileSync('docs/seo-deploy-and-lead-runbook.md', 'utf8');

  if (packageJson.scripts?.['search:analyze'] !== 'node scripts/analyze-search-console.js') {
    errors.push('package.json: missing search:analyze script');
  }
  if (packageJson.scripts?.['search:sample'] !== 'node scripts/analyze-search-console.js docs/sample-search-console-export.csv --out docs/sample-search-console-analysis.md') {
    errors.push('package.json: missing search:sample script');
  }
  if (packageJson.scripts?.['search:watchlist'] !== 'node scripts/export-first-page-ranking-watchlist.js') {
    errors.push('package.json: missing search:watchlist script');
  }
  if (packageJson.scripts?.['search:watchlist:update'] !== 'node scripts/update-first-page-ranking-watchlist.js') {
    errors.push('package.json: missing search:watchlist:update script');
  }
  if (packageJson.scripts?.['search:watchlist:sample'] !== 'node scripts/update-first-page-ranking-watchlist.js docs/sample-search-console-export.csv --out docs/sample-first-page-ranking-watchlist-updated.csv --checked 2026-06-07') {
    errors.push('package.json: missing search:watchlist:sample script');
  }
  if (packageJson.scripts?.['search:ranking-actions'] !== 'node scripts/export-ranking-action-queue.js') {
    errors.push('package.json: missing search:ranking-actions script');
  }
  if (packageJson.scripts?.['search:ranking-actions:sample'] !== 'node scripts/export-ranking-action-queue.js --watchlist docs/sample-first-page-ranking-watchlist-updated.csv --out docs/sample-ranking-action-queue.md') {
    errors.push('package.json: missing search:ranking-actions:sample script');
  }
  if (packageJson.scripts?.['search:test'] !== 'node scripts/test-search-console-analyzer.js') {
    errors.push('package.json: missing search:test script');
  }
  if (!fs.existsSync('scripts/export-first-page-ranking-watchlist.js')) {
    errors.push('scripts/export-first-page-ranking-watchlist.js: missing first-page ranking watchlist export');
  }
  if (!fs.existsSync('scripts/update-first-page-ranking-watchlist.js')) {
    errors.push('scripts/update-first-page-ranking-watchlist.js: missing first-page ranking watchlist update');
  }
  if (!fs.existsSync('scripts/export-ranking-action-queue.js')) {
    errors.push('scripts/export-ranking-action-queue.js: missing ranking action queue export');
  }
  if (!analyzer.includes('buildTitleMetaRewriteBriefs')) {
    errors.push('scripts/analyze-search-console.js: missing title/meta rewrite brief builder');
  }
  if (!analyzer.includes('Title/Meta Rewrite Briefs')) {
    errors.push('scripts/analyze-search-console.js: missing Title/Meta Rewrite Briefs report section');
  }
  if (!test.includes('buildTitleMetaRewriteBriefs') || !test.includes('page-one low CTR')) {
    errors.push('scripts/test-search-console-analyzer.js: missing title/meta rewrite brief regression coverage');
  }
  if (!test.includes('buildWatchlistRows') || !test.includes('MenuSifu POS AI phone agent')) {
    errors.push('scripts/test-search-console-analyzer.js: missing first-page watchlist regression coverage');
  }
  if (!test.includes('updateWatchlistRows') || !test.includes('near_page_one')) {
    errors.push('scripts/test-search-console-analyzer.js: missing first-page watchlist update regression coverage');
  }
  if (!test.includes('buildRankingActions') || !test.includes('push_to_page_one')) {
    errors.push('scripts/test-search-console-analyzer.js: missing ranking action queue regression coverage');
  }
  if (!scorecard.includes('npm run search:watchlist') || !scorecard.includes('docs/first-page-ranking-watchlist.csv')) {
    errors.push('docs/google-search-console-scorecard.md: missing first-page ranking watchlist workflow');
  }
  if (!scorecard.includes('npm run search:watchlist:update') || !scorecard.includes('docs/sample-first-page-ranking-watchlist-updated.csv')) {
    errors.push('docs/google-search-console-scorecard.md: missing first-page ranking watchlist update workflow');
  }
  if (!scorecard.includes('npm run search:ranking-actions') || !scorecard.includes('docs/sample-ranking-action-queue.md')) {
    errors.push('docs/google-search-console-scorecard.md: missing ranking action queue workflow');
  }
  if (!scorecard.includes('Title/Meta Rewrite Briefs')) {
    errors.push('docs/google-search-console-scorecard.md: missing Title/Meta Rewrite Briefs workflow');
  }
  if (!runbook.includes('Title/Meta Rewrite Briefs')) {
    errors.push('docs/seo-deploy-and-lead-runbook.md: missing Title/Meta Rewrite Briefs workflow');
  }
  for (const file of [
    'docs/sample-search-console-export.csv',
    'docs/sample-search-console-analysis.md',
    'docs/first-page-ranking-watchlist.csv',
    'docs/sample-first-page-ranking-watchlist-updated.csv',
    'docs/sample-ranking-action-queue.md',
  ]) {
    if (!fs.existsSync(file)) {
      errors.push(`${file}: missing Search Console sample workflow file`);
    }
  }
  if (!test.includes('sample-search-console-export.csv') || !test.includes('sample-search-console-analysis.md')) {
    errors.push('scripts/test-search-console-analyzer.js: missing Search Console sample regression coverage');
  }
  if (!scorecard.includes('npm run search:sample') || !scorecard.includes('docs/sample-search-console-export.csv')) {
    errors.push('docs/google-search-console-scorecard.md: missing Search Console sample workflow');
  }
  if (fs.existsSync('docs/first-page-ranking-watchlist.csv')) {
    const watchlist = fs.readFileSync('docs/first-page-ranking-watchlist.csv', 'utf8');
    if (!watchlist.includes('target_position,current_position') || !watchlist.includes('MenuSifu POS AI phone agent')) {
      errors.push('docs/first-page-ranking-watchlist.csv: missing target/current position tracking');
    }
    if (!watchlist.includes('MenuSifu restaurant consultants') || !watchlist.includes('needs_search_console_data')) {
      errors.push('docs/first-page-ranking-watchlist.csv: missing authority target or status fields');
    }
  }
  if (fs.existsSync('docs/sample-first-page-ranking-watchlist-updated.csv')) {
    const updatedWatchlist = fs.readFileSync('docs/sample-first-page-ranking-watchlist-updated.csv', 'utf8');
    if (!updatedWatchlist.includes('near_page_one') || !updatedWatchlist.includes('page_one')) {
      errors.push('docs/sample-first-page-ranking-watchlist-updated.csv: missing sample ranking statuses');
    }
    if (!updatedWatchlist.includes('2026-06-07')) {
      errors.push('docs/sample-first-page-ranking-watchlist-updated.csv: missing checked date');
    }
  }
  if (fs.existsSync('docs/sample-ranking-action-queue.md')) {
    const rankingQueue = fs.readFileSync('docs/sample-ranking-action-queue.md', 'utf8');
    if (!rankingQueue.includes('Serviio Ranking Action Queue') || !rankingQueue.includes('push_to_page_one')) {
      errors.push('docs/sample-ranking-action-queue.md: missing ranking action queue rows');
    }
    if (!rankingQueue.includes('MenuSifu restaurant consultants')) {
      errors.push('docs/sample-ranking-action-queue.md: missing authority-targeted action');
    }
  }
  const snippetExpectations = [
    {
      file: 'pos/menusifu-ai-phone-ordering/index.html',
      title: 'MenuSifu AI Phone Ordering for Restaurants - Serviio',
      description: 'Serviio answers restaurant phone orders and qualifies POS-ready workflows for 39 Miles, Square, Toast, Clover, MenuSifu, Chowbus, and Mealkeyway.',
    },
    {
      file: 'pos/chowbus-ai-phone-ordering/index.html',
      title: 'Chowbus AI Phone Ordering for Restaurants - Serviio',
      description: 'Serviio answers restaurant phone orders and qualifies POS-ready workflows for 39 Miles, Square, Toast, Clover, MenuSifu, Chowbus, and Mealkeyway.',
    },
    {
      file: 'chinese-restaurant-phone-answering-service/index.html',
      title: 'Chinese Restaurant Phone Answering Service - Serviio',
      description: 'AI phone ordering for Chinese restaurants. Serviio answers calls, captures takeout orders, supports bilingual callers, and checks POS readiness.',
    },
  ];
  for (const expectation of snippetExpectations) {
    const html = fs.readFileSync(expectation.file, 'utf8');
    if (!html.includes(`<title>${expectation.title}</title>`)) {
      errors.push(`${expectation.file}: missing Search Console rewrite title`);
    }
    if (!html.includes(`name="description" content="${expectation.description}"`)) {
      errors.push(`${expectation.file}: missing Search Console rewrite description`);
    }
  }

  return { errors };
}

function validateLeadScoringWorkflow() {
  const errors = [];
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const scorer = fs.readFileSync('scripts/score-formspree-leads.js', 'utf8');
  const test = fs.readFileSync('scripts/test-lead-scoring.js', 'utf8');
  const runbook = fs.readFileSync('docs/seo-deploy-and-lead-runbook.md', 'utf8');
  const normalizedRunbook = runbook.toLowerCase();

  if (packageJson.scripts?.['leads:score'] !== 'node scripts/score-formspree-leads.js') {
    errors.push('package.json: missing leads:score script');
  }
  if (packageJson.scripts?.['leads:demo-queue'] !== 'node scripts/export-serviio-demo-leads.js') {
    errors.push('package.json: missing leads:demo-queue script');
  }
  if (packageJson.scripts?.['leads:customer-proof'] !== 'node scripts/export-customer-proof-followups.js') {
    errors.push('package.json: missing leads:customer-proof script');
  }
  if (packageJson.scripts?.['leads:sample:score'] !== 'node scripts/score-formspree-leads.js docs/sample-formspree-leads.csv --out docs/sample-scored-leads.csv') {
    errors.push('package.json: missing leads:sample:score script');
  }
  if (packageJson.scripts?.['leads:sample:demo'] !== 'node scripts/export-serviio-demo-leads.js docs/sample-formspree-leads.csv --out docs/sample-demo-leads.csv') {
    errors.push('package.json: missing leads:sample:demo script');
  }
  if (packageJson.scripts?.['leads:sample:pos-partners'] !== 'node scripts/export-pos-partner-leads.js docs/sample-formspree-leads.csv --out docs/sample-pos-partner-leads.csv') {
    errors.push('package.json: missing leads:sample:pos-partners script');
  }
  if (packageJson.scripts?.['leads:sample:customer-proof'] !== 'node scripts/export-customer-proof-followups.js docs/sample-formspree-leads.csv --out docs/sample-customer-proof-followups.csv') {
    errors.push('package.json: missing leads:sample:customer-proof script');
  }
  if (!fs.existsSync('scripts/export-serviio-demo-leads.js')) {
    errors.push('scripts/export-serviio-demo-leads.js: missing Serviio demo queue export');
  }
  if (!fs.existsSync('scripts/export-customer-proof-followups.js')) {
    errors.push('scripts/export-customer-proof-followups.js: missing customer proof follow-up export');
  }
  if (packageJson.scripts?.['leads:test'] !== 'node scripts/test-lead-scoring.js') {
    errors.push('package.json: missing leads:test script');
  }
  for (const snippet of ['pain_signal', 'urgent_pain_signal', 'classifyPainSignal', 'pos_purchase_timeline_urgency', 'classifyPosPurchaseTimeline']) {
    if (!scorer.includes(snippet)) {
      errors.push(`scripts/score-formspree-leads.js: missing ${snippet}`);
    }
  }
  if (!test.includes('urgentPainDemo') || !test.includes('classifyPainSignal')) {
    errors.push('scripts/test-lead-scoring.js: missing urgent pain signal regression coverage');
  }
  if (!runbook.includes('pain_signal') || !runbook.includes('urgent_pain_signal')) {
    errors.push('docs/seo-deploy-and-lead-runbook.md: missing lead pain signal workflow');
  }
  if (!test.includes('urgentTimelineNoPosReferral') || !test.includes('classifyPosPurchaseTimeline')) {
    errors.push('scripts/test-lead-scoring.js: missing POS purchase timeline urgency regression coverage');
  }
  if (!runbook.includes('pos_purchase_timeline_urgency')) {
    errors.push('docs/seo-deploy-and-lead-runbook.md: missing POS purchase timeline urgency workflow');
  }
  if (!test.includes('buildDemoQueueRows') || !test.includes('export-serviio-demo-leads')) {
    errors.push('scripts/test-lead-scoring.js: missing Serviio demo queue export coverage');
  }
  if (!test.includes('buildCustomerProofRows') || !test.includes('export-customer-proof-followups')) {
    errors.push('scripts/test-lead-scoring.js: missing customer proof follow-up export coverage');
  }
  if (!runbook.includes('npm run leads:demo-queue')) {
    errors.push('docs/seo-deploy-and-lead-runbook.md: missing Serviio demo queue workflow');
  }
  if (!runbook.includes('npm run leads:customer-proof') || !runbook.includes('authority_tracker_target=Pilot restaurant testimonial')) {
    errors.push('docs/seo-deploy-and-lead-runbook.md: missing customer proof lead workflow');
  }
  if (
    !runbook.includes('calculator_missed_calls_per_week') ||
    !runbook.includes('estimated_recoverable_revenue') ||
    !runbook.includes('estimated_serviio_fee')
  ) {
    errors.push('docs/seo-deploy-and-lead-runbook.md: missing revenue calculator estimate workflow');
  }
  if (
    !normalizedRunbook.includes('calculator-origin demo leads') ||
    !normalizedRunbook.includes('calculator-origin no-pos leads')
  ) {
    errors.push('docs/seo-deploy-and-lead-runbook.md: missing calculator-origin lead routing guidance');
  }
  for (const file of [
    'docs/sample-formspree-leads.csv',
    'docs/sample-scored-leads.csv',
    'docs/sample-demo-leads.csv',
    'docs/sample-pos-partner-leads.csv',
    'docs/sample-customer-proof-followups.csv',
  ]) {
    if (!fs.existsSync(file)) {
      errors.push(`${file}: missing lead scoring sample workflow file`);
    }
  }
  if (!runbook.includes('npm run leads:sample:score') || !runbook.includes('docs/sample-formspree-leads.csv')) {
    errors.push('docs/seo-deploy-and-lead-runbook.md: missing lead scoring sample workflow');
  }

  return { errors };
}

function validateCustomerProofWorkflow() {
  const errors = [];
  const page = 'customer-proof-request/index.html';
  const tracker = fs.readFileSync('docs/free-search-marketing-tracker.csv', 'utf8');
  const generator = fs.readFileSync('scripts/generate-free-search-tracker.js', 'utf8');

  if (!fs.existsSync(page)) {
    errors.push(`${page}: missing customer proof request page`);
    return { errors };
  }

  const html = fs.readFileSync(page, 'utf8');
  const requiredSnippets = [
    'Customer proof',
    'name="proof_permission"',
    'name="quote"',
    'name="pos_system"',
    'name="phone_orders_per_week"',
    'name="main_pain"',
    'name="conversion_offer" value="customer_proof_request"',
    '/assets/js/form-attribution.js',
  ];

  for (const snippet of requiredSnippets) {
    if (!html.includes(snippet)) {
      errors.push(`${page}: missing ${snippet}`);
    }
  }

  for (const content of [tracker, generator]) {
    if (!content.includes('Pilot restaurant testimonial') || !content.includes('https://serviio.ai/customer-proof-request/')) {
      errors.push('customer proof tracker: missing customer proof request URL');
      break;
    }
  }

  return { errors };
}

function validateRevenueCalculatorLeadCapture() {
  const errors = [];
  const page = 'restaurant-missed-call-revenue-calculator/index.html';
  if (!fs.existsSync(page)) {
    errors.push(`${page}: missing revenue calculator page`);
    return { errors };
  }

  const html = fs.readFileSync(page, 'utf8');
  const requiredFields = [
    'calculator_missed_calls_per_week',
    'calculator_order_rate_percent',
    'calculator_average_order_value',
    'calculator_recovery_rate_percent',
    'estimated_lost_orders',
    'estimated_lost_revenue',
    'estimated_recoverable_revenue',
    'estimated_serviio_fee',
  ];

  for (const field of requiredFields) {
    if (!html.includes(`name="${field}"`)) {
      errors.push(`${page}: missing calculator lead field ${field}`);
    }
  }

  for (const id of [
    'calculator_missed_calls_per_week',
    'calculator_order_rate_percent',
    'calculator_average_order_value',
    'calculator_recovery_rate_percent',
    'estimated_lost_orders',
    'estimated_lost_revenue',
    'estimated_recoverable_revenue',
    'estimated_serviio_fee',
  ]) {
    if (!html.includes(`document.getElementById('${id}')`)) {
      errors.push(`${page}: calculator script does not update ${id}`);
    }
  }

  return { errors };
}

function validateServiceAreaGeneration(pages) {
  const errors = [];
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const requiredScripts = {
    'generate:city-pages': 'node scripts/generate-service-area-city-pages.js',
    'generate:state-pages': 'node scripts/generate-service-area-state-pages.js',
    'generate:service-area-pages': 'node scripts/generate-service-area-pages.js',
  };

  for (const [scriptName, command] of Object.entries(requiredScripts)) {
    if (packageJson.scripts?.[scriptName] !== command) {
      errors.push(`package.json: missing ${scriptName} script`);
    }
  }

  for (const file of [
    'scripts/generate-service-area-city-pages.js',
    'scripts/generate-service-area-state-pages.js',
    'scripts/generate-service-area-pages.js',
  ]) {
    if (!fs.existsSync(file)) errors.push(`${file}: missing service-area generation script`);
  }

  for (const file of [
    'scripts/generate-service-area-city-pages.js',
    'scripts/generate-service-area-state-pages.js',
  ]) {
    if (!fs.existsSync(file)) continue;
    const script = fs.readFileSync(file, 'utf8');
    for (const field of REQUIRED_QUALIFICATION_FIELDS) {
      if (!script.includes(`name="${field}"`)) {
        errors.push(`${file}: service-area generator form missing ${field}`);
      }
    }
  }

  const serviceAreaLeadPages = pages.filter((file) => {
    if (!file.startsWith('service-areas/') && !file.startsWith('zh/service-areas/')) return false;
    return fs.readFileSync(file, 'utf8').includes('formspree.io');
  });

  for (const file of serviceAreaLeadPages) {
    const html = fs.readFileSync(file, 'utf8');
    if (!html.includes('name="conversion_offer" value="local_pos_fit_check"')) {
      errors.push(`${file}: service-area form missing local_pos_fit_check conversion_offer`);
    }
  }

  return { errors, serviceAreaLeadPageCount: serviceAreaLeadPages.length };
}

function runValidation() {
  const pages = walkHtmlPages();
  const metadata = validateMetadata(pages);
  const sitemap = validateSitemap(pages);
  const forms = validateForms(pages);
  const links = validateInternalLinks(pages);
  const robots = validateRobots();
  const indexNow = validateIndexNowSetup();
  const organizationAuthority = validateOrganizationAuthority();
  const homepageSoftwareApplication = validateHomepageSoftwareApplication();
  const homepagePriorityNavLinks = validateHomepagePriorityNavLinks();
  const homepageAuthorityHubLinks = validateHomepageAuthorityHubLinks();
  const homepageConversionOffers = validateHomepageConversionOffers();
  const posFocusFields = validatePosFocusFields(pages);
  const attribution = validateAttributionScript();
  const searchConsoleCoverage = validateSearchConsoleCoverage();
  const freeSearchTracker = validateFreeSearchTracker();
  const keywordCoverageTooling = validateKeywordCoverageTooling();
  const searchConsoleAnalyzerWorkflow = validateSearchConsoleAnalyzerWorkflow();
  const leadScoringWorkflow = validateLeadScoringWorkflow();
  const customerProofWorkflow = validateCustomerProofWorkflow();
  const revenueCalculatorLeadCapture = validateRevenueCalculatorLeadCapture();
  const serviceAreaGeneration = validateServiceAreaGeneration(pages);
  const errors = [
    ...metadata.errors,
    ...sitemap.errors,
    ...forms.errors,
    ...links.errors,
    ...robots.errors,
    ...indexNow.errors,
    ...organizationAuthority.errors,
    ...homepageSoftwareApplication.errors,
    ...homepagePriorityNavLinks.errors,
    ...homepageAuthorityHubLinks.errors,
    ...homepageConversionOffers.errors,
    ...posFocusFields.errors,
    ...attribution.errors,
    ...searchConsoleCoverage.errors,
    ...freeSearchTracker.errors,
    ...keywordCoverageTooling.errors,
    ...searchConsoleAnalyzerWorkflow.errors,
    ...leadScoringWorkflow.errors,
    ...customerProofWorkflow.errors,
    ...revenueCalculatorLeadCapture.errors,
    ...serviceAreaGeneration.errors,
  ];

  return {
    errors,
    report: [
      `${pages.length} crawlable pages`,
      `${metadata.jsonLdBlocks} JSON-LD blocks valid`,
      `${metadata.alternateLinks} hreflang alternates valid`,
      `${sitemap.locCount} sitemap URLs`,
      `${forms.formCount} lead forms validated`,
      'core lead contact fields validated',
      `${forms.formCount} conversion offers validated`,
      'required lead qualification fields validated',
      'POS qualification validated',
      'internal links validated',
      `${organizationAuthority.homepageCount} Organization authority schemas validated`,
      `${homepageSoftwareApplication.homepageCount} SoftwareApplication schemas validated`,
      `${homepagePriorityNavLinks.homepageCount} homepage priority navs validated`,
      `${homepageAuthorityHubLinks.anchorCount} homepage authority hub anchors validated`,
      `${homepageConversionOffers.homepageCount} homepage conversion offers validated`,
      `${posFocusFields.posPageCount} POS focus fields validated`,
      'form attribution validated',
      `${searchConsoleCoverage.priorityPathCount} Search Console priority paths validated`,
      'free search tracker validated',
      'keyword coverage tooling validated',
      'Search Console analyzer workflow validated',
      'lead scoring workflow validated',
      'customer proof workflow validated',
      'revenue calculator lead capture validated',
      `${serviceAreaGeneration.serviceAreaLeadPageCount} service-area lead attribution markers validated`,
      'service-area generator lead fields validated',
      'IndexNow setup validated',
      'robots.txt validated',
    ],
  };
}

function main() {
  const { errors, report } = runValidation();
  if (errors.length > 0) {
    console.error(errors.join('\n'));
    process.exit(1);
  }
  console.log(report.join('\n'));
}

if (require.main === module) {
  main();
}

module.exports = {
  runValidation,
  validateSitemap,
};
