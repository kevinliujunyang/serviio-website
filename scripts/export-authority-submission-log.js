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
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help' || arg === '-h') {
      args.help = true;
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

function buildAuthoritySubmissionLogRows(rows, { limit = DEFAULT_LIMIT, today = todayIso() } = {}) {
  const followUpDate = addDaysIso(today, 7);
  return readySubmissionRows(rows).slice(0, limit).map((row) => {
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
  const logRows = buildAuthoritySubmissionLogRows(rows, { limit: args.limit, today: args.today });
  const outPath = path.resolve(args.out);
  fs.writeFileSync(outPath, `${toCsv(logRows)}\n`);
  console.log(`Wrote ${logRows.length} authority submission log rows to ${outPath}`);
}

if (require.main === module) {
  main();
}

module.exports = {
  addDaysIso,
  buildAuthoritySubmissionLogRows,
  evidenceNeeded,
  parseArgs,
  nextStep,
  submissionType,
  toCsv,
};
