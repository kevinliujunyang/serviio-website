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

function posFromRow(row) {
  const text = `${row.target} ${row.anchor_or_listing_phrase} ${row.notes}`;
  const match = text.match(/39 Miles|MenuSifu|Chowbus|Mealkeyway|Square|Toast|Clover/i);
  return match ? match[0] : '';
}

function queriesFor(row) {
  const target = row.target;
  const anchor = row.anchor_or_listing_phrase;
  const pos = posFromRow(row);

  if (row.channel === 'Business profile' || row.channel === 'Webmaster tool') {
    return [];
  }

  if (row.channel === 'AI directory') {
    return [
      '"submit AI tool" "restaurant"',
      '"AI tool directory" "phone answering"',
      '"AI agent directory" "restaurant"',
      '"AI startup directory" "voice assistant"',
    ];
  }

  if (row.channel === 'Startup directory') {
    return [
      '"submit startup" "restaurant software"',
      '"SaaS directory" "restaurant"',
      '"startup directory" "AI voice assistant"',
      '"B2B SaaS directory" "restaurant technology"',
    ];
  }

  if (row.channel === 'Educational resource listing') {
    return [
      '"restaurant technology resources" "POS"',
      '"restaurant operations resources" "phone orders"',
      '"restaurant POS guide" "submit"',
      '"restaurant technology newsletter" "AI"',
    ];
  }

  if (row.channel === 'Restaurant technology directory') {
    return [
      '"restaurant technology directory" "POS"',
      '"restaurant software directory" "phone orders"',
      '"restaurant automation software" "directory"',
      '"restaurant POS integration" "vendor directory"',
    ];
  }

  if (row.channel === 'Chinese business association') {
    return [
      '"Chinese restaurant association" "business directory"',
      '"Chinese business association" "restaurant"',
      '"Chinese chamber of commerce" "business directory"',
      '"Chinese takeout" "business association"',
    ];
  }

  if (row.channel === 'Asian chamber') {
    return [
      `"${target}" "business directory"`,
      `"${target}" "member directory"`,
      '"Asian chamber of commerce" "restaurant"',
      '"Asian business association" "directory"',
    ];
  }

  if (row.channel === 'Partner outreach') {
    return [
      '"restaurant POS consultant" "Chinese restaurant"',
      '"restaurant technology consultant" "phone orders"',
      '"restaurant POS implementation" "takeout"',
      '"restaurant consultant" "POS integration"',
    ];
  }

  if (row.channel === 'POS-specific outreach') {
    return [
      `"${pos}" "restaurant consultant"`,
      `"${pos}" "POS setup" "restaurant"`,
      `"${pos}" "Chinese restaurant"`,
      `"${pos}" "integration partner"`,
    ].filter((query) => !query.startsWith('""'));
  }

  if (row.channel === 'Community post') {
    return [
      '"Chinese restaurant owner group"',
      '"restaurant owner group" "phone orders"',
      '"Chinese takeout owner" "WeChat"',
      '"Asian restaurant owner" "community"',
    ];
  }

  if (row.channel === 'Customer proof') {
    return [
      '"restaurant case study" "POS" "phone orders"',
      '"restaurant testimonial" "missed calls"',
      '"Chinese restaurant" "POS" "case study"',
    ];
  }

  return [
    `"${target}" "submit"`,
    `"${anchor}" "directory"`,
  ];
}

const rows = parseCsv(fs.readFileSync(CSV_PATH, 'utf8'));
const actionableRows = rows.filter((row) => queriesFor(row).length > 0);

console.log('# Serviio Free Search Prospect Queries');
console.log('');
console.log('Use these searches to find free directories, partner pages, associations, communities, and consultant targets. Record every submission or outreach result in docs/free-search-marketing-tracker.csv.');
console.log('');

for (const row of actionableRows) {
  console.log(`## ${row.priority} - ${row.channel}: ${row.target}`);
  console.log(`Landing: ${row.landing_url}`);
  console.log(`UTM: ${row.utm_url}`);
  console.log(`Anchor/listing phrase: ${row.anchor_or_listing_phrase}`);
  console.log('');
  for (const query of queriesFor(row)) {
    console.log(`- ${query}`);
  }
  console.log('');
}

console.log(`Generated ${actionableRows.length} prospecting blocks from ${CSV_PATH}`);
