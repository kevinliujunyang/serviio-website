const fs = require('fs');
const path = require('path');

const HELP = `Usage:
  node scripts/score-formspree-leads.js path/to/formspree-export.csv [--out scored.csv] [--summary-only]

Scores Formspree leads for Serviio's restaurant AI phone ordering funnel.
`;

const FIELD_ALIASES = {
  restaurant: ['restaurant', 'restaurant_name', 'restaurant name', 'business_name', 'business name', 'company'],
  name: ['name', 'full_name', 'full name', 'contact_name', 'contact name'],
  email: ['email', 'email_address', 'email address'],
  phone: ['phone', 'phone_number', 'phone number', 'mobile'],
  city: ['restaurant_city', 'city', 'restaurant city'],
  state: ['restaurant_state', 'state', 'restaurant state'],
  pos: ['pos_system', 'pos system', 'pos_status', 'pos status', 'current_pos', 'current pos'],
  phoneOrders: ['phone_orders_per_week', 'phone orders per week', 'weekly_phone_orders', 'weekly phone orders'],
  posRecommendationInterest: [
    'pos_recommendation_interest',
    'pos recommendation interest',
    'interested_in_pos',
    'interested in pos',
  ],
  leadSource: ['lead_source', 'lead source'],
  landingPage: ['landing_page', 'landing page'],
  landingPath: ['landing_path', 'landing path'],
  currentPage: ['current_page', 'current page'],
  currentPath: ['current_path', 'current path'],
  firstUtmSource: ['first_utm_source', 'first utm source'],
  firstUtmMedium: ['first_utm_medium', 'first utm medium'],
  firstUtmCampaign: ['first_utm_campaign', 'first utm campaign'],
  utmSource: ['utm_source', 'utm source'],
  utmMedium: ['utm_medium', 'utm medium'],
  utmCampaign: ['utm_campaign', 'utm campaign'],
};

const NAMED_POS_PATTERN = /39\s*miles|square|toast|clover|menusifu|menu\s*sifu|chowbus|mealkeyway/i;
const OTHER_POS_PATTERN = /(^|\b)(other|another|existing|current|custom|local|legacy)\s+(pos|point\s*of\s*sale)\b|\b(already\s+have|use|using|on)\s+(a\s+)?(pos|point\s*of\s*sale)\b/i;
const NO_POS_PATTERN = /(^|\b)(no|none|not applicable|n\/a|without)\s*(pos)?($|\b)|\u6682\u65f6\u6ca1\u6709/i;
const WANTS_POS_PATTERN = /(^|\b)(yes|y|interested|maybe|recommend|recommendation|consider)\b|\u5e0c\u671b/i;
const CHINESE_INTENT_PATTERN = /chinese|asian|zh|mandarin|cantonese|menusifu|menu\s*sifu|chowbus|39\s*miles|[\u4e00-\u9fff]/i;
const PRIORITY_SOURCE_PATTERN = /chinese|asian|pos|automation|phone-order|phone_order|ai-phone|service-area|service_area|restaurant-ai/i;

function routeLead({ posReady, noPos, wantsPosRecommendation, highVolume, mediumVolume, chineseIntent, prioritySource }) {
  if (posReady && highVolume && (chineseIntent || prioritySource)) {
    return {
      route: 'call_now',
      nextAction: 'Call within 24 hours; qualify POS integration path and demo timing.',
    };
  }
  if (posReady && (mediumVolume || chineseIntent || prioritySource)) {
    return {
      route: 'demo_queue',
      nextAction: 'Follow up with POS workflow questions and offer an AI phone-order fit check.',
    };
  }
  if (noPos && wantsPosRecommendation) {
    return {
      route: 'pos_referral',
      nextAction: 'Ask whether they want POS recommendations before AI phone ordering.',
    };
  }
  if (noPos) {
    return {
      route: 'nurture_no_pos',
      nextAction: 'Nurture with POS-readiness content; deprioritize immediate AI setup.',
    };
  }
  return {
    route: 'manual_review',
    nextAction: 'Review manually; confirm POS, phone-order volume, and restaurant fit.',
  };
}

