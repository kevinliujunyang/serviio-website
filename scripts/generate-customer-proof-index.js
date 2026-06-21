const fs = require('fs');
const path = require('path');
const {
  recordsFromCsv,
} = require('./export-customer-proof-page-drafts');

const HELP = `Usage:
  node scripts/generate-customer-proof-index.js customer-proof-publishing-queue.csv [--out-dir .] [--updated YYYY-MM-DD]

Generates a static customer-proof index page from approved proof publishing queue rows.
`;

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function parseArgs(argv) {
  const args = {
    input: '',
    outDir: '.',
    updated: todayIso(),
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help' || arg === '-h') {
      args.help = true;
    } else if (arg === '--out-dir') {
      args.outDir = argv[index + 1] || '.';
      index += 1;
    } else if (arg === '--updated') {
      args.updated = argv[index + 1] || args.updated;
      index += 1;
    } else if (!args.input) {
      args.input = arg;
    } else {
      throw new Error(`Unexpected argument: ${arg}`);
    }
  }

  return args;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function jsonLd(value) {
  return JSON.stringify(value, null, 2)
    .replace(/</g, '\\u003c');
}

function buildCustomerProofIndexHtml(rows, { updated = todayIso() } = {}) {
  const itemListJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Customer proof for restaurant AI phone ordering',
    itemListElement: rows.map((row, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      url: row.canonical_url,
      name: row.page_title,
      description: row.proof_summary,
    })),
  };
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'What restaurants are included in Serviio customer proof?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Serviio publishes approved restaurant proof for phone ordering workflows, including Chinese restaurants, takeout restaurants, and POS-ready operators using systems such as 39 Miles, Square, Toast, Clover, MenuSifu, Chowbus, and Mealkeyway.',
        },
      },
      {
        '@type': 'Question',
        name: 'Can Serviio work with my restaurant POS system?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Serviio prioritizes restaurants that already use a POS system and qualifies POS integration fit before setup.',
        },
      },
    ],
  };

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Customer proof for restaurant AI phone ordering | Serviio</title>
    <meta name="description" content="Approved Serviio customer proof for restaurant AI phone ordering, Chinese takeout phone answering, and POS integrated AI phone agents.">
    <link rel="canonical" href="https://serviio.ai/customer-proof/">
    <link rel="icon" type="image/svg+xml" href="/assets/logo.svg">
    <meta property="og:title" content="Customer proof for restaurant AI phone ordering | Serviio">
    <meta property="og:description" content="Restaurant AI phone ordering proof from approved Serviio customers and pilots.">
    <meta property="og:url" content="https://serviio.ai/customer-proof/">
    <meta property="og:type" content="website">
    <meta property="og:site_name" content="Serviio">
    <meta property="og:image" content="https://serviio.ai/assets/og-image.png">
    <script type="application/ld+json">${jsonLd(itemListJsonLd)}</script>
    <script type="application/ld+json">${jsonLd(faqJsonLd)}</script>
    <link rel="stylesheet" href="/assets/css/styles.css">
