const fs = require('fs');
const path = require('path');
const { parseCsv, scoreLead, summarize } = require('./score-formspree-leads');

const HELP = `Usage:
  node scripts/export-partner-pipeline-leads.js path/to/formspree-export.csv [--out partner-pipeline-leads.csv] [--summary-only]

Exports strategic POS/referral partner inquiries, including backlink or resource-listing follow-up.
`;

const PARTNER_HEADERS = [
  'pipeline_priority',
  'partner_name',
  'partner_city',
  'partner_state',
  'contact_name',
  'contact_email',
  'contact_phone',
  'partner_website',
  'partner_type',
  'monthly_referrals_estimate',
  'partner_referral_volume_tier',
  'pos_focus',
  'phone_orders_per_week',
  'main_pain',
  'pos_recommendation_interest',
  'lead_source',
  'lead_acquisition_channel',
  'landing_path',
  'lead_score',
  'buyer_profile',
  'partner_authority_opportunity',
  'authority_opportunity',
  'partner_next_action',
  'authority_next_step',
  'partner_pitch',
  'authority_tracker_target',
  'authority_tracker_note',
  'authority_tracker_command_template',
];

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

function csvEscape(value) {
  const text = String(value ?? '');
  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function toCsv(rows) {
  return [
    PARTNER_HEADERS.join(','),
    ...rows.map((row) => PARTNER_HEADERS.map((header) => csvEscape(row[header])).join(',')),
  ].join('\n');
}

function buildRecords(csvRows) {
  if (csvRows.length < 2) {
    throw new Error('CSV must include a header row and at least one lead row.');
  }

  const headers = csvRows[0].map((header) => header.trim());
  return csvRows.slice(1).map((row) => Object.fromEntries(
    headers.map((header, index) => [header, row[index] || '']),
  ));
}

function pipelinePriority(row) {
  if (row.partner_authority_opportunity === 'yes' && Number(row.lead_score) >= 60) return 'P0';
  if (row.partner_authority_opportunity === 'yes') return 'P1';
  return 'P2';
}

function authorityNextStep(row) {
  const partnerSite = row.partner_website || 'the partner website';
  if (row.partner_authority_opportunity === 'yes') {
    return `Ask for a resource listing or backlink from ${partnerSite}, using the restaurant POS partner referral page as the primary URL.`;
  }
  return 'Ask whether a resource listing, vendor page, newsletter mention, or referral-page link is possible.';
}

function partnerPitch(row) {
  const partner = row.restaurant_name || 'the partner';
  const location = [row.restaurant_city, row.restaurant_state].filter(Boolean).join(', ') || 'their market';
  const pain = row.main_pain || 'restaurant phone-order pressure';
  const posFocus = row.pos_system || row.pos_focus || 'multiple POS systems';
  const partnerType = row.partner_type || 'restaurant technology partner';
  const referralVolume = row.monthly_referrals_estimate || 'unknown monthly referral volume';
  return [
    `${partner} in ${location} is a strategic ${partnerType} lead.`,
    `Expected referral flow: ${referralVolume}.`,
    `Their POS focus is ${posFocus}, and their referred restaurants report ${row.phone_orders_per_week || 'unknown'} weekly phone orders.`,
    `Use the partner conversation to discuss referrals for Chinese restaurants and takeout-heavy operators using 39 Miles, Square, Toast, Clover, MenuSifu, Chowbus, Mealkeyway, or similar systems.`,
    `Pain signal: ${pain}.`,
  ].join(' ');
}

function authorityTrackerCommandTemplate(row) {
  const target = row.restaurant_name || 'Restaurant POS partner';
  const note = `Partner pipeline follow-up for ${target}: referral path plus backlink/resource listing ask`;
  return `npm run marketing:mark -- --target "POS consultants" --status submitted --date YYYY-MM-DD --note "${note}; evidence: SENT_MESSAGE_OR_REPLY_URL"`;
}

function buildPartnerPipelineRows(scoredRows) {
  return scoredRows
    .filter((row) => row.lead_route === 'partner_pipeline')
    .sort((a, b) => {
      const priorityDiff = pipelinePriority(a).localeCompare(pipelinePriority(b));
      if (priorityDiff) return priorityDiff;
      return Number(b.lead_score) - Number(a.lead_score);
    })
    .map((row) => ({
      pipeline_priority: pipelinePriority(row),
      partner_name: row.restaurant_name,
      partner_city: row.restaurant_city,
      partner_state: row.restaurant_state,
      contact_name: row.contact_name,
      contact_email: row.contact_email,
      contact_phone: row.contact_phone,
      partner_website: row.partner_website,
      partner_type: row.partner_type,
      monthly_referrals_estimate: row.monthly_referrals_estimate,
      partner_referral_volume_tier: row.partner_referral_volume_tier,
      pos_focus: row.pos_system || row.pos_focus,
      phone_orders_per_week: row.phone_orders_per_week,
      main_pain: row.main_pain,
      pos_recommendation_interest: row.pos_recommendation_interest,
      lead_source: row.lead_source,
      lead_acquisition_channel: row.lead_acquisition_channel,
      landing_path: row.landing_path,
      lead_score: row.lead_score,
      buyer_profile: row.buyer_profile,
      partner_authority_opportunity: row.partner_authority_opportunity,
      authority_opportunity: row.authority_opportunity,
      partner_next_action: row.partner_next_action,
      authority_next_step: authorityNextStep(row),
      partner_pitch: partnerPitch(row),
      authority_tracker_target: 'POS consultants',
      authority_tracker_note: `Follow up with ${row.restaurant_name || 'partner lead'} for referrals and authority link opportunity.`,
      authority_tracker_command_template: authorityTrackerCommandTemplate(row),
    }));
}

function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help || !args.input) {
    process.stdout.write(HELP);
    process.exit(args.help ? 0 : 1);
  }

  const inputPath = path.resolve(args.input);
  const records = buildRecords(parseCsv(fs.readFileSync(inputPath, 'utf8')));
  const scoredRows = records.map(scoreLead);
  const partnerRows = buildPartnerPipelineRows(scoredRows);
  const summary = [
    summarize(scoredRows),
    '',
    `Partner pipeline leads: ${partnerRows.length}`,
  ].join('\n');

  if (args.summaryOnly) {
    process.stdout.write(`${summary}\n`);
    return;
  }

  const output = `${toCsv(partnerRows)}\n`;
  if (args.out) {
    const outPath = path.resolve(args.out);
    fs.writeFileSync(outPath, output);
    process.stdout.write(`${summary}\n\nWrote partner pipeline leads to ${outPath}\n`);
  } else {
    process.stdout.write(`${summary}\n\n${output}`);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  buildPartnerPipelineRows,
  parseArgs,
  toCsv,
};
