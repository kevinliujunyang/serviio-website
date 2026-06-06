const fs = require('fs');
const path = require('path');

const SITE_ORIGIN = 'https://serviio.ai';
const REQUIRED_MARKERS = [
  'name="main_pain"',
  'name="pos_purchase_timeline"',
];

const baseUrl = process.argv[2] || SITE_ORIGIN;

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
      return html.includes('<form') && REQUIRED_MARKERS.every((marker) => html.includes(marker));
    })
    .map(pagePath);
}

async function main() {
  const paths = leadFormPaths();
  const failures = [];
  const origin = baseUrl.replace(/\/$/, '');

  if (paths.length === 0) {
    console.error(`No local lead-form pages found with ${REQUIRED_MARKERS.join(', ')}`);
    process.exit(1);
  }

  for (const pathname of paths) {
    const response = await fetch(origin + pathname);
    const text = await response.text();
    const missingMarkers = REQUIRED_MARKERS.filter((marker) => !text.includes(marker));
    if (response.status !== 200 || missingMarkers.length > 0) {
      failures.push(`${pathname}: ${response.status}, missing=${missingMarkers.join('|') || 'none'}`);
    }
  }

  if (failures.length > 0) {
    console.error(failures.join('\n'));
    process.exit(1);
  }

  console.log(`Lead-form marker smoke passed for ${paths.length} pages at ${origin}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
