const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

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
const REQUIRED_CORE_LEAD_FIELDS = ['restaurant', 'name', 'phone', 'email'];
const POS_QUALIFICATION_FIELDS = ['pos_system', 'pos_status'];
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
  if (packageJson.scripts?.['indexnow:submit'] !== 'node scripts/submit-indexnow.js --submit') {
    errors.push('package.json: missing indexnow:submit script');
  }

  const script = fs.readFileSync('scripts/submit-indexnow.js', 'utf8');
  if (!script.includes(INDEXNOW_KEY)) {
    errors.push('scripts/submit-indexnow.js: missing IndexNow key');
  }
  if (!script.includes('INDEXNOW_KEY_LOCATION') || !script.includes('${SITE_ORIGIN}/${INDEXNOW_KEY}.txt')) {
    errors.push('scripts/submit-indexnow.js: missing IndexNow keyLocation constant');
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
  if (!tracker.includes('Submitted 28 top-priority Chinese restaurant and POS URLs')) {
    errors.push('docs/free-search-marketing-tracker.csv: missing IndexNow submission evidence note');
  }
  if (packageJson.scripts?.['marketing:next'] !== 'node scripts/print-free-search-next-actions.js') {
    errors.push('package.json: missing marketing:next script');
  }
  if (!fs.existsSync('scripts/print-free-search-next-actions.js')) {
    errors.push('scripts/print-free-search-next-actions.js: missing free search next-action brief');
  }
  const checklist = fs.readFileSync('docs/free-search-marketing-checklist.md', 'utf8');
  if (!checklist.includes('npm run marketing:next')) {
    errors.push('docs/free-search-marketing-checklist.md: missing marketing:next workflow');
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
const posFocusFields = validatePosFocusFields(pages);
const attribution = validateAttributionScript();
const searchConsoleCoverage = validateSearchConsoleCoverage();
const freeSearchTracker = validateFreeSearchTracker();
const keywordCoverageTooling = validateKeywordCoverageTooling();
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
  ...posFocusFields.errors,
  ...attribution.errors,
  ...searchConsoleCoverage.errors,
  ...freeSearchTracker.errors,
  ...keywordCoverageTooling.errors,
  ...serviceAreaGeneration.errors,
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
  `${organizationAuthority.homepageCount} Organization authority schemas validated`,
  `${homepageSoftwareApplication.homepageCount} SoftwareApplication schemas validated`,
  `${homepagePriorityNavLinks.homepageCount} homepage priority navs validated`,
  `${posFocusFields.posPageCount} POS focus fields validated`,
  'form attribution validated',
  `${searchConsoleCoverage.priorityPathCount} Search Console priority paths validated`,
  'free search tracker validated',
  'keyword coverage tooling validated',
  `${serviceAreaGeneration.serviceAreaLeadPageCount} service-area lead attribution markers validated`,
  'IndexNow setup validated',
  'robots.txt validated',
].join('\n'));
