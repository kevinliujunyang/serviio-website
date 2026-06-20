const fs = require('fs');
const path = require('path');
const { buildRecords, parseCsv } = require('./analyze-search-console');

const DEFAULT_WATCHLIST = 'docs/first-page-ranking-watchlist.csv';
const DEFAULT_OUT = 'docs/ranking-action-queue.md';
const SOURCE_HUBS = {
  named_pos: '/, /restaurant-pos-phone-order-integration/, /guides/connect-phone-orders-to-pos/, /site-map/',
  pos: '/, /restaurant-pos-phone-order-integration/, /guides/connect-phone-orders-to-pos/, /site-map/',
  chinese: '/, /chinese-restaurant-ai-phone-ordering/, /chinese-restaurant-pos-integration/, /site-map/',
  phone_order: '/, /restaurant-ai-phone-order-taker/, /restaurant-phone-order-automation/, /site-map/',
  phone_answering: '/, /restaurant-phone-answering-service/, /chinese-restaurant-phone-answering-service/, /site-map/',
  local: '/service-areas/, /, /site-map/',
  default: '/, /site-map/',
};

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function parseArgs(argv) {
  const args = {
    watchlist: DEFAULT_WATCHLIST,
    out: DEFAULT_OUT,
    limit: 25,
    today: todayIso(),
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help' || arg === '-h') {
      args.help = true;
    } else if (arg === '--watchlist') {
      args.watchlist = argv[index + 1] || DEFAULT_WATCHLIST;
      index += 1;
    } else if (arg === '--out') {
      args.out = argv[index + 1] || DEFAULT_OUT;
      index += 1;
    } else if (arg === '--limit') {
      args.limit = Number(argv[index + 1] || args.limit);
      index += 1;
    } else if (arg === '--today') {
      args.today = argv[index + 1] || args.today;
      index += 1;
    } else {
      throw new Error(`Unexpected argument: ${arg}`);
    }
  }

  if (!Number.isInteger(args.limit) || args.limit < 1) {
    throw new Error('--limit must be a positive integer');
  }
  if (!args.help && !/^\d{4}-\d{2}-\d{2}$/.test(args.today)) {
    throw new Error('--today must use YYYY-MM-DD');
  }

  return args;
}

