const fs = require('fs');

const CSV_PATH = 'docs/free-search-marketing-tracker.csv';

function parseCsvLine(line) {
  const cells = [];
  let cell = '';
  let quoted = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];
    if (quoted && char === '"' && next === '"') {
      cell += '"';
      i += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === ',' && !quoted) {
      cells.push(cell);
      cell = '';
    } else {
      cell += char;
    }
  }

  cells.push(cell);
  return cells;
}

function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/);
  const headers = parseCsvLine(lines[0]);
  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    return Object.fromEntries(headers.map((header, index) => [header, values[index] || '']));
  });
}

function hasTargetUrl(row) {
  return /^https?:\/\//.test(row.url);
}

function priorityRank(priority) {
  return { P0: 0, P1: 1, P2: 2 }[priority] ?? 9;
}

function rowMedium(row) {
  try {
    return new URL(row.utm_url).searchParams.get('utm_medium') || 'unknown';
  } catch {
    return 'unknown';
  }
}

function opportunityScore(row) {
  let score = 0;
  const reasons = [];
  const text = `${row.channel} ${row.target} ${row.landing_url} ${row.anchor_or_listing_phrase} ${row.notes}`;
  const medium = rowMedium(row);

  if (row.priority === 'P0') {
    score += 30;
    reasons.push('P0');
  } else if (row.priority === 'P1') {
    score += 20;
    reasons.push('P1');
  } else if (row.priority === 'P2') {
    score += 10;
    reasons.push('P2');
  }

  if (row.status === 'follow-up needed') {
    score += 20;
    reasons.push('follow-up due');
  } else if (row.status === 'not_started' && hasTargetUrl(row)) {
    score += 18;
    reasons.push('ready URL');
  } else if (row.status === 'submitted') {
    score += 10;
    reasons.push('submitted check');
  } else if (row.status === 'not_started') {
    score += 5;
    reasons.push('needs target research');
  }

  if (medium === 'partner_referral') {
    score += 20;
    reasons.push('partner/referral');
  } else if (medium === 'organic_listing') {
    score += 14;
    reasons.push('organic listing');
  } else if (medium === 'indexing') {
    score += 12;
    reasons.push('indexing');
  } else if (medium === 'community_post') {
    score += 8;
    reasons.push('community');
  }

  if (/pos|39\s*miles|square|toast|clover|menusifu|menu\s*sifu|chowbus|mealkeyway/i.test(text)) {
    score += 18;
    reasons.push('POS intent');
  }
  if (/chinese|中餐|mandarin|cantonese|asian/i.test(text)) {
    score += 14;
    reasons.push('Chinese/Asian owner fit');
  }
  if (/restaurant technology|partner outreach|POS-specific outreach|Chinese business association/i.test(row.channel)) {
    score += 12;
    reasons.push('high-fit channel');
  }
  if (/service-areas|california|new-york|new-jersey|texas|boston|philadelphia|houston/i.test(row.landing_url)) {
    score += 6;
    reasons.push('local landing page');
  }

  return {
    score: Math.min(100, score),
    reasons: reasons.join(', '),
  };
}

function compareRows(a, b) {
  const scoreDiff = opportunityScore(b).score - opportunityScore(a).score;
  if (scoreDiff) return scoreDiff;
  const priorityDiff = priorityRank(a.priority) - priorityRank(b.priority);
  if (priorityDiff) return priorityDiff;
  return a.channel.localeCompare(b.channel) || a.target.localeCompare(b.target);
}

function cleanUrl(row) {
  return row.landing_url;
}

function posName(row) {
  const text = `${row.target} ${row.anchor_or_listing_phrase} ${row.landing_url} ${row.utm_url}`;
  const match = text.match(/39\s*Miles|MenuSifu|Menu\s*Sifu|Chowbus|Mealkeyway|Square|Toast|Clover/i);
  if (!match) return 'POS';
  return match[0].replace(/\s+/g, ' ').replace(/Menu Sifu/i, 'MenuSifu');
}