</head>
<body class="bg-white text-gray-900 antialiased">
    <main class="min-h-screen">
        <section class="pt-24 pb-16 px-4 sm:px-6 lg:px-8">
            <div class="max-w-5xl mx-auto">
                <p class="text-sm font-semibold text-indigo-700">Customer proof</p>
                <h1 class="mt-3 text-4xl font-bold tracking-tight text-gray-950">Restaurant AI phone ordering proof</h1>
                <p class="mt-5 max-w-3xl text-lg text-gray-700">Approved proof pages for restaurants using Serviio to answer calls, take phone orders, and qualify POS integrated AI phone ordering workflows.</p>
                <p class="mt-3 text-sm text-gray-500">Updated ${escapeHtml(updated)}</p>
                <div class="mt-10 grid gap-5">
                    ${rows.map((row) => `<article class="rounded-lg border border-gray-200 p-6">
                        <p class="text-sm font-semibold text-indigo-700">${escapeHtml(row.restaurant_display_name)}</p>
                        <h2 class="mt-2 text-2xl font-bold text-gray-950"><a class="underline decoration-indigo-300 underline-offset-4" href="${escapeHtml(row.canonical_url)}">${escapeHtml(row.page_title)}</a></h2>
                        <p class="mt-3 text-gray-700">${escapeHtml(row.proof_summary)}</p>
                        <a class="mt-4 inline-block font-semibold text-indigo-700" href="${escapeHtml(row.canonical_url)}">Read proof</a>
                    </article>`).join('\n                    ')}
                </div>
                <form class="mt-12 rounded-lg border border-gray-200 p-6" action="https://formspree.io/f/xeeezpzn" method="POST">
                    <h2 class="text-2xl font-bold text-gray-950">Check your restaurant fit</h2>
                    <input type="hidden" name="lead_source" value="customer_proof_index">
                    <input type="hidden" name="ideal_customer_profile" value="pos_ready_restaurant_owner">
                    <input type="hidden" name="conversion_offer" value="ai_phone_order_fit_check">
                    <label class="mt-4 block text-sm font-medium text-gray-700">Restaurant</label>
                    <input class="mt-1 w-full rounded-md border border-gray-300 px-3 py-2" name="restaurant" required>
                    <label class="mt-4 block text-sm font-medium text-gray-700">Name</label>
                    <input class="mt-1 w-full rounded-md border border-gray-300 px-3 py-2" name="name" required>
                    <label class="mt-4 block text-sm font-medium text-gray-700">Phone</label>
                    <input class="mt-1 w-full rounded-md border border-gray-300 px-3 py-2" name="phone" required>
                    <label class="mt-4 block text-sm font-medium text-gray-700">Email</label>
                    <input class="mt-1 w-full rounded-md border border-gray-300 px-3 py-2" type="email" name="email" required>
                    <label class="mt-4 block text-sm font-medium text-gray-700">City</label>
                    <input class="mt-1 w-full rounded-md border border-gray-300 px-3 py-2" name="restaurant_city" required>
                    <label class="mt-4 block text-sm font-medium text-gray-700">State</label>
                    <input class="mt-1 w-full rounded-md border border-gray-300 px-3 py-2" name="restaurant_state" required>
                    <label class="mt-4 block text-sm font-medium text-gray-700">POS system</label>
                    <input class="mt-1 w-full rounded-md border border-gray-300 px-3 py-2" name="pos_system" required>
                    <input type="hidden" name="pos_status" value="existing_or_evaluating_pos">
                    <label class="mt-4 block text-sm font-medium text-gray-700">Weekly phone orders</label>
                    <select class="mt-1 w-full rounded-md border border-gray-300 px-3 py-2" name="phone_orders_per_week" required>
                        <option value="">Select one</option>
                        <option>Under 25</option>
                        <option>25-75</option>
                        <option>76-150</option>
                        <option>150+</option>
                    </select>
                    <label class="mt-4 block text-sm font-medium text-gray-700">Main phone-order pain</label>
                    <textarea class="mt-1 w-full rounded-md border border-gray-300 px-3 py-2" name="main_pain" required></textarea>
                    <label class="mt-4 block text-sm font-medium text-gray-700">POS recommendation interest</label>
                    <select class="mt-1 w-full rounded-md border border-gray-300 px-3 py-2" name="pos_recommendation_interest" required>
                        <option value="">Select one</option>
                        <option>Not applicable, I already have a POS</option>
                        <option>Yes, I want POS recommendations</option>
                        <option>Maybe later</option>
                    </select>
                    <label class="mt-4 block text-sm font-medium text-gray-700">POS purchase timeline</label>
                    <select class="mt-1 w-full rounded-md border border-gray-300 px-3 py-2" name="pos_purchase_timeline" required>
                        <option value="">Select one</option>
                        <option>Not applicable, I already have a POS</option>
                        <option>Immediately</option>
                        <option>Within 1 month</option>
                        <option>1-3 months</option>
                        <option>Not sure yet</option>
                    </select>
                    <button class="mt-5 rounded-md bg-indigo-600 px-5 py-3 font-semibold text-white" type="submit">Request POS fit check</button>
                </form>
            </div>
        </section>
    </main>
    <script src="/assets/js/form-attribution.js" defer></script>
</body>
</html>
`;
}

function generateCustomerProofIndex(rows, { outDir = '.', updated = todayIso() } = {}) {
  const relativePath = 'customer-proof/index.html';
  const outputPath = path.join(outDir, relativePath);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, buildCustomerProofIndexHtml(rows, { updated }));
  return {
    relativePath,
    outputPath,
    canonicalUrl: 'https://serviio.ai/customer-proof/',
  };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || !args.input) {
    process.stdout.write(HELP);
    process.exit(args.help ? 0 : 1);
  }

  const rows = recordsFromCsv(fs.readFileSync(path.resolve(args.input), 'utf8'));
  const generated = generateCustomerProofIndex(rows, {
    outDir: args.outDir,
    updated: args.updated,
  });
  process.stdout.write(`Generated customer proof index at ${generated.outputPath}\n`);
}

if (require.main === module) {
  main();
}

module.exports = {
  buildCustomerProofIndexHtml,
  generateCustomerProofIndex,
  parseArgs,
};
