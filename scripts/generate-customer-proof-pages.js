const fs = require('fs');
const path = require('path');
const {
  recordsFromCsv,
} = require('./export-customer-proof-page-drafts');
const {
  parseCsv,
} = require('./score-formspree-leads');

const HELP = `Usage:
  node scripts/generate-customer-proof-pages.js customer-proof-publishing-queue.csv [--out-dir .]

Generates static customer-proof HTML pages from approved proof publishing queue rows.
`;

function parseArgs(argv) {
  const args = {
    input: '',
    outDir: '.',
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help' || arg === '-h') {
      args.help = true;
    } else if (arg === '--out-dir') {
      args.outDir = argv[index + 1] || '.';
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

function internalLinks(row) {
  return String(row.internal_links || '')
    .split(';')
    .map((link) => link.trim())
    .filter(Boolean);
}

function buildCustomerProofPageHtml(row) {
  const links = internalLinks(row);
  const reviewJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Review',
    itemReviewed: {
      '@type': 'SoftwareApplication',
      name: 'Serviio',
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Cloud',
    },
    author: {
      '@type': 'Organization',
      name: row.restaurant_display_name,
    },
    reviewBody: row.quote,
    publisher: {
      '@type': 'Organization',
      name: 'Serviio',
      url: 'https://serviio.ai/',
    },
  };
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'What proof does this page show?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: row.proof_summary,
        },
      },
      {
        '@type': 'Question',
        name: 'Can my restaurant use Serviio with an existing POS?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Serviio prioritizes POS-ready restaurants and qualifies systems such as 39 Miles, Square, Toast, Clover, MenuSifu, Chowbus, Mealkeyway, and related restaurant POS platforms.',
        },
      },
    ],
  };
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: 'https://serviio.ai/',
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Customer Proof',
        item: 'https://serviio.ai/customer-proof/',
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: row.restaurant_display_name,
        item: row.canonical_url,
      },
    ],
  };

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(row.page_title)}</title>
    <meta name="description" content="${escapeHtml(row.meta_description)}">
    <link rel="canonical" href="${escapeHtml(row.canonical_url)}">
    <link rel="icon" type="image/svg+xml" href="/assets/logo.svg">
    <meta property="og:title" content="${escapeHtml(row.page_title)}">
    <meta property="og:description" content="${escapeHtml(row.meta_description)}">
    <meta property="og:url" content="${escapeHtml(row.canonical_url)}">
    <meta property="og:type" content="article">
    <meta property="og:site_name" content="Serviio">
    <meta property="og:image" content="https://serviio.ai/assets/og-image.png">
    <script type="application/ld+json">${jsonLd(reviewJsonLd)}</script>
    <script type="application/ld+json">${jsonLd(faqJsonLd)}</script>
    <script type="application/ld+json">${jsonLd(breadcrumbJsonLd)}</script>
    <link rel="stylesheet" href="/assets/css/styles.css">
</head>
<body class="bg-white text-gray-900 antialiased">
    <main class="min-h-screen">
        <section class="pt-24 pb-16 px-4 sm:px-6 lg:px-8">
            <div class="max-w-4xl mx-auto">
                <p class="text-sm font-semibold text-indigo-700">Customer proof</p>
                <h1 class="mt-3 text-4xl font-bold tracking-tight text-gray-950">${escapeHtml(row.hero_h1)}</h1>
                <p class="mt-5 text-lg text-gray-700">${escapeHtml(row.meta_description)}</p>
                <figure class="mt-10 border-l-4 border-indigo-600 pl-6">
                    <blockquote class="text-2xl font-semibold text-gray-950">"${escapeHtml(row.quote)}"</blockquote>
                    <figcaption class="mt-4 text-gray-600">${escapeHtml(row.restaurant_display_name)}</figcaption>
                </figure>
                <dl class="mt-10 grid gap-4 sm:grid-cols-2">
                    <div class="rounded-lg border border-gray-200 p-5">
                        <dt class="font-semibold text-gray-950">Proof summary</dt>
                        <dd class="mt-2 text-gray-700">${escapeHtml(row.proof_summary)}</dd>
                    </div>
                    <div class="rounded-lg border border-gray-200 p-5">
                        <dt class="font-semibold text-gray-950">Structured data</dt>
                        <dd class="mt-2 text-gray-700">${escapeHtml(row.jsonld_types)}</dd>
                    </div>
                </dl>
                <div class="mt-10">
                    <h2 class="text-2xl font-bold text-gray-950">Related Serviio pages</h2>
                    <ul class="mt-4 space-y-2">
                        ${links.map((link) => `<li><a class="text-indigo-700 underline" href="${escapeHtml(link)}">${escapeHtml(link)}</a></li>`).join('\n                        ')}
                    </ul>
                </div>
                <form class="mt-12 rounded-lg border border-gray-200 p-6" action="https://formspree.io/f/xeeezpzn" method="POST">
                    <h2 class="text-2xl font-bold text-gray-950">Check your restaurant fit</h2>
                    <input type="hidden" name="conversion_offer" value="customer_proof_page_fit_check">
                    <input type="hidden" name="proof_source" value="${escapeHtml(row.canonical_url)}">
                    <label class="mt-4 block text-sm font-medium text-gray-700">POS system</label>
                    <input class="mt-1 w-full rounded-md border border-gray-300 px-3 py-2" name="pos_system" required>
                    <label class="mt-4 block text-sm font-medium text-gray-700">Restaurant email</label>
                    <input class="mt-1 w-full rounded-md border border-gray-300 px-3 py-2" type="email" name="email" required>
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

function generateCustomerProofPages(rows, { outDir = '.' } = {}) {
  return rows.map((row) => {
    const relativePath = row.draft_path;
    const outputPath = path.join(outDir, relativePath);
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, buildCustomerProofPageHtml(row));
    return {
      relativePath,
      outputPath,
      canonicalUrl: row.canonical_url,
    };
  });
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || !args.input) {
    process.stdout.write(HELP);
    process.exit(args.help ? 0 : 1);
  }

  const rows = recordsFromCsv(fs.readFileSync(path.resolve(args.input), 'utf8'));
  const generated = generateCustomerProofPages(rows, { outDir: args.outDir });
  process.stdout.write(`Generated ${generated.length} customer proof pages in ${path.resolve(args.outDir)}\n`);
}

if (require.main === module) {
  main();
}

module.exports = {
  buildCustomerProofPageHtml,
  generateCustomerProofPages,
  parseArgs,
};
