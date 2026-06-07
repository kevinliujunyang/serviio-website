const SITE_ORIGIN = 'https://serviio.ai';

const requiredHomepageAnchors = [
  { href: '/pos/menusifu-ai-phone-ordering/', text: 'MenuSifu AI phone ordering' },
  { href: '/pos/chowbus-ai-phone-ordering/', text: 'Chowbus POS AI phone agent' },
  { href: '/restaurant-phone-order-automation/', text: 'Restaurant phone order automation' },
];

function resolveBaseUrl(baseUrl = SITE_ORIGIN) {
  return baseUrl.replace(/\/$/, '');
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildAnchorFailures(html, anchors = requiredHomepageAnchors) {
  const failures = [];

  for (const { href, text } of anchors) {
    const pattern = new RegExp(
      `<a\\b[^>]*href="${escapeRegExp(href)}"[^>]*>[\\s\\S]*?${escapeRegExp(text)}[\\s\\S]*?<\\/a>`,
      'i',
    );
    if (!pattern.test(html)) {
      failures.push(`missing anchor "${text}" to ${href}`);
    }
  }

  return failures;
}

async function verifyHomepageAnchors(baseUrl = SITE_ORIGIN) {
  const origin = resolveBaseUrl(baseUrl);
  const response = await fetch(`${origin}/`);
  const html = await response.text();
  const failures = buildAnchorFailures(html);

  if (response.status !== 200) {
    failures.unshift(`/: status ${response.status}`);
  }

  return { origin, failures };
}

async function main() {
  const baseUrl = process.argv[2] || SITE_ORIGIN;
  const { origin, failures } = await verifyHomepageAnchors(baseUrl);

  if (failures.length > 0) {
    console.error(failures.join('\n'));
    process.exit(1);
  }

  console.log(`Deploy anchor smoke passed for ${requiredHomepageAnchors.length} homepage anchors at ${origin}`);
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

module.exports = {
  buildAnchorFailures,
  requiredHomepageAnchors,
  resolveBaseUrl,
  verifyHomepageAnchors,
};