function aiDirectoryPacket(row) {
  return {
    title: 'Serviio',
    tagline: 'AI phone ordering for restaurants using POS systems.',
    shortDescription: row.landing_url.includes('chinese')
      ? 'Serviio helps Chinese restaurants answer phone orders with AI in English and Chinese, capture takeout orders, and evaluate POS-ready kitchen workflows.'
      : 'Serviio answers restaurant phone calls 24/7, takes pickup and takeout orders, supports English and Chinese, and helps POS-ready restaurants connect phone orders to the kitchen workflow.',
    longDescription: [
      'Serviio is an AI voice agent for restaurants that answers phone calls, captures order details, asks clarifying questions, and routes confirmed orders toward the restaurant POS or kitchen workflow.',
      'It is especially relevant for Chinese restaurants and takeout-heavy restaurants that receive calls during lunch, dinner, weekends, and holidays. Serviio can handle English and Chinese callers, confirm modifiers such as spice level and substitutions, collect pickup time and customer contact details, and reduce missed-call pressure on staff.',
      'Serviio prioritizes restaurants using POS systems such as 39 Miles, Square, Toast, Clover, MenuSifu, Chowbus, Mealkeyway, or another POS with a practical integration path.',
    ].join('\n\n'),
    categories: 'AI agents, Voice AI, AI automation, Restaurant technology, Customer service AI, Business operations, Phone answering, Food and beverage',
    features: '24/7 restaurant phone answering; natural conversation order taking; English and Chinese call handling; menu modifiers; pickup and takeout order capture; SMS confirmations; multi-line call handling; POS-ready workflow evaluation',
    pricing: '2% per completed order. No monthly fees and no setup costs.',
  };
}

function businessProfilePacket(row) {
  return {
    title: 'Serviio',
    tagline: 'AI phone ordering for restaurants.',
    shortDescription: 'Serviio is an AI phone ordering system for restaurants. It answers calls 24/7, takes orders in natural conversation, supports English and Chinese, and helps restaurants connect phone orders to POS-ready kitchen workflows.',
    longDescription: 'Serviio helps restaurants reduce missed calls and capture takeout orders during lunch, dinner, weekends, and holidays. It is built for restaurants with phone-order volume, including Chinese restaurants using systems such as 39 Miles, Square, Toast, Clover, MenuSifu, Chowbus, and Mealkeyway.',
    categories: 'Software company, Business service, Restaurant technology, Marketing service',
    features: '24/7 calls; AI phone ordering; bilingual English and Chinese; POS-ready workflow evaluation',
    pricing: '2% per completed order. No monthly fees and no setup costs.',
  };
}

function restaurantTechnologyPacket(row) {
  return {
    title: 'Serviio - AI Phone Ordering for POS-Ready Restaurants',
    tagline: 'AI phone ordering for restaurant POS and kitchen workflows.',
    shortDescription: 'Serviio helps restaurants capture phone orders with AI and evaluate how confirmed orders can flow into the restaurant POS or kitchen workflow.',
    longDescription: 'Serviio helps restaurants capture phone orders with AI and evaluate how confirmed orders can flow into the restaurant POS or kitchen workflow. It is built for takeout-heavy operators, including Chinese restaurants using systems such as 39 Miles, Square, Toast, Clover, MenuSifu, Chowbus, and Mealkeyway.',
    categories: 'Restaurant technology, Restaurant POS, AI phone answering, Takeout ordering, Voice AI',
    features: 'AI phone order taking; bilingual English and Chinese calls; menu modifiers; pickup detail capture; POS-ready workflow evaluation; SMS confirmations',
    pricing: '2% per completed order. No monthly fees and no setup costs.',
  };
}

function associationPacket(row) {
  const isChinese = row.landing_url.includes('/zh/');
  return {
    title: 'Serviio - AI phone ordering for Chinese restaurants',
    tagline: isChinese ? '面向美国中餐馆的 AI 电话接单系统。' : 'AI phone ordering resource for Chinese restaurants.',
    shortDescription: isChinese
      ? 'Serviio 可以用中文和英文接听电话、确认外卖和自取订单，并评估与餐厅 POS 或厨房流程的对接方式。'
      : 'Serviio helps Chinese restaurants answer phone orders with AI in English and Chinese, then route confirmed orders toward the restaurant POS or kitchen workflow.',
    longDescription: isChinese
      ? '您好 [Name]，\n\nServiio 是面向美国中餐馆的 AI 电话接单系统，可以用中文和英文接听电话、确认外卖和自取订单、处理菜单问题和备注，并评估与餐厅 POS 或厨房流程的对接方式。\n\n我们重点服务已经使用 39 Miles、Square、Toast、Clover、MenuSifu、Chowbus、Mealkeyway 或其他 POS 系统的中餐馆。如果贵会有会员资源、供应商推荐或餐饮科技资源页面，想请问是否可以考虑收录 Serviio，或安排一次简单介绍。'
      : 'Hi [Name],\n\nServiio helps Chinese restaurants answer phone orders with AI in English and Chinese, then route confirmed orders toward the restaurant POS or kitchen workflow.\n\nWe are focused on restaurants using systems such as 39 Miles, Square, Toast, Clover, MenuSifu, Chowbus, and Mealkeyway. If your association shares resources for Chinese restaurant owners, could Serviio be considered for a vendor/resource listing or member introduction?',
    categories: 'Chinese restaurant technology, Restaurant phone ordering, POS workflow, Vendor resource',
    features: 'Chinese and English phone answering; takeout order capture; menu questions and modifiers; POS-ready workflow evaluation',
    pricing: '2% per completed order. No monthly fees and no setup costs.',
  };
}

