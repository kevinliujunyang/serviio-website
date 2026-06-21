const fs = require('fs');
const path = require('path');
const { parseCsv, scoreLead, summarize } = require('./score-formspree-leads');

const HELP = `Usage:
  node scripts/export-lead-page-performance.js path/to/formspree-export.csv [--out lead-page-performance.csv] [--summary-only]

Groups scored Formspree leads by SEO landing page so ranking work can be tied to qualified lead quality.
`;

const PAGE_HEADERS = [
  'landing_path',
  'total_leads',
  'high_priority_leads',
  'medium_priority_leads',
  'demo_fit_leads',
  'call_now_leads',
  'demo_queue_leads',
  'pos_referral_leads',
  'partner_pipeline_leads',
  'authority_opportunity_leads',
  'customer_proof_candidate_leads',
  'top_lead_acquisition_channel',
  'top_conversion_offer',
  'top_pos_systems',
  'estimated_recoverable_revenue_total',
  'estimated_serviio_fee_total',
  'avg_lead_score',
  'best_lead_score',
  'next_action',
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
    PAGE_HEADERS.join(','),
    ...rows.map((row) => PAGE_HEADERS.map((header) => csvEscape(row[header])).join(',')),
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

function countBy(rows, field) {
  const counts = new Map();
  rows.forEach((row) => {
    const value = row[field] || 'unknown';
    counts.set(value, (counts.get(value) || 0) + 1);
  });
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

function topValues(rows, field, limit = 3) {
  return countBy(rows, field)
    .slice(0, limit)
    .map(([value, count]) => `${value}:${count}`)
    .join(' | ');
}

function parseMoney(value) {
  const number = Number(String(value || '').replace(/[^0-9.-]/g, ''));
  return Number.isFinite(number) ? number : 0;
}

function formatMoney(value) {
  return `$${Math.round(value).toLocaleString('en-US')}`;
}

function landingPath(row) {
  if (row.landing_path) return row.landing_path;
  try {
    return new URL(row.landing_page || '/', 'https://serviio.ai').pathname;
  } catch {
    return '/';
  }
}

function nextAction(row) {
  if (row.demo_fit_leads > 0 && row.pos_referral_leads > 0) {
    return 'Protect this page: it produces both Serviio demo leads and POS referral leads; keep it prominent in SEO and authority outreach.';
  }
  if (row.demo_fit_leads > 0) {
    return 'Protect this page and use Search Console to improve CTR for POS-ready demo queries.';
  }
  if (row.pos_referral_leads > 0) {
    return 'Use this page for POS partner follow-up and no-POS owner monetization.';
  }
  if (row.partner_pipeline_leads > 0 || row.authority_opportunity_leads > 0) {
    return 'Route to partner follow-up and ask for referral path, resource listing, or backlink evidence.';
  }
  return 'Review query fit, page copy, and form completion quality before adding more traffic.';
}

function buildLeadPagePerformanceRows(scoredRows) {
  const groups = new Map();
  scoredRows.forEach((row) => {
    const key = landingPath(row);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  });

  return [...groups.entries()]
    .map(([pathKey, rows]) => {
      const leadScores = rows.map((row) => Number(row.lead_score) || 0);
      const row = {
        landing_path: pathKey,
        total_leads: rows.length,
        high_priority_leads: rows.filter((lead) => lead.lead_priority === 'high').length,
        medium_priority_leads: rows.filter((lead) => lead.lead_priority === 'medium').length,
        demo_fit_leads: rows.filter((lead) => lead.serviio_fit_status === 'serviio_demo_fit').length,
        call_now_leads: rows.filter((lead) => lead.lead_route === 'call_now').length,
        demo_queue_leads: rows.filter((lead) => lead.lead_route === 'demo_queue').length,
        pos_referral_leads: rows.filter((lead) => lead.lead_route === 'pos_referral').length,
        partner_pipeline_leads: rows.filter((lead) => lead.lead_route === 'partner_pipeline').length,
        authority_opportunity_leads: rows.filter((lead) => lead.partner_authority_opportunity === 'yes').length,
        customer_proof_candidate_leads: rows.filter((lead) =>
          lead.serviio_fit_status === 'serviio_demo_fit' &&
          ['call_now', 'demo_queue'].includes(lead.lead_route)
        ).length,
        top_lead_acquisition_channel: topValues(rows, 'lead_acquisition_channel', 2),
        top_conversion_offer: topValues(rows, 'conversion_offer', 2),
        top_pos_systems: topValues(rows, 'pos_system', 3),
        estimated_recoverable_revenue_total: formatMoney(rows.reduce((sum, lead) => sum + parseMoney(lead.estimated_recoverable_revenue), 0)),
        estimated_serviio_fee_total: formatMoney(rows.reduce((sum, lead) => sum + parseMoney(lead.estimated_serviio_fee), 0)),
        avg_lead_score: Math.round(leadScores.reduce((sum, score) => sum + score, 0) / Math.max(leadScores.length, 1)),
        best_lead_score: Math.max(...leadScores),
      };
      return {
        ...row,
        next_action: nextAction(row),
      };
    })
    .sort((a, b) => {
      const demoDiff = b.demo_fit_leads - a.demo_fit_leads;
      if (demoDiff) return demoDiff;
      const referralDiff = b.pos_referral_leads - a.pos_referral_leads;
      if (referralDiff) return referralDiff;
      const partnerDiff = b.partner_pipeline_leads - a.partner_pipeline_leads;
      if (partnerDiff) return partnerDiff;
      const scoreDiff = b.best_lead_score - a.best_lead_score;
      if (scoreDiff) return scoreDiff;
      return a.landing_path.localeCompare(b.landing_path);
    });
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
  const pageRows = buildLeadPagePerformanceRows(scoredRows);
  const summary = [
    summarize(scoredRows),
    '',
    `Lead page performance rows: ${pageRows.length}`,
  ].join('\n');

  if (args.summaryOnly) {
    process.stdout.write(`${summary}\n`);
    return;
  }

  const output = `${toCsv(pageRows)}\n`;
  if (args.out) {
    const outPath = path.resolve(args.out);
    fs.writeFileSync(outPath, output);
    process.stdout.write(`${summary}\n\nWrote lead page performance to ${outPath}\n`);
  } else {
    process.stdout.write(`${summary}\n\n${output}`);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  buildLeadPagePerformanceRows,
  parseArgs,
  toCsv,
};
