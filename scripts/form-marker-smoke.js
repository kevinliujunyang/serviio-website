const fs = require('fs');
const path = require('path');

const SITE_ORIGIN = 'https://serviio.ai';
const requiredMarkerGroups = [
  ['name="restaurant_city"'],
  ['name="restaurant_state"'],
  ['name="pos_system"', 'name="pos_status"'],
  ['name="phone_orders_per_week"'],
  ['name="language_need"'],
  ['name="main_pain"'],
  ['name="pos_recommendation_interest"'],
  ['name="pos_purchase_timeline"'],
];
const requiredMarkers = requiredMarkerGroups.flat();

const baseUrl = process.argv[2] || SITE_ORIGIN;

function resolveBaseUrl(value = SITE_ORIGIN) {
  return value.replace(/\/$/, '');
}

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

function pagePath(page) {
  if (page === 'index.html') return '/';
  return `/${page.replace(/index\.html$/, '')}`;
}

function leadFormPaths() {
  return walkHtmlPages()
    .filter((page) => {
      const html = fs.readFileSync(page, 'utf8');
      return html.includes('<form') && buildMarkerFailures(html).length === 0;
    })
    .map(pagePath);
}

function buildMarkerFailures(html, markerGroups = requiredMarkerGroups) {
  return markerGroups
    .filter((markers) => !markers.some((marker) => html.includes(marker)))
    .map((markers) => `missing ${markers.join(' or ')}`);
}

async function main() {
  const paths = leadFormPaths();
  const failures = [];
  const origin = resolveBaseUrl(baseUrl);

  if (paths.length === 0) {
    console.error(`No local lead-form pages found with ${requiredMarkerGroups.map((group) => group.join(' or ')).join(', ')}`);
    process.exit(1);
  }

  for (const pathname of paths) {
    const response = await fetch(origin + pathname);
    const text = await response.text();
    const markerFailures = buildMarkerFailures(text);
    if (response.status !== 200 || markerFailures.length > 0) {
      failures.push(`${pathname}: ${response.status}, ${markerFailures.join(', ') || 'markers ok'}`);
    }
  }

  if (failures.length > 0) {
    console.error(failures.join('\n'));
    process.exit(1);
  }

  console.log(`Lead-form marker smoke passed for ${paths.length} pages at ${origin}`);
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

module.exports = {
  buildMarkerFailures,
  leadFormPaths,
  requiredMarkerGroups,
  requiredMarkers,
  resolveBaseUrl,
};
