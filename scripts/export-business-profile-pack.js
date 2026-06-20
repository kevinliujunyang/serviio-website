const fs = require('fs');
const {
  packetFor,
  parseCsv,
} = require('./print-free-search-submission-packets');

const CSV_PATH = 'docs/free-search-marketing-tracker.csv';
const DEFAULT_OUT = 'docs/business-profile-submission-pack.md';
const PRIORITY_SERVICE_AREAS = [
  'New York City',
  'Los Angeles',
  'San Francisco Bay Area',
  'Seattle',
  'Houston',
  'Chicago',
  'Boston',
  'Philadelphia',
];

const PROFILE_SERVICES = [
  'POS-integrated AI phone ordering',
  'Chinese restaurant AI phone answering',
  'Restaurant phone order taker AI',
  'Mandarin and English phone ordering support',
  'Takeout call automation for POS-ready restaurants',
];

const PROFILE_PRODUCTS = [
  {
    name: '39 Miles AI phone ordering',
    description: 'AI phone ordering workflow for Chinese restaurants using 39 Miles POS.',
    url: 'https://serviio.ai/pos/39-miles-ai-phone-ordering/?utm_source=business_profile_product&utm_medium=organic_listing&utm_campaign=free_search_marketing',
  },
  {
    name: 'Square AI phone ordering',
    description: 'AI phone ordering workflow for restaurants using Square POS.',
    url: 'https://serviio.ai/pos/square-ai-phone-ordering/?utm_source=business_profile_product&utm_medium=organic_listing&utm_campaign=free_search_marketing',
  },
  {
    name: 'Toast AI phone ordering',
    description: 'AI phone ordering workflow for restaurants using Toast POS.',
    url: 'https://serviio.ai/pos/toast-ai-phone-ordering/?utm_source=business_profile_product&utm_medium=organic_listing&utm_campaign=free_search_marketing',
  },
  {
    name: 'Clover AI phone ordering',
    description: 'AI phone ordering workflow for restaurants using Clover POS.',
    url: 'https://serviio.ai/pos/clover-ai-phone-ordering/?utm_source=business_profile_product&utm_medium=organic_listing&utm_campaign=free_search_marketing',
  },
  {
    name: 'MenuSifu AI phone ordering',
    description: 'AI phone ordering workflow for Chinese restaurants using MenuSifu POS.',
    url: 'https://serviio.ai/pos/menusifu-ai-phone-ordering/?utm_source=business_profile_product&utm_medium=organic_listing&utm_campaign=free_search_marketing',
  },
  {
    name: 'Chowbus AI phone ordering',
    description: 'AI phone ordering workflow for restaurants using Chowbus.',
    url: 'https://serviio.ai/pos/chowbus-ai-phone-ordering/?utm_source=business_profile_product&utm_medium=organic_listing&utm_campaign=free_search_marketing',
  },
  {
    name: 'Mealkeyway AI phone ordering',
    description: 'AI phone ordering workflow for restaurants using Mealkeyway.',
    url: 'https://serviio.ai/pos/mealkeyway-ai-phone-ordering/?utm_source=business_profile_product&utm_medium=organic_listing&utm_campaign=free_search_marketing',
  },
];

const LEAD_QUESTIONS = [
  'Which POS system do you use today: 39 Miles, Square, Toast, Clover, MenuSifu, Chowbus, Mealkeyway, or another system?',
  'How many phone orders do you receive during lunch and dinner rush?',
  'Do staff miss calls, place callers on hold, or manually re-enter phone orders into the POS?',
  'Do you need English, Mandarin, Cantonese, or bilingual call handling?',
  'Do you want a demo for AI phone ordering, or do you need help choosing a POS first?',
];