function parseArgs(argv) {
  const args = { input: '', out: '', summaryOnly: false };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help' || arg === '-h') {
      args.help = true;
    } else if (arg === '--summary-only') {
      args.summaryOnly = true;
    } else if (arg === '--out') {
      args.out = argv[index + 1] || '';
      index += 1;
    } else if (!args.input) {
      args.input = arg;
    } else {
      throw new Error(`Unexpected argument: ${arg}`);
    }
  }

  return args;
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        field += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      row.push(field);
      field = '';
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') {
        index += 1;
      }
      row.push(field);
      if (row.some((value) => value.trim() !== '')) {
        rows.push(row);
      }
      row = [];
      field = '';
    } else {
      field += char;
    }
  }

  if (field !== '' || row.length > 0) {
    row.push(field);
    if (row.some((value) => value.trim() !== '')) {
      rows.push(row);
    }
  }

  return rows;
}

function normalizeHeader(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ');
}

function csvEscape(value) {
  const text = String(value ?? '');
  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function toCsv(headers, rows) {
  return [
    headers.map(csvEscape).join(','),
    ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(',')),
  ].join('\n');
}

function buildRecords(csvRows) {
  if (csvRows.length < 2) {
    throw new Error('CSV must include a header row and at least one lead row.');
  }

  const headers = csvRows[0].map((header) => header.trim());

  return csvRows.slice(1).map((row) => {
    const record = {};
    headers.forEach((header, index) => {
      record[header] = row[index] || '';
    });
    return record;
  });
}

function readField(record, aliases) {
  const normalizedToOriginal = new Map(
    Object.keys(record).map((key) => [normalizeHeader(key), key]),
  );

  for (const alias of aliases) {
    const original = normalizedToOriginal.get(normalizeHeader(alias));
    if (original && String(record[original] || '').trim() !== '') {
      return String(record[original]).trim();
    }
  }

  return '';
}

function leadValues(record) {
  return Object.fromEntries(
    Object.entries(FIELD_ALIASES).map(([key, aliases]) => [key, readField(record, aliases)]),
  );
}

function classifyPhoneVolume(value) {
  const text = String(value || '').toLowerCase();
  const numbers = text.match(/\d+/g)?.map(Number) || [];
  const maxNumber = Math.max(0, ...numbers);

  if (/150\+|151|150\s*or\s*more|150\s*plus/i.test(text) || maxNumber >= 150) {
    return 'high';
  }
  if (/76\s*-\s*150|76\+|100/i.test(text) || maxNumber >= 76) {
    return 'high';
  }
  if (/25\s*-\s*75|26\s*-\s*75|50/i.test(text) || maxNumber >= 25) {
    return 'medium';
  }
  if (/under\s*25|less\s*than\s*25|0\s*-\s*24|low/i.test(text) || (maxNumber > 0 && maxNumber < 25)) {
    return 'low';
  }
  return 'unknown';
}

function hasKnownPos(value) {
  const text = String(value || '');
  return NAMED_POS_PATTERN.test(text) || OTHER_POS_PATTERN.test(text);
}

function scoreLead(record) {
  const values = leadValues(record);
  const posText = values.pos.toLowerCase();
  const sourceText = [
    values.restaurant,
    values.leadSource,
    values.landingPage,
    values.landingPath,
    values.currentPage,
    values.currentPath,
    values.firstUtmSource,
    values.firstUtmMedium,
    values.firstUtmCampaign,
    values.utmSource,
    values.utmMedium,
    values.utmCampaign,
  ].join(' ');

  const noPos = NO_POS_PATTERN.test(posText);
  const posReady = !noPos && hasKnownPos(values.pos);
  const wantsPosRecommendation = WANTS_POS_PATTERN.test(values.posRecommendationInterest);
  const volume = classifyPhoneVolume(values.phoneOrders);
  const highVolume = volume === 'high';
  const mediumVolume = volume === 'medium';
  const chineseIntent = CHINESE_INTENT_PATTERN.test(sourceText);
  const prioritySource = PRIORITY_SOURCE_PATTERN.test(sourceText);
  const hasUsLocation = values.city !== '' && values.state !== '';

  let score = 0;
  const reasons = [];

  if (posReady) {
    score += 25;
    reasons.push('existing POS');
  }
  if (highVolume) {
    score += 20;
    reasons.push('76+ weekly phone orders');
  } else if (mediumVolume) {
    score += 10;
    reasons.push('25-75 weekly phone orders');
  }
  if (chineseIntent) {
    score += 20;
    reasons.push('Chinese or Asian restaurant intent');
  }
  if (prioritySource) {
    score += 10;
    reasons.push('priority SEO source/page');
  }
  if (hasUsLocation) {
    score += 5;
    reasons.push('city/state captured');
  }
  if (values.phone) {
    score += 5;
    reasons.push('phone captured');
  }
  if (noPos && !wantsPosRecommendation) {
    score -= 15;
    reasons.push('no POS and no POS recommendation interest');
  }
  if (noPos && wantsPosRecommendation) {
    reasons.push('no POS but wants POS recommendation');
  }

  let priority = 'review';
  if (posReady && highVolume && (chineseIntent || prioritySource)) {
    priority = 'high';
  } else if (posReady && (mediumVolume || prioritySource || chineseIntent)) {
    priority = 'medium';
  } else if (noPos && wantsPosRecommendation) {
    priority = 'nurture';
  }
  const routing = routeLead({
    posReady,
    noPos,
    wantsPosRecommendation,
    highVolume,
    mediumVolume,
    chineseIntent,
    prioritySource,
  });

  return {
    lead_priority: priority,
    lead_route: routing.route,
    lead_next_action: routing.nextAction,
    lead_score: Math.max(0, Math.min(100, score)),
    lead_reason: reasons.length ? reasons.join('; ') : 'manual review needed',
    restaurant_name: values.restaurant,
    contact_name: values.name,
    contact_email: values.email,
    contact_phone: values.phone,
    restaurant_city: values.city,
    restaurant_state: values.state,
    pos_system: values.pos,
    phone_orders_per_week: values.phoneOrders,
    pos_recommendation_interest: values.posRecommendationInterest,
    lead_source: values.leadSource,
    landing_path: values.landingPath || values.currentPath,
    ...record,
  };
}