function posConsultantPacket(row) {
  return {
    subject: 'Referral path for restaurants missing phone orders',
    title: row.anchor_or_listing_phrase,
    tagline: 'Referral path for POS-ready restaurants missing phone orders.',
    shortDescription: 'Serviio helps restaurants answer phone orders with AI, capture structured order details, and evaluate POS or kitchen handoff options.',
    longDescription: [
      'Hi [Name],',
      'Serviio helps restaurants answer phone orders with AI, capture structured order details, and evaluate how confirmed orders can enter the restaurant POS or kitchen workflow.',
      'We are looking for POS consultants and restaurant technology partners who work with Chinese restaurants or takeout-heavy operators using 39 Miles, Square, Toast, Clover, MenuSifu, Chowbus, Mealkeyway, or similar systems.',
      'If you meet restaurant owners who miss calls during rush hours or still re-enter phone orders manually, could we discuss a referral path? No-POS owners can also be routed toward POS recommendations before AI phone ordering.',
      `Relevant page:\n${row.utm_url}`,
      'Thanks,\nServiio',
    ].join('\n\n'),
    categories: 'Partner referral, POS consultant, Restaurant technology, Chinese restaurant operations',
    features: 'AI phone ordering referral path; POS-ready lead qualification; Chinese restaurant owner fit; no-POS lead routing for recommendations',
    pricing: '2% per completed order. No monthly fees and no setup costs.',
  };
}

function restaurantWebsitePartnerPacket(row) {
  return {
    subject: 'AI phone-ordering add-on for restaurant website clients',
    title: row.anchor_or_listing_phrase,
    tagline: 'AI phone-ordering add-on for restaurant website and ordering clients.',
    shortDescription: 'Serviio helps restaurant website and online-ordering clients capture phone orders with AI when guests still call instead of ordering online.',
    longDescription: [
      'Hi [Name],',
      'Serviio helps restaurants capture phone orders with AI when guests still call instead of ordering online. It can answer in English and Chinese, ask about modifiers, confirm pickup details, and evaluate POS or kitchen handoff options.',
      'This can be a useful add-on for restaurant website and online-ordering clients who still miss calls, still take orders manually, or still need staff to re-enter phone orders during rush hours.',
      'Would you be open to discussing a referral path for restaurant clients using systems such as 39 Miles, Square, Toast, Clover, MenuSifu, Chowbus, Mealkeyway, or similar POS platforms?',
      `Relevant page:\n${row.utm_url}`,
      'Thanks,\nServiio',
    ].join('\n\n'),
    categories: 'Restaurant website agency, Online ordering partner, Restaurant technology, AI phone ordering',
    features: 'AI phone-ordering add-on; bilingual calls; pickup detail capture; POS-ready handoff evaluation; referral path for website clients',
    pricing: '2% per completed order. No monthly fees and no setup costs.',
  };
}

