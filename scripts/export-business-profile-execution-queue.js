const fs = require('fs');
const {
  buildBusinessProfileEvidenceLogRows,
} = require('./export-business-profile-pack');
const {
  parseCsv,
} = require('./print-free-search-submission-packets');

const CSV_PATH = 'docs/free-search-marketing-tracker.csv';
const DEFAULT_OUT = 'docs/business-profile-execution-queue.csv';
const AUTHORITY_MEDIA_KIT_URL = 'https://serviio.ai/authority-media-kit/';

const HEADERS = [
  'position',
  'profile_platform',
  'profile_item_type',
  'item_name',
  'destination_url',
  'authority_reason',
  'authority_media_kit_url',
  'lead_route',
  'expected_lead_acquisition_channel',
  'next_step',
  'copy_paste_payload',
  'evidence_needed',
  'tracker_command',
];

const PLATFORM_ORDER = [
  'Google Business Profile',
  'Bing Places for Business',
  'Apple Business Connect',
];

const PLATFORM_ITEM_PLAN = {
  'Google Business Profile': [
    'profile_core:Serviio profile',
    'product_card:39 Miles AI phone ordering',
    'product_card:MenuSifu AI phone ordering',
    'profile_post:AI phone ordering for POS-ready restaurants',
    'profile_post:Bilingual phone answering for Chinese restaurants',
    'profile_post:Estimate missed-call revenue before a demo',
  ],
  'Bing Places for Business': [
    'profile_core:Serviio profile',
    'product_card:39 Miles AI phone ordering',
    'product_card:MenuSifu AI phone ordering',
    'profile_post:AI phone ordering for POS-ready restaurants',
  ],
  'Apple Business Connect': [
    'profile_core:Serviio profile',
    'product_card:39 Miles AI phone ordering',
    'product_card:MenuSifu AI phone ordering',
    'profile_post:Bilingual phone answering for Chinese restaurants',
    'profile_post:Estimate missed-call revenue before a demo',
  ],
};

const PRODUCT_COPY = {
  '39 Miles AI phone ordering': 'AI phone ordering workflow for Chinese restaurants using 39 Miles POS. Serviio answers calls, captures order details, and qualifies POS-ready workflows for takeout-heavy restaurants.',
  'MenuSifu AI phone ordering': 'AI phone ordering workflow for Chinese restaurants using MenuSifu POS. Serviio helps bilingual callers place phone orders while staff focus on dine-in and kitchen operations.',
};

const POST_COPY = {
  'AI phone ordering for POS-ready restaurants': 'Serviio helps restaurants answer phone orders 24/7, capture pickup details, and evaluate POS-ready workflows for systems such as 39 Miles, Square, Toast, Clover, MenuSifu, Chowbus, and Mealkeyway.',
  'Bilingual phone answering for Chinese restaurants': 'For Chinese restaurants with lunch and dinner rush phone volume, Serviio can answer in English and Chinese, ask about modifiers, confirm pickup details, and reduce missed-call pressure on staff.',
  'Estimate missed-call revenue before a demo': 'Use the restaurant missed-call revenue calculator to estimate how much weekly takeout revenue may be lost when staff miss calls or manually re-enter phone orders during rush hours.',
};

const PLATFORM_CORE_COPY = {
  'Google Business Profile': [
    'Business description: Serviio is an AI phone ordering system for restaurants. It answers calls 24/7, takes orders in natural conversation, supports English and Chinese, and helps restaurants connect phone orders to POS-ready kitchen workflows.',
    'Primary category: Software company',
    'Services: POS-integrated AI phone ordering; Chinese restaurant AI phone answering; restaurant phone order taker AI; Mandarin and English phone ordering support',
    'Website: https://serviio.ai/ unless Google accepts the UTM profile URL',
    `Authority media kit: ${AUTHORITY_MEDIA_KIT_URL}`,
  ].join(' '),
  'Bing Places for Business': [
    'Import from Google only after Google profile fields are accurate.',
    'Business description: AI phone ordering for restaurants using POS systems such as 39 Miles, Square, Toast, Clover, MenuSifu, Chowbus, and Mealkeyway.',
    'Mirror Google services and include Chinese restaurant AI phone answering.',
    'Website: use the Bing Places UTM URL if accepted.',
    `Authority media kit: ${AUTHORITY_MEDIA_KIT_URL}`,
  ].join(' '),
  'Apple Business Connect': [
    'Business description: Serviio helps restaurants answer phone orders with AI, qualify POS-ready workflows, and reduce missed calls during rush hours.',
    'Action link: https://serviio.ai/chinese-restaurant-pos-ai-phone-agent/?utm_source=apple_business_connect&utm_medium=organic_listing&utm_campaign=free_search_marketing',
    'Showcase: start with 39 Miles AI phone ordering or MenuSifu AI phone ordering.',
    `Authority media kit: ${AUTHORITY_MEDIA_KIT_URL}`,
  ].join(' '),
};

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function parsePositiveInteger(raw, name) {
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error(`${name} must be a positive integer`);
  }
  return parsed;
}

