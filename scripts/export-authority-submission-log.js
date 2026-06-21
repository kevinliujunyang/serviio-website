const fs = require('fs');
const path = require('path');
const {
  opportunityScore,
  packetFor,
  parseCsv,
  readySubmissionRows,
} = require('./print-free-search-submission-packets');
const {
  leadAcquisitionChannel,
  leadPriority,
  leadRoute,
  primaryKpi,
} = require('./lead-routing');

const CSV_PATH = 'docs/free-search-marketing-tracker.csv';
const DEFAULT_OUT = 'docs/authority-submission-log.csv';
const DEFAULT_FIRST_HOUR_OUT = 'docs/authority-first-hour-submission-log.csv';
const DEFAULT_LIMIT = 15;
const HEADERS = [
  'action_status',
  'priority',
  'channel',
  'target',
  'submission_type',
  'lead_priority',
  'lead_route',
  'primary_kpi',
  'expected_lead_acquisition_channel',
  'next_step',
  'evidence_needed',
  'execution_checklist',
  'opportunity_score',
  'opportunity_reasons',
  'submission_url',
  'clean_url',
  'utm_url',
  'anchor_or_listing_phrase',
  'title_or_subject',
  'tagline',
  'message_or_listing_copy',
  'evidence_url',
  'account_or_login',
  'confirmation_note',
  'submitted_date',
  'live_date',
  'follow_up_date',
  'tracker_command',
];

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function addDaysIso(date, days) {
  const parsed = new Date(`${date}T00:00:00Z`);
  parsed.setUTCDate(parsed.getUTCDate() + days);
  return parsed.toISOString().slice(0, 10);
}

function parsePositiveInteger(name, value) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error(`${name} must be a positive integer`);
  }
  return parsed;
}

function parseArgs(argv) {
  const args = {
    out: DEFAULT_OUT,
    limit: DEFAULT_LIMIT,
    today: todayIso(),
    firstHour: false,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help' || arg === '-h') {
      args.help = true;
    } else if (arg === '--first-hour') {
      args.firstHour = true;
      if (args.out === DEFAULT_OUT) {
        args.out = DEFAULT_FIRST_HOUR_OUT;
      }
    } else if (arg === '--out') {
      args.out = argv[index + 1] || DEFAULT_OUT;
      index += 1;
    } else if (arg === '--limit') {
      args.limit = parsePositiveInteger('--limit', argv[index + 1]);
      index += 1;
    } else if (arg === '--today') {
      args.today = argv[index + 1] || args.today;
      index += 1;
    } else {
      throw new Error(`Unexpected argument: ${arg}`);
    }
  }

  if (!args.help && !/^\d{4}-\d{2}-\d{2}$/.test(args.today)) {
    throw new Error('--today must use YYYY-MM-DD');
  }

  return args;
}

function quoteShell(text) {
  return `"${String(text).replace(/"/g, '\\"')}"`;
}

function trackerCommand(row, today, followUpDate) {
  return `npm run marketing:mark -- --target ${quoteShell(row.target)} --status submitted --date ${today} --note "Submitted/contacted; add confirmation URL and account used. Follow up: ${followUpDate}."`;
}

function messageOrListingCopy(packet) {
  return [
    packet.subject ? `Subject: ${packet.subject}` : '',
    `Title: ${packet.title}`,
    packet.tagline ? `Tagline: ${packet.tagline}` : '',
    packet.shortDescription ? `Short description: ${packet.shortDescription}` : '',
    packet.longDescription,
    packet.followUp ? `Follow-up: ${packet.followUp}` : '',
  ].filter(Boolean).join(' | ').replace(/\s+/g, ' ').trim();
}

function submissionType(row) {
  if (row.target === 'Product Hunt Serviio listing') {
    return 'startup_directory';
  }
  if (/business profile/i.test(row.channel)) {
    return 'business_profile';
  }
  if (/directory|listing/i.test(row.channel)) {
    return 'directory_listing';
  }
  if (/customer proof/i.test(row.channel)) {
    return 'customer_proof';
  }
  if (/association|chamber|community/i.test(row.channel)) {
    return 'association_contact';
  }
  if (/partner|POS|consultant/i.test(`${row.channel} ${row.target}`)) {
    return 'partner_contact';
  }
  return 'organic_outreach';
}

