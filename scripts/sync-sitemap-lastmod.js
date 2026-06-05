const fs = require('fs');
const { execFileSync } = require('child_process');

const SITE_ORIGIN = 'https://serviio.ai';

function pagePathFromUrl(url) {
  const pathname = new URL(url).pathname;
  if (pathname === '/') return 'index.html';
  return pathname.replace(/^\//, '').replace(/\/$/, '') + '/index.html';
}

function gitLastCommitDate(file) {
  try {
    return execFileSync('git', ['log', '-1', '--format=%cs', '--', file], { encoding: 'utf8' }).trim();
  } catch {
    return '';
  }
}

function syncSitemapLastmod() {
  const xml = fs.readFileSync('sitemap.xml', 'utf8');
  let updated = 0;

  const nextXml = xml.replace(/(<url>[\s\S]*?<loc>([^<]+)<\/loc>[\s\S]*?<lastmod>)([^<]+)(<\/lastmod>[\s\S]*?<\/url>)/g, (match, before, loc, currentLastmod, after) => {
    if (!loc.startsWith(SITE_ORIGIN)) return match;
    const file = pagePathFromUrl(loc);
    if (!fs.existsSync(file)) return match;

    const lastCommitDate = gitLastCommitDate(file);
    if (!lastCommitDate || lastCommitDate === currentLastmod) return match;

    updated += 1;
    return `${before}${lastCommitDate}${after}`;
  });

  if (updated > 0) {
    fs.writeFileSync('sitemap.xml', nextXml);
  }

  return updated;
}

if (require.main === module) {
  const updated = syncSitemapLastmod();
  console.log(`Updated ${updated} sitemap lastmod entr${updated === 1 ? 'y' : 'ies'}`);
}

module.exports = {
  pagePathFromUrl,
  syncSitemapLastmod,
};
