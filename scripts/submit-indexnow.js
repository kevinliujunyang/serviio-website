const fs = require('fs');
const https = require('https');

const SITE_ORIGIN = 'https://serviio.ai';
const HOST = 'serviio.ai';
const INDEXNOW_ENDPOINT = 'https://api.indexnow.org/indexnow';
const INDEXNOW_KEY = '13f7c37452042c38a20123e6f2db6946';
const INDEXNOW_KEY_LOCATION = `${SITE_ORIGIN}/${INDEXNOW_KEY}.txt`;
const TOP_PRIORITY_PATHS = [
  '/',
  '/zh/',
  '/chinese-restaurant-ai-phone-ordering/',
  '/zh/chinese-restaurant-ai-phone-ordering/',
  '/restaurant-pos-phone-order-integration/',
  '/zh/restaurant-pos-phone-order-integration/',
  '/guides/connect-phone-orders-to-pos/',
  '/zh/guides/connect-phone-orders-to-pos/',
  '/chinese-restaurant-ai-order-taker/',
  '/zh/chinese-restaurant-ai-order-taker/',
  '/chinese-restaurant-pos-ai-phone-agent/',
  '/zh/chinese-restaurant-pos-ai-phone-agent/',
  '/chinese-restaurant-phone-order-pos-workflow/',
  '/zh/chinese-restaurant-phone-order-pos-workflow/',
  '/restaurant-pos-partner-referral/',
  '/zh/restaurant-pos-partner-referral/',
  '/chinese-restaurant-customer-service-ai/',
  '/zh/chinese-restaurant-customer-service-ai/',
  '/chinese-restaurant-phone-answering-service/',
  '/zh/chinese-restaurant-phone-answering-service/',
  '/ai-phone-ordering-for-chinese-takeout/',
  '/zh/ai-phone-ordering-for-chinese-takeout/',
  '/mandarin-cantonese-ai-phone-ordering/',
  '/zh/mandarin-cantonese-ai-phone-ordering/',
  '/guides/chinese-restaurant-pos-comparison/',
  '/zh/guides/chinese-restaurant-pos-comparison/',
  '/best-pos-for-chinese-restaurant-phone-orders/',
  '/zh/best-pos-for-chinese-restaurant-phone-orders/',
  '/pos/39-miles-ai-phone-ordering/',
  '/zh/pos/39-miles-ai-phone-ordering/',
  '/pos/menusifu-ai-phone-ordering/',
  '/zh/pos/menusifu-ai-phone-ordering/',
  '/pos/chowbus-ai-phone-ordering/',
  '/zh/pos/chowbus-ai-phone-ordering/',
  '/pos/square-ai-phone-ordering/',
  '/zh/pos/square-ai-phone-ordering/',
  '/pos/toast-ai-phone-ordering/',
  '/zh/pos/toast-ai-phone-ordering/',
  '/pos/clover-ai-phone-ordering/',
  '/zh/pos/clover-ai-phone-ordering/',
  '/pos/mealkeyway-ai-phone-ordering/',
  '/zh/pos/mealkeyway-ai-phone-ordering/',
];

function parseArgs(argv) {
  const args = { submit: false, all: false };
  for (const arg of argv) {
    if (arg === '--submit') args.submit = true;
    else if (arg === '--all') args.all = true;
    else if (arg === '--help' || arg === '-h') args.help = true;
    else throw new Error(`Unexpected argument: ${arg}`);
  }
  return args;
}

function sitemapUrls() {
  const xml = fs.readFileSync('sitemap.xml', 'utf8');
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
}

function priorityUrls() {
  const sitemapSet = new Set(sitemapUrls());
  return TOP_PRIORITY_PATHS
    .map((path) => `${SITE_ORIGIN}${path}`)
    .filter((url) => sitemapSet.has(url));
}

function validateKeyFile() {
  const file = `${INDEXNOW_KEY}.txt`;
  if (!fs.existsSync(file)) {
    throw new Error(`${file} is missing`);
  }
  const keyFileValue = fs.readFileSync(file, 'utf8').trim();
  if (keyFileValue !== INDEXNOW_KEY) {
    throw new Error(`${file} must contain the IndexNow key`);
  }
}

function buildPayload({ all }) {
  validateKeyFile();
  const urlList = all ? sitemapUrls() : priorityUrls();
  if (urlList.length === 0) {
    throw new Error('No URLs selected for IndexNow payload');
  }
  return {
    host: HOST,
    key: INDEXNOW_KEY,
    keyLocation: INDEXNOW_KEY_LOCATION,
    urlList,
  };
}

function postJson(url, payload) {
  const body = JSON.stringify(payload);
  return new Promise((resolve, reject) => {
    const request = https.request(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Length': Buffer.byteLength(body),
      },
    }, (response) => {
      const chunks = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => {
        resolve({
          statusCode: response.statusCode,
          body: Buffer.concat(chunks).toString('utf8'),
        });
      });
    });
    request.on('error', reject);
    request.write(body);
    request.end();
  });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log('Usage: node scripts/submit-indexnow.js [--all] [--submit]');
    console.log('Default is dry-run for top-priority URLs. Use --submit to POST to IndexNow.');
    return;
  }

  const payload = buildPayload({ all: args.all });
  if (!args.submit) {
    console.log(`# IndexNow dry run (${payload.urlList.length} URLs)`);
    console.log(JSON.stringify(payload, null, 2));
    return;
  }

  const response = await postJson(INDEXNOW_ENDPOINT, payload);
  console.log(`IndexNow response: HTTP ${response.statusCode}`);
  if (response.body) console.log(response.body);
  if (![200, 202].includes(response.statusCode)) {
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}

module.exports = {
  INDEXNOW_KEY,
  INDEXNOW_KEY_LOCATION,
  TOP_PRIORITY_PATHS,
  buildPayload,
};