function nextStep(row) {
  const type = submissionType(row);
  if (row.target === 'Product Hunt Serviio listing') {
    return 'Claim or verify the Product Hunt page, update the restaurant AI phone ordering and POS integration positioning if access is available, then record an updated listing screenshot or owner/account confirmation URL.';
  }
  if (type === 'directory_listing') {
    return 'Submit the listing using the provided title, tagline, landing URL, and restaurant AI phone ordering copy.';
  }
  if (type === 'business_profile') {
    return 'Create or update the business profile with Serviio contact details, service area, website URL, and restaurant AI phone ordering category.';
  }
  if (type === 'customer_proof') {
    return 'Request approval for a testimonial, case study, or anonymized proof point, then attach the live proof URL.';
  }
  if (type === 'association_contact') {
    return 'Contact the association, chamber, or community moderator with the approved restaurant-owner education angle.';
  }
  if (type === 'partner_contact') {
    return 'Contact the partner or consultant with the POS-integrated restaurant AI phone ordering referral angle.';
  }
  return 'Send the outreach or submission using the prepared copy, then record confirmation details.';
}

function evidenceNeeded(row) {
  const type = submissionType(row);
  if (row.target === 'Product Hunt Serviio listing') {
    return 'Product Hunt claimed profile, updated listing screenshot, or owner/account confirmation URL.';
  }
  if (type === 'directory_listing') {
    return 'Submission confirmation URL or live directory listing URL.';
  }
  if (type === 'business_profile') {
    return 'Published profile URL, verification screenshot, or dashboard confirmation.';
  }
  if (type === 'customer_proof') {
    return 'Published testimonial/case-study URL or written customer approval note.';
  }
  if (type === 'association_contact') {
    return 'Moderator reply, approved post URL, event/resource listing URL, or sent-message URL.';
  }
  if (type === 'partner_contact') {
    return 'Partner reply, referral-page URL, submitted form confirmation, or sent-message URL.';
  }
  return 'Confirmation URL, live link, reply, screenshot, or sent-message URL.';
}

function executionChecklist(row) {
  if (/business profile/i.test(row.channel) && /google/i.test(row.target)) {
    return [
      'Use clean homepage URL if Google rejects UTM parameters.',
      'Add service-area business details, phone, website, logo, restaurant technology category, services, products, Q&A, and one update post.',
      'Capture verification screenshot or dashboard confirmation, account/login used, submitted date, and pending review status.',
    ].join(' ');
  }

  if (/business profile/i.test(row.channel) && /bing/i.test(row.target)) {
    return [
      'Import from Google only after Google Business Profile fields are accurate.',
      'Use Bing Places website URL with utm_source=bing_places if accepted; otherwise use clean homepage URL and record the source manually.',
      'Mirror Google services and include Chinese restaurant AI phone answering, POS-integrated AI phone ordering, and restaurant phone order taker AI.',
      'Capture profile dashboard screenshot, account/login used, submitted date, verification or sync status, and seven-day follow-up date.',
    ].join(' ');
  }

  if (/business profile/i.test(row.channel) && /apple/i.test(row.target)) {
    return [
      'Add action link to the Chinese restaurant POS AI phone agent page.',
      'Use 39 Miles AI phone ordering or MenuSifu AI phone ordering as the first POS-specific showcase.',
      'Add service-area description, logo, cover image, website, phone, and restaurant technology positioning.',
      'Capture Business Connect dashboard screenshot, account/login used, submitted date, verification status, and seven-day follow-up date.',
    ].join(' ');
  }

  if (/pos-specific outreach/i.test(row.channel) && /menusifu/i.test(row.target)) {
    return [
      'Submit MenuSifu partner or demo form with Serviio POS-ready phone-order copy.',
      'Ask for referral or integration contact path for Chinese restaurants using MenuSifu.',
      'Capture submitted form confirmation, account/login or email used, submitted date, and seven-day follow-up date.',
    ].join(' ');
  }

  if (/pos-specific outreach/i.test(row.channel) && /39\s*miles/i.test(row.target)) {
    return [
      'Contact 39 Miles/MENUPO using the official contact path with Serviio POS-ready phone-order copy.',
      'Ask for referral, integration, or consultant contact path for Chinese restaurants using 39 Miles.',
      'Capture sent-message URL or screenshot, account/login or email used, submitted date, and seven-day follow-up date.',
    ].join(' ');
  }

  if (/customer proof/i.test(row.channel)) {
    return [
      'Send customer proof request link to a pilot, demo, or customer contact.',
      'Ask for city, restaurant type, POS system, weekly phone-order volume, phone-order pain, quote, and publication permission.',
      'Capture written approval, submitted proof form URL or screenshot, submitted date, and follow-up date.',
    ].join(' ');
  }

  if (/partner|POS|consultant/i.test(`${row.channel} ${row.target}`)) {
    return 'Send partner outreach copy, ask for referral or backlink/resource-listing path, and capture sent-message or submitted-form proof plus follow-up date.';
  }

  if (/directory|listing|startup/i.test(row.channel)) {
    return 'Submit listing copy, capture confirmation or live listing URL, account/login used, submitted date, and follow-up date.';
  }

  return 'Complete the external action, then capture confirmation evidence, account/login used, submitted date, and follow-up date.';
}

