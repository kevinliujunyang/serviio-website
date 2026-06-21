const fs = require('fs');
const path = require('path');
const {
  parseCsv,
} = require('./score-formspree-leads');

const HELP = `Usage:
  node scripts/export-customer-proof-page-drafts.js customer-proof-publishing-queue.csv [--out customer-proof-page-drafts.md] [--today YYYY-MM-DD]

Renders approved customer-proof publishing queue rows into reviewable page draft packets.
`;

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function parseArgs(argv) {
  const args = {
    input: '',
    out: '',
    today: todayIso(),
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help' || arg === '-h') {
      args.help = true;
    } else if (arg === '--out') {
      args.out = argv[index + 1] || '';
      index += 1;
    } else if (arg === '--today') {
      args.today = argv[index + 1] || args.today;
      index += 1;
    } else if (!args.input) {
      args.input = arg;
    } else {
      throw new Error(`Unexpected argument: ${arg}`);
    }
  }

  return args;
}

function recordsFromCsv(text) {
  const rows = parseCsv(text);
  if (rows.length < 2) return [];
  const headers = rows[0].map((header) => header.trim());
  return rows.slice(1).map((row) => Object.fromEntries(
    headers.map((header, index) => [header, row[index] || '']),
  ));
}

function privacyLine(row) {
  if (/^Anonymous /i.test(row.restaurant_display_name || '')) {
    return 'Privacy: anonymous proof; do not publish restaurant legal name';
  }
  return 'Privacy: restaurant name can be published only if the original proof permission allows it';
}

function buildCustomerProofDraftPack(rows, { today = todayIso() } = {}) {
  const lines = [
    '# Customer Proof Page Draft Pack',
    '',
    `Generated: ${today}`,
    '',
    'Review these drafts before creating live customer-proof pages. Do not publish internal-only proof or restaurant names that are not approved for public use.',
    '',
  ];

  for (const [index, row] of rows.entries()) {
    lines.push(
      `## ${index + 1}. ${row.restaurant_display_name}`,
      '',
      `- Draft path: \`${row.draft_path}\``,
      `- Canonical URL: ${row.canonical_url}`,
      `- Page title: ${row.page_title}`,
      `- Meta description: ${row.meta_description}`,
      `- ${privacyLine(row)}`,
      '',
      `H1: ${row.hero_h1}`,
      '',
      'Quote:',
      '',
      `> ${row.quote}`,
      '',
      `Proof summary: ${row.proof_summary}`,
      `JSON-LD types: ${row.jsonld_types}`,
      '',
      'Internal links:',
      '',
      ...String(row.internal_links || '').split(';').map((link) => link.trim()).filter(Boolean).map((link) => `- ${link}`),
      '',
      'Tracker command after publishing:',
      '',
      '```bash',
      row.tracker_command,
      '```',
      '',
    );
  }

  lines.push(`Generated ${rows.length} customer proof page drafts.`, '');
  return lines.join('\n');
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || !args.input) {
    process.stdout.write(HELP);
    process.exit(args.help ? 0 : 1);
  }

  const rows = recordsFromCsv(fs.readFileSync(path.resolve(args.input), 'utf8'));
  const output = buildCustomerProofDraftPack(rows, { today: args.today });

  if (args.out) {
    const outPath = path.resolve(args.out);
    fs.writeFileSync(outPath, output);
    process.stdout.write(`Wrote customer proof page drafts to ${outPath}\n`);
  } else {
    process.stdout.write(output);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  buildCustomerProofDraftPack,
  parseArgs,
  recordsFromCsv,
};