const PROFILE_QA = [
  {
    question: 'Does Serviio work with restaurant POS systems?',
    answer: 'Yes. Serviio qualifies POS-ready phone-order workflows for restaurants using 39 Miles, Square, Toast, Clover, MenuSifu, Chowbus, Mealkeyway, and related POS systems.',
  },
  {
    question: 'Is Serviio built for Chinese restaurants?',
    answer: 'Yes. Chinese restaurants are a priority fit because they often have high phone-order volume, English, Mandarin, Cantonese, or bilingual caller needs, and clear takeout workflows.',
  },
  {
    question: 'How much does Serviio cost?',
    answer: 'Serviio charges 2% per completed order, with no monthly fee and no setup cost.',
  },
  {
    question: 'What if my restaurant does not have a POS yet?',
    answer: 'Restaurants with an existing POS are prioritized for AI phone ordering. No-POS restaurants are kept as lower-priority POS recommendation leads for follow-up.',
  },
  {
    question: 'What languages can Serviio answer in?',
    answer: 'Serviio supports English and Chinese phone-order workflows, including Mandarin and Cantonese qualification during the fit check.',
  },
];

const PROFILE_POSTS = [
  {
    title: 'AI phone ordering for POS-ready restaurants',
    body: 'Serviio helps restaurants answer phone orders 24/7, capture pickup details, and evaluate POS-ready workflows for systems such as 39 Miles, Square, Toast, Clover, MenuSifu, Chowbus, and Mealkeyway.',
    cta: 'Check POS fit',
    url: 'https://serviio.ai/chinese-restaurant-pos-ai-phone-agent/?utm_source=business_profile_post&utm_medium=organic_listing&utm_campaign=free_search_marketing',
  },
  {
    title: 'Bilingual phone answering for Chinese restaurants',
    body: 'For Chinese restaurants with lunch and dinner rush phone volume, Serviio can answer in English and Chinese, ask about modifiers, confirm pickup details, and reduce missed-call pressure on staff.',
    cta: 'Check Chinese restaurant fit',
    url: 'https://serviio.ai/chinese-restaurant-ai-phone-ordering/?utm_source=business_profile_post&utm_medium=organic_listing&utm_campaign=free_search_marketing',
  },
  {
    title: 'Estimate missed-call revenue before a demo',
    body: 'Use the restaurant missed-call revenue calculator to estimate how much weekly takeout revenue may be lost when staff miss calls or manually re-enter phone orders during rush hours.',
    cta: 'Estimate missed-call revenue',
    url: 'https://serviio.ai/restaurant-missed-call-revenue-calculator/?utm_source=business_profile_post&utm_medium=organic_listing&utm_campaign=free_search_marketing',
  },
];

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function parseArgs(argv) {
  const args = {
    out: DEFAULT_OUT,
    today: todayIso(),
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help' || arg === '-h') {
      args.help = true;
    } else if (arg === '--out') {
      args.out = argv[index + 1] || DEFAULT_OUT;
      index += 1;
    } else if (arg === '--today') {
      args.today = argv[index + 1] || args.today;
      index += 1;
    } else {
      throw new Error(`Unexpected argument: ${arg}`);
    }
  }

  return args;
}

function businessProfileRows(rows) {
  return rows.filter((row) =>
    row.priority === 'P0' &&
    row.channel === 'Business profile' &&
    row.status === 'not_started'
  );
}

function trackerCommand(row, today) {
  return `npm run marketing:mark -- --target "${row.target}" --status submitted --date ${today} --note "Created or claimed business profile; record verification status and live profile URL when available."`;
}

function liveTrackerCommand(row, today) {
  return `npm run marketing:mark -- --target "${row.target}" --status live --date ${today} --url "https://PROFILE-URL-HERE" --note "Published business profile; replace placeholder URL with live profile URL and keep verification screenshot or dashboard confirmation."`;
}

