const fs = require('fs');
const path = require('path');
const {
  buildRecords,
  normalizeRecord,
  parseCsv,
} = require('./analyze-search-console');

const HELP = `Usage:
  node scripts/export-search-lead-priority.js search-console.csv lead-page-performance.csv [--out search-lead-priority.md] [--limit 10]

Combines Google Search Console query/page data with lead page performance so SEO work prioritizes pages that can rank and produce qualified leads.
`;

function parseArgs(argv) {
  const args = {
    searchConsole: '',
    leadPages: '',
    out: '',
    limit: 10,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help' || arg === '-h') {
      args.help = true;
    } else if (arg === '--out') {
      args.out = argv[index + 1] || '';
      index += 1;
    } else if (arg === '--limit') {
      args.limit = Number(argv[index + 1] || 0);
      index += 1;
    } else if (!args.searchConsole) {
      args.searchConsole = arg;
    } else if (!args.leadPages) {
      args.leadPages = arg;
    } else {
      throw new Error(`Unexpected argument: ${arg}`);
    }
  }

  if (!Number.isInteger(args.limit) || args.limit < 1) {
    throw new Error('--limit must be a positive integer');
  }

  return args;
}

function numberValue(value) {
  const number = Number(String(value || '').replace(/[%,$\s]/g, ''));
  return Number.isFinite(number) ? number : 0;
}

function normalizePath(value) {
  const text = String(value || '').trim();
  if (!text) return '/';
  try {
    return new URL(text, 'https://serviio.ai').pathname;
  } catch {
    return text.startsWith('/') ? text : `/${text}`;
  }
}

function groupSearchRows(searchRows) {
  const groups = new Map();
  searchRows.forEach((row) => {
    const page = normalizePath(row.page);
    if (!groups.has(page)) {
      groups.set(page, {
        page,
        impressions: 0,
        clicks: 0,
        weightedPosition: 0,
        queries: [],
      });
    }

    const group = groups.get(page);
    group.impressions += row.impressions;
    group.clicks += row.clicks;
    group.weightedPosition += row.position * Math.max(1, row.impressions);
    group.queries.push(row);
  });

  return [...groups.values()].map((group) => ({
    ...group,
    best_position: Math.min(...group.queries.map((row) => row.position || 999)),
    avg_position: group.weightedPosition / Math.max(1, group.queries.reduce((sum, row) => sum + Math.max(1, row.impressions), 0)),
    topQueries: group.queries
      .slice()
      .sort((a, b) => b.impressions - a.impressions || a.position - b.position)
      .slice(0, 3),
  }));
}

function recommendedAction(row) {
  if (row.demo_fit_leads > 0 && row.best_position > 10 && row.best_position <= 20) {
    return 'Push this near-page-one POS page: improve title/description CTR, add exact-anchor internal links, and include it in the next authority outreach batch.';
  }
  if (row.demo_fit_leads > 0 && row.best_position <= 10) {
    return 'Protect this page-one lead page: monitor CTR, preserve conversion fields, and request customer proof from matching leads.';
  }
  if (row.pos_referral_leads > 0 && row.impressions > 0) {
    return 'Use this search page for POS partner monetization: keep no-POS routing and add partner outreach support.';
  }
  if (row.partner_pipeline_leads > 0 || row.authority_opportunity_leads > 0) {
    return 'Follow up with partners and ask for a resource listing, backlink, or referral path tied to this page.';
  }
  return 'Review whether this search page has the right offer and form path before sending more traffic.';
}

function scoreRow(row) {
  let score = 0;
  score += Math.min(35, row.impressions / 2);
  score += row.demo_fit_leads * 35;
  score += row.pos_referral_leads * 18;
  score += row.partner_pipeline_leads * 12;
  score += row.authority_opportunity_leads * 10;
  if (row.best_position > 10 && row.best_position <= 20) score += 20;
  if (row.best_position <= 10) score += 10;
  return Math.round(score);
}

function buildSearchLeadActions(searchRows, leadPageRows, options = {}) {
  const limit = options.limit || 10;
  const searchByPage = new Map(groupSearchRows(searchRows).map((row) => [row.page, row]));

  return leadPageRows
    .map((leadRow) => {
      const page = normalizePath(leadRow.landing_path);
      const search = searchByPage.get(page) || {
        page,
        impressions: 0,
        clicks: 0,
        best_position: 0,
        avg_position: 0,
        topQueries: [],
      };
      const row = {
        page,
        impressions: search.impressions,
        clicks: search.clicks,
        best_position: Number(search.best_position.toFixed ? search.best_position.toFixed(1) : search.best_position),
        avg_position: Number(search.avg_position.toFixed ? search.avg_position.toFixed(1) : search.avg_position),
        queries: search.topQueries.map((query) => query.query).join(' | ') || '(no Search Console query/page match yet)',
        total_leads: numberValue(leadRow.total_leads),
        demo_fit_leads: numberValue(leadRow.demo_fit_leads),
        pos_referral_leads: numberValue(leadRow.pos_referral_leads),
        partner_pipeline_leads: numberValue(leadRow.partner_pipeline_leads),
        authority_opportunity_leads: numberValue(leadRow.authority_opportunity_leads),
        top_lead_acquisition_channel: leadRow.top_lead_acquisition_channel || '',
        top_conversion_offer: leadRow.top_conversion_offer || '',
      };
      return {
        ...row,
        priority_score: scoreRow(row),
        recommended_action: recommendedAction(row),
      };
    })
    .filter((row) =>
      row.impressions > 0 ||
      row.demo_fit_leads > 0 ||
      row.pos_referral_leads > 0 ||
      row.partner_pipeline_leads > 0
    )
    .sort((a, b) => b.priority_score - a.priority_score || b.impressions - a.impressions || a.page.localeCompare(b.page))
    .slice(0, limit);
}

function renderSearchLeadActions(rows) {
  const lines = [
    '# Serviio Search-to-Lead Priority Queue',
    '',
    'Use this queue after exporting Google Search Console query/page data and Formspree lead page performance. It ranks pages where search demand and qualified lead quality overlap.',
    '',
    '| Score | Page | Search demand | Lead quality | Top queries | Recommended action |',
    '| --- | --- | --- | --- | --- | --- |',
  ];

  rows.forEach((row) => {
    lines.push([
      row.priority_score,
      row.page,
      `${row.impressions} impressions, ${row.clicks} clicks, best position ${row.best_position}`,
      `${row.demo_fit_leads} demo-fit leads, ${row.pos_referral_leads} POS referral leads, ${row.partner_pipeline_leads} partner leads`,
      row.queries,
      row.recommended_action,
    ].map((value) => String(value).replace(/\|/g, '/')).join(' | '));
  });

  lines.push('');
  return lines.join('\n');
}

function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help || !args.searchConsole || !args.leadPages) {
    process.stdout.write(HELP);
    process.exit(args.help ? 0 : 1);
  }

  const searchRows = buildRecords(parseCsv(fs.readFileSync(path.resolve(args.searchConsole), 'utf8'))).map(normalizeRecord);
  const leadRows = buildRecords(parseCsv(fs.readFileSync(path.resolve(args.leadPages), 'utf8')));
  const report = renderSearchLeadActions(buildSearchLeadActions(searchRows, leadRows, { limit: args.limit }));

  if (args.out) {
    const outPath = path.resolve(args.out);
    fs.writeFileSync(outPath, `${report}\n`);
    process.stdout.write(`Wrote search-to-lead priority queue to ${outPath}\n`);
  } else {
    process.stdout.write(`${report}\n`);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  buildSearchLeadActions,
  parseArgs,
  renderSearchLeadActions,
};