function numeric(value) {
  const parsed = Number(String(value || '').replace(/[%,$\s]/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
}

function priorityWeight(value) {
  return { P0: 0, P1: 1, P2: 2 }[value] ?? 9;
}

function actionType(row) {
  if (row.status === 'page_one' && numeric(row.current_ctr) < 2) return 'ctr_rewrite';
  if (row.status === 'near_page_one') return 'push_to_page_one';
  if (row.status === 'needs_authority_or_relevance') return 'authority_and_relevance';
  if (row.status === 'ranking_on_other_page') return 'align_target_page';
  if (row.status === 'no_search_console_data' || row.status === 'needs_search_console_data') return 'indexing_or_data_check';
  return 'monitor';
}

function actionScore(row) {
  let score = 0;
  if (row.priority === 'P0') score += 40;
  if (row.priority === 'P1') score += 25;
  if (row.status === 'near_page_one') score += 35;
  if (row.status === 'page_one' && numeric(row.current_ctr) < 2) score += 30;
  if (row.status === 'needs_authority_or_relevance') score += 20;
  if (row.status === 'ranking_on_other_page') score += 18;
  if (row.status === 'no_search_console_data' || row.status === 'needs_search_console_data') score += row.priority === 'P0' ? 16 : 6;
  score += Math.min(20, Math.floor(numeric(row.current_impressions) / 5));
  return Math.min(100, score);
}

function recommendedAction(row) {
  const authority = row.authority_target || 'relevant authority target';
  if (row.status === 'page_one' && numeric(row.current_ctr) < 2) {
    return `Rewrite title/meta around "${row.query}" and POS-ready phone-order pain; preserve ${row.target_page}.`;
  }
  if (row.status === 'near_page_one') {
    return `Add exact-anchor internal links to ${row.target_page}, then pursue ${authority} for one backlink or referral mention.`;
  }
  if (row.status === 'needs_authority_or_relevance') {
    return `Strengthen on-page relevance for "${row.query}" and prioritize ${authority} before creating more pages.`;
  }
  if (row.status === 'ranking_on_other_page') {
    return `Align internal links and canonical intent so ${row.target_page} is the page Google ranks for this query.`;
  }
  if (row.status === 'no_search_console_data' || row.status === 'needs_search_console_data') {
    return `Confirm page is indexed, add one internal link using "${row.query}", and keep this query in next Search Console export.`;
  }
  return 'Monitor weekly position, clicks, and CTR.';
}

function suggestedSourceHubs(row) {
  const text = `${row.query} ${row.target_page} ${row.cluster || ''}`;
  if (/39\s*miles|menusifu|menu\s*sifu|chowbus|mealkeyway|square|toast|clover/i.test(text)) return SOURCE_HUBS.named_pos;
  if (/pos|point\s*of\s*sale/i.test(text)) return SOURCE_HUBS.pos;
  if (/chinese|中餐|mandarin|cantonese/i.test(text)) return SOURCE_HUBS.chinese;
  if (/phone\s*order|order\s*taker|order\s*taking|ordering|takeout/i.test(text)) return SOURCE_HUBS.phone_order;
  if (/answering|answer\s*phone|receptionist|missed\s*call/i.test(text)) return SOURCE_HUBS.phone_answering;
  if (/service-area|service\s*area|california|new\s*york|new\s*jersey|texas|houston|seattle|chicago|boston|philadelphia/i.test(text)) return SOURCE_HUBS.local;
  return SOURCE_HUBS.default;
}

function quoteShell(text) {
  return `"${String(text || '').replace(/"/g, '\\"')}"`;
}

function authorityTrackerCommand(row, today) {
  if (!row.authority_target) return '';
  const note = `Ranking support for "${row.query}" (${row.action_type}); add confirmation URL, partner reply, or live link.`;
  return `npm run marketing:mark -- --target ${quoteShell(row.authority_target)} --status submitted --date ${today} --note ${quoteShell(note)}`;
}

function buildRankingActions(rows, { limit = 25, today = todayIso() } = {}) {
  return rows
    .map((row) => ({
      ...row,
      action_type: actionType(row),
      action_score: actionScore(row),
      recommended_action: recommendedAction(row),
      suggested_source_hubs: suggestedSourceHubs(row),
    }))
    .map((row) => ({
      ...row,
      authority_tracker_command: authorityTrackerCommand(row, today),
    }))
    .filter((row) => row.action_type !== 'monitor')
    .sort((a, b) => {
      if (b.action_score !== a.action_score) return b.action_score - a.action_score;
      const priorityDiff = priorityWeight(a.priority) - priorityWeight(b.priority);
      if (priorityDiff) return priorityDiff;
      return numeric(a.current_position) - numeric(b.current_position);
    })
    .slice(0, limit);
}

function buildAuthoritySubmissionBatches(actions, today = todayIso()) {
  const byTarget = new Map();
  for (const row of actions) {
    if (!row.authority_target) continue;
    if (!byTarget.has(row.authority_target)) {
      byTarget.set(row.authority_target, {
        authority_target: row.authority_target,
        max_score: row.action_score,
        action_types: new Set(),
        queries: [],
        target_pages: new Set(),
      });
    }
    const batch = byTarget.get(row.authority_target);
    batch.max_score = Math.max(batch.max_score, row.action_score);
    batch.action_types.add(row.action_type);
    batch.queries.push(row.query);
    batch.target_pages.add(row.target_page);
  }

  return Array.from(byTarget.values())
    .map((batch) => {
      const topQueries = batch.queries.slice(0, 5);
      const note = `Ranking support for ${topQueries.map((query) => `"${query}"`).join(', ')}; one submission should support these grouped ranking actions.`;
      return {
        ...batch,
        action_types: Array.from(batch.action_types).join(', '),
        supporting_queries: topQueries.join('; '),
        target_pages: Array.from(batch.target_pages).join(', '),
        authority_tracker_command: `npm run marketing:mark -- --target ${quoteShell(batch.authority_target)} --status submitted --date ${today} --note ${quoteShell(note)}`,
      };
    })
    .sort((a, b) => b.max_score - a.max_score || a.authority_target.localeCompare(b.authority_target));
}

function renderTable(rows) {
  if (rows.length === 0) return '_No ranking actions available._';
  const lines = [
    '| Score | Type | Query | Target page | Position | CTR | Action | Suggested source hubs | Authority target | Authority tracker command |',
    '| ---: | --- | --- | --- | ---: | ---: | --- | --- | --- | --- |',
  ];
  for (const row of rows) {
    lines.push(`| ${row.action_score}/100 | ${row.action_type} | ${row.query} | ${row.target_page} | ${row.current_position || '-'} | ${row.current_ctr || '-'} | ${row.recommended_action} | ${row.suggested_source_hubs || '-'} | ${row.authority_target || '-'} | ${row.authority_tracker_command || '-'} |`);
  }
  return lines.join('\n');
}

function renderAuthorityBatchTable(rows) {
  if (rows.length === 0) return '_No authority batches available._';
  const lines = [
    '| Score | Authority target | Action types | Supporting queries | Target pages | Tracker command |',
    '| ---: | --- | --- | --- | --- | --- |',
  ];
  for (const row of rows) {
    lines.push(`| ${row.max_score}/100 | ${row.authority_target} | ${row.action_types} | ${row.supporting_queries} | ${row.target_pages} | ${row.authority_tracker_command} |`);
  }
  return lines.join('\n');
}

function renderRankingActionQueue(rows, options = {}) {
  const limit = options.limit || 25;
  const today = options.today || todayIso();
  const actions = buildRankingActions(rows, { limit, today });
  const authorityBatches = buildAuthoritySubmissionBatches(actions, today);
  const statusCounts = rows.reduce((counts, row) => {
    counts[row.status] = (counts[row.status] || 0) + 1;
    return counts;
  }, {});
  return [
    '# Serviio Ranking Action Queue',
    '',
    `Source rows: ${rows.length}`,
    `Actions shown: ${actions.length}`,
    `Tracker command date: ${today}`,
    '',
    '## Status Counts',
    ...Object.entries(statusCounts).sort().map(([status, count]) => `- ${status}: ${count}`),
    '',
    '## Actions',
    '',
    renderTable(actions),
    '',
    '## Authority Submission Batches',
    '',
    renderAuthorityBatchTable(authorityBatches),
    '',
    '## Usage',
    '',
    '- Work `push_to_page_one` and `ctr_rewrite` rows first because they are closest to first-page traffic.',
    '- For `no_search_console_data`, verify indexing before writing another landing page.',
    '- Keep authority work tied to the listed `authority_target` so backlinks match the query intent.',
    '- Use `Authority Submission Batches` to avoid submitting the same partner or directory target once per query.',
    '- Run an authority tracker command only after the external submission, reply, backlink, profile, or proof request actually happens.',
    '',
  ].join('\n');
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log('Usage: node scripts/export-ranking-action-queue.js [--watchlist docs/first-page-ranking-watchlist.csv] [--out docs/ranking-action-queue.md] [--limit 25]');
    return;
  }

  const rows = buildRecords(parseCsv(fs.readFileSync(args.watchlist, 'utf8')));
  const markdown = renderRankingActionQueue(rows, { limit: args.limit, today: args.today });
  const outPath = path.resolve(args.out || DEFAULT_OUT);
  fs.writeFileSync(outPath, markdown);
  console.log(`Wrote ranking action queue to ${outPath}`);
}

if (require.main === module) {
  main();
}

module.exports = {
  actionScore,
  actionType,
  authorityTrackerCommand,
  buildAuthoritySubmissionBatches,
  buildRankingActions,
  parseArgs,
  recommendedAction,
  renderRankingActionQueue,
  suggestedSourceHubs,
};