function summarize(scoredRows) {
  const counts = { high: 0, medium: 0, nurture: 0, review: 0 };
  const routeCounts = {};
  scoredRows.forEach((row) => {
    counts[row.lead_priority] = (counts[row.lead_priority] || 0) + 1;
    routeCounts[row.lead_route] = (routeCounts[row.lead_route] || 0) + 1;
  });

  const lines = [
    'Lead scoring summary',
    `- Total leads: ${scoredRows.length}`,
    `- High priority: ${counts.high}`,
    `- Medium priority: ${counts.medium}`,
    `- Nurture/referral: ${counts.nurture}`,
    `- Manual review: ${counts.review}`,
    `- Call now route: ${routeCounts.call_now || 0}`,
    `- Demo queue route: ${routeCounts.demo_queue || 0}`,
    `- POS referral route: ${routeCounts.pos_referral || 0}`,
  ];

  const topLeads = scoredRows
    .filter((row) => row.lead_priority === 'high')
    .sort((a, b) => Number(b.lead_score) - Number(a.lead_score))
    .slice(0, 5);

  if (topLeads.length > 0) {
    lines.push('', 'Top high-priority leads:');
    topLeads.forEach((row) => {
      lines.push(
        `- ${row.restaurant_name || 'Unknown restaurant'} (${row.restaurant_city || 'city unknown'}, ${row.restaurant_state || 'state unknown'}): ${row.pos_system || 'POS unknown'}, ${row.phone_orders_per_week || 'volume unknown'}, score ${row.lead_score}`,
      );
    });
  }

  return lines.join('\n');
}

function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help || !args.input) {
    process.stdout.write(HELP);
    process.exit(args.help ? 0 : 1);
  }

  const inputPath = path.resolve(args.input);
  const csvRows = parseCsv(fs.readFileSync(inputPath, 'utf8'));
  const records = buildRecords(csvRows);
  const scoredRows = records.map(scoreLead);
  const summary = summarize(scoredRows);

  if (args.summaryOnly) {
    process.stdout.write(`${summary}\n`);
    return;
  }

  const scoreHeaders = [
    'lead_priority',
    'lead_route',
    'lead_next_action',
    'lead_score',
    'lead_reason',
    'restaurant_name',
    'contact_name',
    'contact_email',
    'contact_phone',
    'restaurant_city',
    'restaurant_state',
    'pos_system',
    'phone_orders_per_week',
    'pos_recommendation_interest',
    'lead_source',
    'landing_path',
  ];
  const originalHeaders = Object.keys(records[0] || {}).filter((header) => !scoreHeaders.includes(header));
  const output = `${toCsv([...scoreHeaders, ...originalHeaders], scoredRows)}\n`;

  if (args.out) {
    const outPath = path.resolve(args.out);
    fs.writeFileSync(outPath, output);
    process.stdout.write(`${summary}\n\nWrote scored leads to ${outPath}\n`);
  } else {
    process.stdout.write(`${summary}\n\n${output}`);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  classifyPhoneVolume,
  hasKnownPos,
  parseCsv,
  scoreLead,
  summarize,
};