function buildBusinessProfilePack(rows, { today = todayIso() } = {}) {
  const profiles = businessProfileRows(rows);
  const lines = [
    '# Serviio Business Profile Submission Pack',
    '',
    `Generated: ${today}`,
    '',
    'Use this pack to create or claim Serviio profiles on Google Business Profile, Bing Places for Business, and Apple Business Connect when eligible.',
    '',
    '## Shared Business Details',
    '',
    '- Business name: Serviio',
    '- Website: https://serviio.ai/',
    '- Phone: (408) 409-9079',
    '- Email: info@serviio.ai',
    '- Business type: Service-area business serving restaurant owners in the United States',
    '- Category candidates: Software company, Business service, Restaurant technology, Marketing service',
    '- Short description: AI phone ordering for restaurants using POS systems.',
    '- Pricing: 2% per completed order. No monthly fees and no setup costs.',
    '- Service focus: Chinese restaurants and takeout-heavy restaurants using 39 Miles, Square, Toast, Clover, MenuSifu, Chowbus, Mealkeyway, or another POS.',
    '- Priority service areas: New York City, Los Angeles, San Francisco Bay Area, Seattle, Houston, Chicago, Boston, Philadelphia, and other US restaurant markets with Chinese takeout density.',
    '',
    '## Profile services to add',
    '',
    ...PROFILE_SERVICES.map((service) => `- ${service}`),
    '',
    '## Profile products to add',
    '',
    'Use these as Google Business Profile products, Apple showcases, or service items when the platform supports product/service cards.',
    '',
    ...PROFILE_PRODUCTS.flatMap((product, index) => [
      `### ${index + 1}. ${product.name}`,
      '',
      `- Description: ${product.description}`,
      '- Price: No monthly fee; 2% per completed order',
      `- URL: ${product.url}`,
      '',
    ]),
    '## Profile Q&A answers',
    '',
    'Use these for Google Business Profile questions, Bing profile details, Apple showcases, or public directory FAQs when the platform supports Q&A content.',
    '',
    ...PROFILE_QA.flatMap((item, index) => [
      `### ${index + 1}. ${item.question}`,
      '',
      item.answer,
      '',
    ]),
    '## Lead qualification questions',
    '',
    ...LEAD_QUESTIONS.map((question) => `- ${question}`),
    '',
    '## Profile post drafts',
    '',
    'Use these as Google Business Profile updates, Bing Places posts if available, Apple Business Connect showcases, or directory profile updates after the profile exists.',
    '',
    ...PROFILE_POSTS.flatMap((post, index) => [
      `### ${index + 1}. ${post.title}`,
      '',
      `- Body: ${post.body}`,
      `- CTA: ${post.cta}`,
      `- URL: ${post.url}`,
      '',
    ]),
  ];

  for (const [index, row] of profiles.entries()) {
    const packet = packetFor(row);
    lines.push(
      `## ${index + 1}. ${row.target}`,
      '',
      `- Submission URL: ${row.url}`,
      `- Tracker UTM URL: ${row.utm_url}`,
      `- Clean URL: ${row.landing_url}`,
      `- Listing phrase: ${row.anchor_or_listing_phrase}`,
      '',
      'Copy:',
      '',
      `Title: ${packet.title}`,
      `Tagline: ${packet.tagline}`,
      `Short description: ${packet.shortDescription}`,
      '',
      packet.longDescription,
      '',
      `Categories: ${packet.categories}`,
      `Features: ${packet.features}`,
      '',
      'Service areas:',
      '',
      ...PRIORITY_SERVICE_AREAS.map((area) => `- ${area}`),
      '',
      'Lead capture and attribution:',
      '',
      `- Use this profile URL as the website link when the platform allows UTM parameters: ${row.utm_url}`,
      `- If the platform strips UTM parameters, use the clean URL and record the profile source manually: ${row.landing_url}`,
      '- Ask every inbound lead which POS system they use today before booking a demo.',
      '- Keep no-POS restaurant owners as lower-priority leads for POS partner referral follow-up.',
      '',
      'Evidence to capture:',
      '',
      '- Account/login used for the profile',
      '- Verification screenshot or dashboard confirmation',
      '- Live profile URL once published',
      '- Submitted date, verification status, and any pending review date',
      '',
      'Tracker update command after profile creation or claim:',
      '',
      '```bash',
      trackerCommand(row, today),
      '```',
      '',
      'Tracker update command after the profile is live:',
      '',
      '```bash',
      liveTrackerCommand(row, today),
      '```',
      ''
    );
  }

  lines.push(`Generated ${profiles.length} business profile actions from ${CSV_PATH}.`, '');
  return lines.join('\n');
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log('Usage: node scripts/export-business-profile-pack.js [--out docs/business-profile-submission-pack.md] [--today YYYY-MM-DD]');
    return;
  }

  const rows = parseCsv(fs.readFileSync(CSV_PATH, 'utf8'));
  fs.writeFileSync(args.out, buildBusinessProfilePack(rows, { today: args.today }));
  console.log(`Wrote ${args.out}`);
}

if (require.main === module) {
  main();
}

module.exports = {
  buildBusinessProfilePack,
  parseArgs,
};