function posSpecificPacket(row) {
  const pos = posName(row);
  return {
    subject: `AI phone ordering add-on for ${pos} restaurants`,
    title: `${pos} AI phone ordering partner referral`,
    tagline: `AI phone ordering for restaurants using ${pos}.`,
    shortDescription: `Serviio helps ${pos} restaurant operators answer phone orders with AI and evaluate POS-ready phone-order workflows.`,
    longDescription: [
      'Hi [Name],',
      'Serviio helps restaurants answer phone calls with AI, capture structured takeout order details, and evaluate how confirmed orders can move into the restaurant POS or kitchen workflow.',
      `We are especially focused on Chinese restaurants and takeout-heavy operators already using ${pos}. These restaurants often still receive high phone volume during lunch and dinner rush, even when online ordering is available.`,
      'Would you be open to a short partner/referral conversation? We can route POS-ready restaurants to an AI phone-ordering demo, and no-POS restaurants can be qualified separately for POS recommendations before they are a fit for Serviio.',
      `Relevant page:\n${row.utm_url}`,
      'Thanks,\nServiio',
    ].join('\n\n'),
    followUp: [
      'Hi [Name],',
      `Following up on the note below. The best fit is a restaurant that already uses ${pos}, receives regular phone orders, and wants fewer missed calls or less manual re-entry during rush hours.`,
      'If there is a better person for partner or integration conversations, could you point me in the right direction?',
      'Thanks,\nServiio',
    ].join('\n\n'),
    categories: 'POS partner referral, Restaurant POS, AI phone ordering, Chinese restaurant technology',
    features: `${pos} restaurant owner qualification; AI phone order capture; bilingual calls; POS-ready workflow evaluation; no-POS lead routing`,
    pricing: '2% per completed order. No monthly fees and no setup costs.',
  };
}

function communityPacket(row) {
  const isChinese = row.landing_url.includes('/zh/') || /wechat|chinese|中餐/i.test(`${row.target} ${row.anchor_or_listing_phrase}`);
  return {
    subject: isChinese ? 'Can we share an AI phone-ordering resource?' : 'Permission to share restaurant phone-ordering resource',
    title: row.anchor_or_listing_phrase,
    tagline: isChinese ? '中餐馆 AI 电话接单和 POS 流程资源。' : 'AI phone-ordering resource for POS-ready restaurant owners.',
    shortDescription: 'Ask for permission before posting a short resource for Chinese restaurants and takeout-heavy restaurants that already use a POS and still receive phone orders during rush hours.',
    longDescription: [
      'Hi [Name],',
      'I work on Serviio, an AI phone answering and order-taking system for restaurants. We are trying to share a practical resource for Chinese restaurants and takeout-heavy restaurants that already use a POS and still receive phone orders during rush hours.',
      'Before posting, I wanted to ask whether it is appropriate to share a short resource/demo link with your group. The post would focus on missed calls, bilingual English/Chinese phone orders, and POS-ready workflows rather than a generic sales pitch.',
      'If allowed, I will keep it short and follow any group rules.',
      'Thanks,\nServiio',
    ].join('\n\n'),
    chinesePermission: isChinese
      ? [
          '您好 [Name]，',
          '我是 Serviio 的团队成员。Serviio 是面向餐馆的 AI 电话接听和接单系统，重点帮助已经使用 POS、但高峰期仍然经常接电话接单的中餐馆。',
          '在群里发布前，想先请问是否可以分享一个简短资源或演示链接。内容会围绕中餐馆高峰期漏接电话、中英文电话接单、以及和 POS/厨房流程对接的实际问题，不会刷屏。',
          '如果允许，我会按照群规简短发布。',
          '谢谢，\nServiio',
        ].join('\n\n')
      : '',
    approvedPost: [
      'Many takeout-heavy restaurants still lose phone orders during lunch and dinner rush because staff are packing orders, serving guests, or answering in-store questions.',
      'Serviio is an AI phone answering and order-taking system for restaurants. It can answer in English and Chinese, ask about modifiers and pickup details, and evaluate POS workflows for systems such as 39 Miles, Square, Toast, Clover, MenuSifu, Chowbus, and Mealkeyway.',
      'Best fit: Chinese restaurants or takeout restaurants that already use a POS and receive regular phone orders.',
      `Check fit:\n${row.utm_url}`,
    ].join('\n\n'),
    categories: 'Community post, Chinese restaurant owners, Restaurant POS, AI phone ordering',
    features: 'Permission-first community outreach; bilingual restaurant owner messaging; POS-ready fit check; short approved post',
    pricing: '2% per completed order. No monthly fees and no setup costs.',
  };
}

function webmasterPacket(row) {
  return {
    title: row.target,
    tagline: 'Submit sitemap and priority URLs.',
    shortDescription: 'Submit https://serviio.ai/sitemap.xml and request indexing for top-priority Chinese restaurant and POS landing pages.',
    longDescription: 'Run npm run indexing:urls, submit the sitemap, then inspect URLs under Top Priority URL Inspection List first.',
    categories: 'Indexing, Search Console, Webmaster tools',
    features: 'Sitemap submission; URL inspection; priority page indexing',
    pricing: 'Free',
  };
}

