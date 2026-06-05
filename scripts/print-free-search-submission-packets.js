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

function cleanUrl(row) {
  return row.landing_url;
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

const rows = parseCsv(fs.readFileSync(CSV_PATH, 'utf8'));
const readyRows = rows
  .filter((row) => row.status === 'not_started' && hasTargetUrl(row))
  .sort((a, b) => priorityRank(a.priority) - priorityRank(b.priority) || a.channel.localeCompare(b.channel) || a.target.localeCompare(b.target));

console.log('# Serviio Ready Submission Packets');
console.log('');
console.log('Use these packets with rows listed by npm run marketing:summary. After submitting, update docs/free-search-marketing-tracker.csv with status, owner, date_submitted, and notes.');
console.log('');

for (const row of readyRows) {
  const packet = packetFor(row);
  console.log(`## ${row.priority} - ${row.target}`);
  console.log(`Submission/contact URL: ${row.url}`);
  console.log(`Tracker landing URL: ${row.landing_url}`);
  console.log(`Tracker UTM URL: ${row.utm_url}`);
  console.log(`Clean fallback URL: ${cleanUrl(row)}`);
  console.log(`Anchor/listing phrase: ${row.anchor_or_listing_phrase}`);
  console.log('');
  console.log(`Title: ${packet.title}`);
  console.log(`Tagline: ${packet.tagline}`);
  console.log(`Short description: ${packet.shortDescription}`);
  console.log('');
  console.log('Long description:');
  console.log(packet.longDescription);
  console.log('');
  console.log(`Categories: ${packet.categories}`);
  console.log(`Features: ${packet.features}`);
  console.log(`Pricing: ${packet.pricing}`);
  console.log(`Contact email: info@serviio.ai`);
  console.log('');
  console.log('After submission: set status=submitted, date_submitted=YYYY-MM-DD, and paste the confirmation or follow-up note into notes.');
  console.log('');
}

console.log(`Generated ${readyRows.length} ready submission packets from ${CSV_PATH}`);
