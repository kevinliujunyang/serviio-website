const fs = require('fs');
const path = require('path');

const SITE_ORIGIN = 'https://serviio.ai';
const REQUIRED_MARKER = 'name="main_pain"';

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
      return html.includes('<form') && html.includes(REQUIRED_MARKER);
    })
    .map(pagePath);
}

async function main() {
  const paths = leadFormPaths();
  const failures = [];
  const origin = baseUrl.replace(/\/$/, '');

  if (paths.length === 0) {
    console.error(`No local lead-form pages found with ${REQUIRED_MARKER}`);
    process.exit(1);
  }

  for (const pathname of paths) {
    const response = await fetch(origin + pathname);
    const text = await response.text();
    if (response.status !== 200 || !text.includes(REQUIRED_MARKER)) {
      failures.push(`${pathname}: ${response.status}, main_pain=${text.includes(REQUIRED_MARKER)}`);
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