function parseArgs(argv) {
  const args = {
    out: DEFAULT_OUT,
    today: todayIso(),
    limit: 15,
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
    } else if (arg === '--limit') {
      args.limit = parsePositiveInteger(argv[index + 1], '--limit');
      index += 1;
    } else {
      throw new Error(`Unexpected argument: ${arg}`);
    }
  }

  return args;
}

function csvEscape(value) {
  const text = String(value ?? '');
  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function toCsv(rows) {
  return [
    HEADERS.join(','),
    ...rows.map((row) => HEADERS.map((header) => csvEscape(row[header])).join(',')),
  ].join('\n');
}

function profileTrackerRows(rows) {
  return rows.filter((row) => row.priority === 'P0' && row.channel === 'Business profile');
}

function trackerCommand(profilePlatform, rows, today) {
  const trackerRow = profileTrackerRows(rows).find((row) => row.target === profilePlatform);
  if (!trackerRow) return '';
  return `npm run marketing:mark -- --target "${trackerRow.target}" --status submitted --date ${today} --note "Created or claimed business profile item; capture dashboard confirmation and live URL when available."`;
}

function evidenceNeeded(itemType) {
  if (itemType === 'profile_core') {
    return 'dashboard confirmation screenshot, account_or_login, submitted_date, verification status, live profile URL when available';
  }
  if (itemType === 'product_card') {
    return 'product_card_url if available, product_destination_url, dashboard confirmation screenshot, account_or_login, submitted_date';
  }
  return 'profile_post_url if available, post_destination_url, dashboard confirmation screenshot, account_or_login, submitted_date';
}

function nextStep(row) {
  if (row.profile_item_type === 'profile_core') {
    return `Create or claim ${row.profile_platform}, add Serviio NAP, service-area fields, POS/Chinese restaurant positioning, and profile verification evidence.`;
  }
  if (row.profile_item_type === 'product_card') {
    return `Add ${row.item_name} as a product, service, or showcase card on ${row.profile_platform}.`;
  }
  return `Publish or queue the ${row.item_name} profile update on ${row.profile_platform}.`;
}

function copyPastePayload(row) {
  if (row.profile_item_type === 'profile_core') {
    return PLATFORM_CORE_COPY[row.profile_platform];
  }
  if (row.profile_item_type === 'product_card') {
    return PRODUCT_COPY[row.item_name];
  }
  return POST_COPY[row.item_name];
}

function plannedEvidenceRows(rows) {
  const evidenceRows = buildBusinessProfileEvidenceLogRows(rows);
  return PLATFORM_ORDER.flatMap((platform) => {
    const platformRows = evidenceRows.filter((row) => row.profile_platform === platform);
    return PLATFORM_ITEM_PLAN[platform].map((key) => {
      const [itemType, itemName] = key.split(':');
      return platformRows.find((row) =>
        row.profile_item_type === itemType &&
        row.item_name === itemName
      );
    }).filter(Boolean);
  });
}

function buildBusinessProfileExecutionRows(rows, { today = todayIso(), limit = 15 } = {}) {
  return plannedEvidenceRows(rows).slice(0, limit).map((row, index) => ({
    position: index + 1,
    profile_platform: row.profile_platform,
    profile_item_type: row.profile_item_type,
    item_name: row.item_name,
    destination_url: row.destination_url,
    authority_reason: row.profile_item_type === 'profile_core'
      ? 'P0 profile authority and inbound restaurant-owner lead source'
      : 'POS-specific profile content that reinforces restaurant AI phone ordering relevance',
    authority_media_kit_url: AUTHORITY_MEDIA_KIT_URL,
    lead_route: 'Ask every inbound owner which POS system they use; prioritize 39 Miles, Square, Toast, Clover, MenuSifu, Chowbus, and Mealkeyway users.',
    expected_lead_acquisition_channel: 'business_profile',
    next_step: nextStep(row),
    copy_paste_payload: copyPastePayload(row),
    evidence_needed: evidenceNeeded(row.profile_item_type),
    tracker_command: trackerCommand(row.profile_platform, rows, today),
  }));
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log('Usage: node scripts/export-business-profile-execution-queue.js [--out docs/business-profile-execution-queue.csv] [--today YYYY-MM-DD] [--limit 15]');
    return;
  }

  const rows = parseCsv(fs.readFileSync(CSV_PATH, 'utf8'));
  fs.writeFileSync(args.out, `${toCsv(buildBusinessProfileExecutionRows(rows, args))}\n`);
  console.log(`Wrote ${args.out}`);
}

if (require.main === module) {
  main();
}

module.exports = {
  buildBusinessProfileExecutionRows,
  parseArgs,
  toCsv,
};
