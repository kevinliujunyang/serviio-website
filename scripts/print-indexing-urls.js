const fs = require('fs');

const xml = fs.readFileSync('sitemap.xml', 'utf8');
const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);

const priorityPatterns = [
  '/guides/restaurant-ai-phone-ordering-pos-guide/',
  '/zh/guides/restaurant-ai-phone-ordering-pos-guide/',
  '/chinese-restaurant-ai-phone-ordering/',
  '/ai-phone-answering-for-chinese-restaurants/',
  '/restaurant-ai-phone-order-taker/',
  '/restaurant-pos-phone-order-integration/',
  '/chinese-restaurant-pos-integration/',
  '/restaurant-phone-order-ai-pos/',
  '/restaurant-ai-assistant/',
  '/zh/chinese-restaurant-pos-integration/',
  '/zh/restaurant-phone-order-ai-pos/',
  '/zh/restaurant-ai-assistant/',
  '/restaurant-pos-system-phone-orders/',
  '/ai-voice-assistant-for-restaurants/',
  '/restaurant-tech-ai-phone-ordering/',
  '/best-pos-for-chinese-restaurant-phone-orders/',
  '/restaurant-phone-order-automation/',
  '/restaurant-automation-software-phone-orders/',
  '/zh/restaurant-pos-system-phone-orders/',
  '/zh/ai-voice-assistant-for-restaurants/',
  '/zh/restaurant-tech-ai-phone-ordering/',
  '/zh/best-pos-for-chinese-restaurant-phone-orders/',
  '/zh/restaurant-phone-order-automation/',
  '/zh/restaurant-automation-software-phone-orders/',
  '/chinese-restaurant-phone-order-automation/',
  '/chinese-restaurant-voice-ai/',
  '/ai-phone-ordering-for-chinese-takeout/',
  '/pos/39-miles-ai-phone-ordering/',
  '/pos/menusifu-ai-phone-ordering/',
  '/pos/chowbus-ai-phone-ordering/',
  '/pos/mealkeyway-ai-phone-ordering/',
  '/service-areas/',
  '/service-areas/california-chinese-restaurant-ai-phone-ordering/',
  '/zh/service-areas/california-chinese-restaurant-ai-phone-ordering/',
  '/service-areas/new-york-chinese-restaurant-ai-phone-ordering/',
  '/zh/service-areas/new-york-chinese-restaurant-ai-phone-ordering/',
  '/service-areas/new-jersey-chinese-restaurant-ai-phone-ordering/',
  '/zh/service-areas/new-jersey-chinese-restaurant-ai-phone-ordering/',
  '/service-areas/texas-chinese-restaurant-ai-phone-ordering/',
  '/zh/service-areas/texas-chinese-restaurant-ai-phone-ordering/',
];

const priorityUrls = urls.filter((url) =>
  priorityPatterns.some((pattern) => new URL(url).pathname.includes(pattern))
);
const remainingUrls = urls.filter((url) => !priorityUrls.includes(url));

console.log('# Priority URL Inspection List');
console.log(priorityUrls.join('\n'));
console.log('\n# Remaining Sitemap URLs');
console.log(remainingUrls.join('\n'));