function reservedMilestoneRows(rows) {
  return rows.filter((row) => (
    row.status === 'not_started' &&
    (
      (/business profile/i.test(row.channel) && row.priority === 'P0') ||
      /customer proof/i.test(row.channel)
    ) &&
    row.url
  ));
}

function authoritySubmissionSourceRows(rows, limit) {
  const reservedRows = reservedMilestoneRows(rows);
  const reservedTargets = new Set(reservedRows.map((row) => row.target));
  const fillerRows = readySubmissionRows(rows)
    .filter((row) => !reservedTargets.has(row.target))
    .slice(0, Math.max(0, limit - reservedRows.length));

  return [
    ...fillerRows,
    ...reservedRows,
  ].slice(0, limit);
}

function firstHourSubmissionSourceRows(rows) {
  const selected = [];
  const usedTargets = new Set();
  const addFirst = (predicate) => {
    const row = rows.find((candidate) => !usedTargets.has(candidate.target) && predicate(candidate));
    if (row) {
      usedTargets.add(row.target);
      selected.push(row);
    }
  };

  addFirst((row) => /business profile/i.test(row.channel) && /google/i.test(row.target));
  addFirst((row) => /pos-specific outreach/i.test(row.channel) && /menusifu/i.test(row.target));
  addFirst((row) => /pos-specific outreach/i.test(row.channel) && /39 miles/i.test(row.target));
  addFirst((row) => /customer proof/i.test(row.channel));

  return selected;
}

function buildAuthoritySubmissionLogRows(rows, { limit = DEFAULT_LIMIT, today = todayIso(), firstHour = false } = {}) {
  const followUpDate = addDaysIso(today, 7);
  const sourceRows = firstHour ? firstHourSubmissionSourceRows(rows) : authoritySubmissionSourceRows(rows, limit);
  return sourceRows.map((row) => {
    const packet = packetFor(row);
    const score = opportunityScore(row);
    return {
      action_status: '',
      priority: row.priority,
      channel: row.channel,
      target: row.target,
      submission_type: submissionType(row),
      lead_priority: leadPriority(row),
      lead_route: leadRoute(row),
      primary_kpi: primaryKpi(row),
      expected_lead_acquisition_channel: leadAcquisitionChannel(row),
      next_step: nextStep(row),
      evidence_needed: evidenceNeeded(row),
      execution_checklist: executionChecklist(row),
      opportunity_score: score.score,
      opportunity_reasons: score.reasons,
      submission_url: row.url,
      clean_url: row.landing_url,
      utm_url: row.utm_url,
      anchor_or_listing_phrase: row.anchor_or_listing_phrase,
      title_or_subject: packet.subject || packet.title,
      tagline: packet.tagline,
      message_or_listing_copy: messageOrListingCopy(packet),
      evidence_url: '',
      account_or_login: '',
      confirmation_note: '',
      submitted_date: '',
      live_date: '',
      follow_up_date: followUpDate,
      tracker_command: trackerCommand(row, today, followUpDate),
    };
  });
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

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log('Usage: node scripts/export-authority-submission-log.js [--out docs/authority-submission-log.csv] [--limit 15] [--today YYYY-MM-DD]');
    return;
  }

  const rows = parseCsv(fs.readFileSync(CSV_PATH, 'utf8'));
  const logRows = buildAuthoritySubmissionLogRows(rows, { limit: args.limit, today: args.today, firstHour: args.firstHour });
  const outPath = path.resolve(args.out);
  fs.writeFileSync(outPath, `${toCsv(logRows)}\n`);
  console.log(`Wrote ${logRows.length} authority submission log rows to ${outPath}`);
}

if (require.main === module) {
  main();
}

module.exports = {
  addDaysIso,
  authoritySubmissionSourceRows,
  buildAuthoritySubmissionLogRows,
  evidenceNeeded,
  executionChecklist,
  parseArgs,
  nextStep,
  reservedMilestoneRows,
  submissionType,
  trackerCommand,
  toCsv,
};