function packetFor(row) {
  if (row.channel === 'AI directory' || row.channel === 'Startup directory') return aiDirectoryPacket(row);
  if (row.channel === 'Business profile') return businessProfilePacket(row);
  if (row.channel === 'Chinese business association' || row.channel === 'Asian chamber') return associationPacket(row);
  if (row.channel === 'Restaurant technology directory' || row.channel === 'Educational resource listing') return restaurantTechnologyPacket(row);
  if (row.channel === 'POS-specific outreach') return posSpecificPacket(row);
  if (row.channel === 'Partner outreach' && /website|online ordering/i.test(row.target)) return restaurantWebsitePartnerPacket(row);
  if (row.channel === 'Partner outreach') return posConsultantPacket(row);
  if (row.channel === 'Community post') return communityPacket(row);
  if (row.channel === 'Webmaster tool') return webmasterPacket(row);
  return {
    title: row.anchor_or_listing_phrase,
    tagline: 'AI phone ordering and POS-ready workflow resource.',
    shortDescription: 'Serviio helps restaurants answer phone orders with AI, capture structured order details, and evaluate how confirmed orders can enter the restaurant POS or kitchen workflow.',
    longDescription: 'Serviio works best for restaurants with regular phone-order volume, especially Chinese restaurants and takeout-heavy operators using 39 Miles, Square, Toast, Clover, MenuSifu, Chowbus, Mealkeyway, or similar POS systems.',
    categories: 'Restaurant technology, POS integration, AI phone answering',
    features: 'AI phone answering; order capture; bilingual calls; POS-ready workflow evaluation',
    pricing: '2% per completed order. No monthly fees and no setup costs.',
  };
}

function readySubmissionRows(rows) {
  return rows
    .filter((row) => row.status === 'not_started' && hasTargetUrl(row))
    .sort(compareRows);
}

function main() {
  const rows = parseCsv(fs.readFileSync(CSV_PATH, 'utf8'));
  const readyRows = readySubmissionRows(rows);

  console.log('# Serviio Ready Submission Packets');
  console.log('');
  console.log('Use these packets with rows listed by npm run marketing:summary. After submitting, update docs/free-search-marketing-tracker.csv with status, owner, date_submitted, and notes.');
  console.log('');

  for (const row of readyRows) {
    const packet = packetFor(row);
    const opportunity = opportunityScore(row);
    console.log(`## ${row.priority} - ${row.target}`);
    console.log(`Opportunity score: ${opportunity.score}/100 (${opportunity.reasons})`);
    console.log(`Channel: ${row.channel}`);
    console.log(`Submission/contact URL: ${row.url}`);
    console.log(`Tracker landing URL: ${row.landing_url}`);
    console.log(`Tracker UTM URL: ${row.utm_url}`);
    console.log(`Clean fallback URL: ${cleanUrl(row)}`);
    console.log(`Anchor/listing phrase: ${row.anchor_or_listing_phrase}`);
    console.log('');
    if (packet.subject) console.log(`Subject: ${packet.subject}`);
    console.log(`Title: ${packet.title}`);
    console.log(`Tagline: ${packet.tagline}`);
    console.log(`Short description: ${packet.shortDescription}`);
    console.log('');
    console.log('Long description:');
    console.log(packet.longDescription);
    console.log('');
    if (packet.chinesePermission) {
      console.log('Chinese permission request:');
      console.log(packet.chinesePermission);
      console.log('');
    }
    if (packet.approvedPost) {
      console.log('Approved post after permission:');
      console.log(packet.approvedPost);
      console.log('');
    }
    if (packet.followUp) {
      console.log('Follow-up:');
      console.log(packet.followUp);
      console.log('');
    }
    console.log(`Categories: ${packet.categories}`);
    console.log(`Features: ${packet.features}`);
    console.log(`Pricing: ${packet.pricing}`);
    console.log(`Contact email: info@serviio.ai`);
    console.log('');
    console.log('After submission: set status=submitted, date_submitted=YYYY-MM-DD, and paste the confirmation or follow-up note into notes.');
    console.log('');
  }

  console.log(`Generated ${readyRows.length} ready submission packets from ${CSV_PATH}`);
}

if (require.main === module) {
  main();
}

module.exports = {
  compareRows,
  hasTargetUrl,
  opportunityScore,
  packetFor,
  parseCsv,
  readySubmissionRows,
};
