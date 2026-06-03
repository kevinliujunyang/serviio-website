const fs = require('fs');

const baseUrl = process.argv[2];

if (!baseUrl) {
  console.error('Usage: node scripts/http-smoke.js http://127.0.0.1:4173');
  process.exit(1);
}

async function main() {
  const xml = fs.readFileSync('sitemap.xml', 'utf8');
  const paths = [...xml.matchAll(/<loc>https:\/\/serviio\.ai([^<]*)<\/loc>/g)]
    .map((match) => match[1] || '/');
  const failures = [];

  for (const pathname of paths) {
    const response = await fetch(baseUrl.replace(/\/$/, '') + pathname);
    const text = await response.text();
    if (response.status !== 200 || !text.includes('<html')) {
      failures.push(`${pathname}: ${response.status}, html=${text.includes('<html')}`);
    }
  }

  if (failures.length > 0) {
    console.error(failures.join('\n'));
    process.exit(1);
  }

  console.log(`HTTP smoke passed for ${paths.length} sitemap URLs at ${baseUrl.replace(/\/$/, '')}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
