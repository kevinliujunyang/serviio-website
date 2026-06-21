const fs = require('fs');
const {
  packetFor,
  parseCsv,
} = require('./print-free-search-submission-packets');

const CSV_PATH = 'docs/free-search-marketing-tracker.csv';
const DEFAULT_OUT = 'docs/business-profile-submission-pack.md';
const DEFAULT_EVIDENCE_LOG_OUT = 'docs/business-profile-evidence-log.csv';
const EVIDENCE_LOG_HEADERS = [
  'profile_item_type',
  'profile_platform',
  'item_name',
  'destination_url',
  'evidence_url',
  'account_or_login',
  'screenshot_or_dashboard_confirmation',
  'submitted_date',
  'live_date',
  'follow_up_date',
];
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

const PLATFORM_FIELD_MAPPINGS = [
  {
    platform: 'Google Business Profile',
    fields: [
      ['Primary category', 'Software company'],
      ['Additional categories', 'Business service; Restaurant technology; Marketing service'],
      ['Business description', 'Serviio is an AI phone ordering system for restaurants. It answers calls 24/7, takes orders in natural conversation, supports English and Chinese, and helps restaurants connect phone orders to POS-ready kitchen workflows.'],
      ['Service areas', 'United States service-area business; prioritize New York City, Los Angeles, San Francisco Bay Area, Seattle, Houston, Chicago, Boston, and Philadelphia'],
      ['Website field', 'https://serviio.ai/ (use clean URL if Google rejects UTM parameters)'],
      ['Services field', 'Add POS-integrated AI phone ordering, Chinese restaurant AI phone answering, restaurant phone order taker AI, and Mandarin and English phone ordering support'],
      ['Products field', 'Add POS-specific products for 39 Miles, MenuSifu, Square, Toast, Clover, Chowbus, and Mealkeyway when available'],
      ['First update post', 'Use the AI phone ordering for POS-ready restaurants post draft and link to https://serviio.ai/chinese-restaurant-pos-ai-phone-agent/?utm_source=business_profile_post&utm_medium=organic_listing&utm_campaign=free_search_marketing'],
      ['Evidence before tracker update', 'dashboard confirmation screenshot, account email, submitted date, and verification or review status'],
    ],
  },
  {
    platform: 'Bing Places for Business',
    fields: [
      ['Import source', 'import from Google only after the Google profile fields are accurate'],
      ['Primary category', 'Software company'],
      ['Business description', 'AI phone ordering for restaurants using POS systems such as 39 Miles, Square, Toast, Clover, MenuSifu, Chowbus, and Mealkeyway.'],
      ['Website field', 'https://serviio.ai/?utm_source=bing_places&utm_medium=organic_listing&utm_campaign=free_search_marketing'],
      ['Service areas', 'Mirror the Google service-area markets and keep NAP consistent'],
      ['Services field', 'Mirror the Google services list and include Chinese restaurant AI phone answering'],
      ['Evidence before tracker update', 'profile dashboard screenshot, account email, submitted date, and verification or sync status'],
    ],
  },
  {
    platform: 'Apple Business Connect',
    fields: [
      ['Primary category', 'Software company'],
      ['Business description', 'Serviio helps restaurants answer phone orders with AI, qualify POS-ready workflows, and reduce missed calls during rush hours.'],
      ['Website field', 'https://serviio.ai/?utm_source=apple_business_connect&utm_medium=organic_listing&utm_campaign=free_search_marketing'],
      ['Action link', 'https://serviio.ai/chinese-restaurant-pos-ai-phone-agent/?utm_source=apple_business_connect&utm_medium=organic_listing&utm_campaign=free_search_marketing'],
      ['Showcase', 'use 39 Miles AI phone ordering or MenuSifu AI phone ordering as the first POS-specific showcase'],
      ['Service areas', 'United States service-area business focused on POS-ready restaurant owners'],
      ['Evidence before tracker update', 'Business Connect dashboard screenshot, account email, submitted date, and verification status'],
    ],
  },
];

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function parseArgs(argv) {
  const args = {
    out: DEFAULT_OUT,
    today: todayIso(),
    evidenceLog: false,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help' || arg === '-h') {
      args.help = true;
    } else if (arg === '--evidence-log') {
      args.evidenceLog = true;
      if (args.out === DEFAULT_OUT) {
        args.out = DEFAULT_EVIDENCE_LOG_OUT;
      }
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

function renderPlatformFieldMappings() {
  return [
    '## Platform field mapping',
    '',
    'Use this section while creating each profile so the authority work is consistent across Google, Bing, and Apple.',
    '',
    ...PLATFORM_FIELD_MAPPINGS.flatMap((mapping) => [
      `### ${mapping.platform}`,
      '',
      ...mapping.fields.map(([label, value]) => `- ${label}: ${value}`),
      '',
    ]),
  ];
}

function renderProductEvidenceFields(product) {
  return [
    '- Product evidence fields to record:',
    `  - product_name: ${product.name}`,
    '  - profile_platform: Google Business Profile, Bing Places, or Apple Business Connect',
    '  - product_card_url: live product/service/showcase URL if the platform exposes one',
    `  - product_destination_url: ${product.url}`,
    '  - screenshot_or_dashboard_confirmation: required before counting the product as profile evidence',
    '  - expected_lead_acquisition_channel: business_profile',
  ];
}

function renderPostEvidenceFields(post) {
  return [
    '- Post evidence fields to record:',
    `  - post_title: ${post.title}`,
    '  - profile_platform: Google Business Profile, Bing Places, or Apple Business Connect',
    '  - profile_post_url: live update/post/showcase URL if the platform exposes one',
    `  - post_destination_url: ${post.url}`,
    '  - screenshot_or_dashboard_confirmation: required before using the post as authority evidence',
    '  - expected_lead_acquisition_channel: business_profile',
  ];
}

function businessProfileEvidencePlatforms(rows) {
  return businessProfileRows(rows).map((row) => ({
    name: row.target,
    profileUrl: row.utm_url || row.landing_url,
  }));
}

function buildBusinessProfileEvidenceLogRows(rows) {
  return businessProfileEvidencePlatforms(rows).flatMap((platform) => [
    ['profile_core', platform.name, 'Serviio profile', platform.profileUrl],
    ...PROFILE_PRODUCTS.map((product) => ['product_card', platform.name, product.name, product.url]),
    ...PROFILE_POSTS.map((post) => ['profile_post', platform.name, post.title, post.url]),
  ]).map(([profileItemType, profilePlatform, itemName, destinationUrl]) => ({
    profile_item_type: profileItemType,
    profile_platform: profilePlatform,
    item_name: itemName,
    destination_url: destinationUrl,
    evidence_url: '',
    account_or_login: '',
    screenshot_or_dashboard_confirmation: '',
    submitted_date: '',
    live_date: '',
    follow_up_date: '',
  }));
}

function csvEscape(value) {
  const text = String(value ?? '');
  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function evidenceLogToCsv(rows) {
  return [
    EVIDENCE_LOG_HEADERS.join(','),
    ...rows.map((row) => EVIDENCE_LOG_HEADERS.map((header) => csvEscape(row[header])).join(',')),
  ].join('\n');
}

function renderBusinessProfileEvidenceLogTemplate(rows) {
  const templateRows = buildBusinessProfileEvidenceLogRows(rows);

  return [
    '## Business Profile Evidence Log Template',
    '',
    'Copy these rows while creating profile products and posts. Fill evidence fields only after the external profile item exists.',
    '',
    '| profile_item_type | profile_platform | item_name | destination_url | evidence_url | account_or_login | screenshot_or_dashboard_confirmation | submitted_date | live_date | follow_up_date |',
    '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |',
    ...templateRows.map((row) => `| ${EVIDENCE_LOG_HEADERS.map((header) => row[header]).join(' | ')} |`),
    '',
  ];
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
    '## Profile asset checklist',
    '',
    '- Logo: https://serviio.ai/assets/logo.svg',
    '- Social/cover image: https://serviio.ai/assets/og-image.png',
    '- Website: https://serviio.ai/',
    '- Phone: (408) 409-9079',
    '- Email: info@serviio.ai',
    '- Keep NAP consistent across every profile before recording authority evidence.',
    '',
    '## Platform setup checklist',
    '',
    '- Google Business Profile: use clean homepage if UTM is rejected; add service-area business details, phone, website, logo, service categories, products, Q&A, and one update post.',
    '- Bing Places for Business: mirror Google NAP and service details; import from Google only after Google fields are accurate, then verify website, category, and service-area text.',
    '- Apple Business Connect: add action link to POS fit check; upload logo/cover image, service-area description, website, phone, and a showcase pointing to a POS or Chinese restaurant fit page.',
    '- Do not mark submitted or live until profile evidence is captured: account/login used, screenshot or dashboard confirmation, submitted date, and live URL when available.',
    '',
    ...renderBusinessProfileEvidenceLogTemplate(rows),
    ...renderPlatformFieldMappings(),
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
      ...renderProductEvidenceFields(product),
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
      ...renderPostEvidenceFields(post),
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
    console.log('Usage: node scripts/export-business-profile-pack.js [--out docs/business-profile-submission-pack.md] [--today YYYY-MM-DD] [--evidence-log]');
    return;
  }

  const rows = parseCsv(fs.readFileSync(CSV_PATH, 'utf8'));
  const output = args.evidenceLog
    ? `${evidenceLogToCsv(buildBusinessProfileEvidenceLogRows(rows))}\n`
    : buildBusinessProfilePack(rows, { today: args.today });
  fs.writeFileSync(args.out, output);
  console.log(`Wrote ${args.out}`);
}

if (require.main === module) {
  main();
}

module.exports = {
  buildBusinessProfileEvidenceLogRows,
  buildBusinessProfilePack,
  evidenceLogToCsv,
  parseArgs,
};
