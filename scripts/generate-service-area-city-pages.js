const fs = require('fs');
const path = require('path');

const SITE_ORIGIN = 'https://serviio.ai';
const LASTMOD = '2026-06-03';
const RELATED_POS_LINKS_EN = [
  ['Chinese restaurant AI phone ordering', '/chinese-restaurant-ai-phone-ordering/'],
  ['Restaurant POS phone order integration', '/restaurant-pos-phone-order-integration/'],
  ['39 Miles AI phone ordering', '/pos/39-miles-ai-phone-ordering/'],
  ['Square POS phone order AI', '/pos/square-ai-phone-ordering/'],
  ['Toast POS phone order AI', '/pos/toast-ai-phone-ordering/'],
  ['Clover POS phone order AI', '/pos/clover-ai-phone-ordering/'],
  ['MenuSifu AI phone ordering', '/pos/menusifu-ai-phone-ordering/'],
  ['Chowbus AI phone ordering', '/pos/chowbus-ai-phone-ordering/'],
  ['Mealkeyway AI phone ordering', '/pos/mealkeyway-ai-phone-ordering/'],
];
const RELATED_POS_LINKS_ZH = [
  ['中餐馆 AI 电话接单', '/zh/chinese-restaurant-ai-phone-ordering/'],
  ['餐厅 POS 电话订单对接', '/zh/restaurant-pos-phone-order-integration/'],
  ['39 Miles AI 电话接单', '/zh/pos/39-miles-ai-phone-ordering/'],
  ['Square POS 电话订单 AI', '/zh/pos/square-ai-phone-ordering/'],
  ['Toast POS 电话订单 AI', '/zh/pos/toast-ai-phone-ordering/'],
  ['Clover POS 电话订单 AI', '/zh/pos/clover-ai-phone-ordering/'],
  ['MenuSifu AI 电话接单', '/zh/pos/menusifu-ai-phone-ordering/'],
  ['Chowbus AI 电话接单', '/zh/pos/chowbus-ai-phone-ordering/'],
  ['Mealkeyway AI 电话接单', '/zh/pos/mealkeyway-ai-phone-ordering/'],
];

const cities = [
  {
    slug: 'san-francisco-chinese-restaurant-ai-phone-ordering',
    city: 'San Francisco',
    state: 'California',
    abbr: 'CA',
    stateSlug: 'california-chinese-restaurant-ai-phone-ordering',
    nearby: 'Daly City, Sunset District, Richmond District, Chinatown, Millbrae, and San Mateo',
    zhCity: '旧金山',
    zhState: '加州',
    zhNearby: 'Daly City、日落区、列治文区、唐人街、Millbrae 和 San Mateo',
  },
  {
    slug: 'los-angeles-chinese-restaurant-ai-phone-ordering',
    city: 'Los Angeles',
    state: 'California',
    abbr: 'CA',
    stateSlug: 'california-chinese-restaurant-ai-phone-ordering',
    nearby: 'San Gabriel Valley, Monterey Park, Alhambra, Arcadia, Irvine, and Rowland Heights',
    zhCity: '洛杉矶',
    zhState: '加州',
    zhNearby: '圣盖博谷、Monterey Park、Alhambra、Arcadia、Irvine 和 Rowland Heights',
  },
  {
    slug: 'new-york-city-chinese-restaurant-ai-phone-ordering',
    city: 'New York City',
    state: 'New York',
    abbr: 'NY',
    stateSlug: 'new-york-chinese-restaurant-ai-phone-ordering',
    nearby: 'Queens, Flushing, Manhattan, Brooklyn, Chinatown, and Long Island',
    zhCity: '纽约市',
    zhState: '纽约',
    zhNearby: '皇后区、法拉盛、曼哈顿、布鲁克林、唐人街和长岛',
  },
  {
    slug: 'houston-chinese-restaurant-ai-phone-ordering',
    city: 'Houston',
    state: 'Texas',
    abbr: 'TX',
    stateSlug: 'texas-chinese-restaurant-ai-phone-ordering',
    nearby: 'Bellaire, Katy, Sugar Land, Chinatown, The Heights, and Pearland',
    zhCity: '休斯顿',
    zhState: '德州',
    zhNearby: 'Bellaire、Katy、Sugar Land、唐人街、The Heights 和 Pearland',
  },
  {
    slug: 'seattle-chinese-restaurant-ai-phone-ordering',
    city: 'Seattle',
    state: 'Washington',
    abbr: 'WA',
    stateSlug: '',
    nearby: 'Bellevue, Redmond, International District, Kirkland, Renton, and Lynnwood',
    zhCity: '西雅图',
    zhState: '华盛顿州',
    zhNearby: 'Bellevue、Redmond、国际区、Kirkland、Renton 和 Lynnwood',
  },
  {
    slug: 'chicago-chinese-restaurant-ai-phone-ordering',
    city: 'Chicago',
    state: 'Illinois',
    abbr: 'IL',
    stateSlug: '',
    nearby: 'Chinatown, Bridgeport, Uptown, Naperville, Schaumburg, and Evanston',
    zhCity: '芝加哥',
    zhState: '伊利诺伊州',
    zhNearby: '唐人街、Bridgeport、Uptown、Naperville、Schaumburg 和 Evanston',
  },
  {
    slug: 'boston-chinese-restaurant-ai-phone-ordering',
    city: 'Boston',
    state: 'Massachusetts',
    abbr: 'MA',
    stateSlug: 'massachusetts-chinese-restaurant-ai-phone-ordering',
    nearby: 'Quincy, Cambridge, Malden, Brookline, Allston, Somerville, and Chinatown',
    zhCity: '波士顿',
    zhState: '马萨诸塞州',
    zhNearby: 'Quincy、Cambridge、Malden、Brookline、Allston、Somerville 和唐人街',
  },
  {
    slug: 'philadelphia-chinese-restaurant-ai-phone-ordering',
    city: 'Philadelphia',
    state: 'Pennsylvania',
    abbr: 'PA',
    stateSlug: 'pennsylvania-chinese-restaurant-ai-phone-ordering',
    nearby: 'Chinatown, University City, Northeast Philadelphia, South Philadelphia, King of Prussia, and Cherry Hill',
    zhCity: '费城',
    zhState: '宾州',
    zhNearby: '唐人街、University City、费城东北区、南费城、King of Prussia 和 Cherry Hill',
  },
];

function writeFile(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

function json(value) {
  return JSON.stringify(value);
}

function relatedLinks(links) {
  return links
    .map(([text, href]) => `<a href="${href}" class="text-primary-600 hover:text-primary-700">${text}</a>`)
    .join('');
}

function enPage(city) {
  const url = `${SITE_ORIGIN}/service-areas/${city.slug}/`;
  const zhUrl = `${SITE_ORIGIN}/zh/service-areas/${city.slug}/`;
  const title = `${city.city} Chinese Restaurant AI Phone Ordering`;
  const description = `AI phone ordering for ${city.city} Chinese restaurants using POS systems like 39 Miles, Square, Toast, Clover, MenuSifu, and Chowbus.`;
  const stateHref = city.stateSlug ? `/service-areas/${city.stateSlug}/` : '/service-areas/';
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="theme-color" content="#4f46e5">
    <title>${title} | Serviio</title>
    <meta name="description" content="${description}">
    <link rel="icon" type="image/svg+xml" href="/assets/logo.svg">
    <link rel="canonical" href="${url}">
    <link rel="alternate" hreflang="en" href="${url}">
    <link rel="alternate" hreflang="zh" href="${zhUrl}">
    <link rel="alternate" hreflang="x-default" href="${url}">
    <meta property="og:title" content="${title}">
    <meta property="og:description" content="${description}">
    <meta property="og:url" content="${url}">
    <meta property="og:type" content="website">
    <meta property="og:site_name" content="Serviio">
    <meta property="og:image" content="${SITE_ORIGIN}/assets/og-image.png">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${title}">
    <meta name="twitter:description" content="${description}">
    <meta name="twitter:image" content="${SITE_ORIGIN}/assets/og-image.png">
    <script type="application/ld+json">{"@context":"https://schema.org","@type":"Service","name":${json(title)},"serviceType":"AI phone ordering for Chinese restaurants","description":${json(description)},"provider":{"@type":"Organization","name":"Serviio","url":"${SITE_ORIGIN}"},"areaServed":{"@type":"City","name":${json(city.city)}},"audience":{"@type":"Audience","audienceType":"Chinese restaurant owners using restaurant POS systems"}}</script>
    <script type="application/ld+json">{"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":"Home","item":"${SITE_ORIGIN}/"},{"@type":"ListItem","position":2,"name":"Service Areas","item":"${SITE_ORIGIN}/service-areas/"},{"@type":"ListItem","position":3,"name":${json(city.city)},"item":"${url}"}]}</script>
    <script type="application/ld+json">{"@context":"https://schema.org","@type":"FAQPage","mainEntity":[{"@type":"Question","name":${json(`Does Serviio serve Chinese restaurants in ${city.city}?`)},"acceptedAnswer":{"@type":"Answer","text":${json(`Yes. Serviio can evaluate Chinese restaurants in ${city.city}, especially restaurants with steady phone orders and an existing POS system.`)}}},{"@type":"Question","name":"Which POS systems can be reviewed?","acceptedAnswer":{"@type":"Answer","text":"The lead form supports 39 Miles, Square, Toast, Clover, MenuSifu, Chowbus, Mealkeyway, other POS systems, and restaurants without a POS yet."}},{"@type":"Question","name":"What nearby markets are relevant?","acceptedAnswer":{"@type":"Answer","text":${json(`Relevant nearby markets include ${city.nearby}.`)}}}]}</script>
    <link rel="stylesheet" href="/assets/css/styles.css">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
</head>
<body class="bg-white text-gray-900 antialiased">
    <nav class="fixed w-full z-50 glass border-b border-gray-100"><div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"><div class="flex justify-between items-center h-16"><a href="/"><img src="/assets/logo.svg" alt="Serviio" class="h-8"></a><div class="hidden md:flex items-center space-x-8"><a href="/service-areas/" class="text-gray-600 hover:text-gray-900 transition">Service Areas</a><a href="${stateHref}" class="text-gray-600 hover:text-gray-900 transition">${city.state}</a><a href="/restaurant-pos-phone-order-integration/" class="text-gray-600 hover:text-gray-900 transition">POS Integration</a><a href="#contact" class="gradient-bg text-white px-5 py-2 rounded-full font-medium hover:opacity-90 transition">Check Fit</a><a href="/zh/service-areas/${city.slug}/" hreflang="zh" class="text-gray-600 hover:text-gray-900 transition">中文</a></div></div></div></nav>
    <main>
        <section class="pt-32 pb-20 px-4 sm:px-6 lg:px-8"><div class="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center"><div><div class="inline-flex items-center px-4 py-2 bg-primary-50 rounded-full text-primary-600 text-sm font-medium mb-8"><span class="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>${city.city} service area</div><h1 class="text-5xl sm:text-6xl font-bold tracking-tight mb-6">${city.city} Chinese restaurant AI phone ordering</h1><p class="text-xl text-gray-600 mb-8">Serviio helps ${city.city} Chinese restaurants answer phone orders with AI, handle English and Chinese callers, and qualify POS workflows for takeout-heavy restaurants.</p><div class="flex flex-col sm:flex-row gap-4"><a href="#contact" class="gradient-bg text-white px-8 py-4 rounded-full font-semibold text-lg hover:opacity-90 transition shadow-lg shadow-primary-500/25 text-center">Check ${city.city} Fit</a><a href="/guides/restaurant-ai-phone-ordering-pos-guide/" class="bg-gray-100 text-gray-900 px-8 py-4 rounded-full font-semibold text-lg hover:bg-gray-200 transition text-center">Read POS Guide</a></div></div><div class="bg-white rounded-2xl shadow-xl border border-gray-100 p-8"><h2 class="text-2xl font-semibold mb-4">Best-fit ${city.city} restaurant</h2><ul class="space-y-4 text-gray-700"><li class="flex gap-3"><span class="text-green-500 font-bold">✓</span><span>Chinese restaurant, Chinese takeout, or Asian restaurant in ${city.city}</span></li><li class="flex gap-3"><span class="text-green-500 font-bold">✓</span><span>Uses 39 Miles, Square, Toast, Clover, MenuSifu, Chowbus, Mealkeyway, or another POS</span></li><li class="flex gap-3"><span class="text-green-500 font-bold">✓</span><span>Gets phone orders during lunch, dinner, weekends, or holidays</span></li></ul></div></div></section>
        <section class="py-24 px-4 sm:px-6 lg:px-8 bg-gray-50"><div class="max-w-7xl mx-auto"><div class="text-center mb-12"><h2 class="text-4xl font-bold mb-4">Local AI phone ordering for ${city.city} takeout</h2><p class="text-xl text-gray-600 max-w-3xl mx-auto">This page targets ${city.city} Chinese restaurant owners searching for AI phone answering, AI phone order taking, restaurant POS phone orders, and bilingual takeout call handling.</p></div><div class="grid md:grid-cols-3 gap-8"><div class="bg-white p-8 rounded-2xl border border-gray-100"><h3 class="text-xl font-semibold mb-3">Nearby restaurant markets</h3><p class="text-gray-600">${city.nearby}.</p></div><div class="bg-white p-8 rounded-2xl border border-gray-100"><h3 class="text-xl font-semibold mb-3">POS-ready phone orders</h3><p class="text-gray-600">Capture POS system, menu workflow, modifiers, pickup timing, and phone-order volume before integration review.</p></div><div class="bg-white p-8 rounded-2xl border border-gray-100"><h3 class="text-xl font-semibold mb-3">Bilingual rush-hour coverage</h3><p class="text-gray-600">Help staff reduce missed calls when the front counter is busy serving guests, packing orders, or taking payments.</p></div></div></div></section>
        <section class="py-20 px-4 sm:px-6 lg:px-8"><div class="max-w-5xl mx-auto text-center"><h2 class="text-3xl font-bold mb-4">Related ${city.city} SEO pages</h2><p class="text-lg text-gray-600 mb-8">These pages connect local demand with Chinese restaurant AI phone ordering, POS integration, and specific POS systems.</p><div class="flex flex-wrap justify-center gap-4 text-sm font-medium">${relatedLinks(RELATED_POS_LINKS_EN)}</div></div></section>
        <section id="contact" class="py-24 px-4 sm:px-6 lg:px-8 bg-gray-900"><div class="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center"><div><h2 class="text-4xl font-bold text-white mb-4">Check your ${city.city} restaurant</h2><p class="text-xl text-gray-400 mb-8">Tell us your city, POS system, and phone-order volume. We will confirm whether Serviio is a fit for your ${city.city} restaurant.</p></div><div class="bg-white rounded-2xl p-8"><form id="contact-form" action="https://formspree.io/f/xeeezpzn" method="POST" class="space-y-6"><input type="hidden" name="_subject" value="${city.city} Service Area Lead - Serviio"><input type="hidden" name="_next" value="${url}#thank-you"><input type="hidden" name="lead_source" value="service_area_${city.slug.replace(/-/g, '_')}"><input type="hidden" name="ideal_customer_profile" value="Chinese restaurant owner with existing POS or POS interest"><div><label for="restaurant" class="block text-sm font-medium text-gray-700 mb-2">Restaurant Name</label><input type="text" id="restaurant" name="restaurant" required class="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition" placeholder="Golden Dragon"></div><div><label for="name" class="block text-sm font-medium text-gray-700 mb-2">Your Name</label><input type="text" id="name" name="name" required class="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition" placeholder="Owner or manager name"></div><div><label for="phone" class="block text-sm font-medium text-gray-700 mb-2">Phone Number</label><input type="tel" id="phone" name="phone" required class="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition" placeholder="(555) 123-4567"></div><div><label for="city" class="block text-sm font-medium text-gray-700 mb-2">City</label><input type="text" id="city" name="restaurant_city" required value="${city.city}" class="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition"></div><div><label for="state" class="block text-sm font-medium text-gray-700 mb-2">State</label><input type="text" id="state" name="restaurant_state" required value="${city.abbr}" class="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition"></div><div><label for="pos_system" class="block text-sm font-medium text-gray-700 mb-2">Current POS System</label><select id="pos_system" name="pos_system" required class="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition"><option value="">Select your POS</option><option>39 Miles</option><option>Square</option><option>Toast</option><option>Clover</option><option>MenuSifu</option><option>Chowbus</option><option>Mealkeyway</option><option>Other POS</option><option>No POS yet</option></select></div><div><label for="phone_orders" class="block text-sm font-medium text-gray-700 mb-2">Approximate phone orders per week</label><select id="phone_orders" name="phone_orders_per_week" class="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition"><option value="">Select range</option><option>Under 25</option><option>25-75</option><option>76-150</option><option>150+</option></select></div><div><label for="pos_recommendation_interest" class="block text-sm font-medium text-gray-700 mb-2">If you do not have a POS, do you want POS recommendations?</label><select id="pos_recommendation_interest" name="pos_recommendation_interest" class="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition"><option value="">Select one</option><option>Yes, I want POS recommendations</option><option>No, I only want AI phone ordering</option><option>Not applicable, I already have a POS</option></select></div><button type="submit" class="w-full gradient-bg text-white py-4 rounded-lg font-semibold text-lg hover:opacity-90 transition">Check ${city.city} Fit</button></form></div></div></section>
    </main>
    <footer class="bg-gray-900 border-t border-gray-800 py-12 px-4 sm:px-6 lg:px-8"><div class="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center"><div class="mb-6 md:mb-0"><img src="/assets/logo.svg" alt="Serviio" class="h-8 brightness-0 invert"><p class="text-gray-500 mt-2">AI phone ordering for ${city.city} Chinese restaurants</p></div><div class="flex gap-8 text-gray-400"><a href="/" class="hover:text-white transition">Home</a><a href="/service-areas/" class="hover:text-white transition">Service Areas</a><a href="/#contact" class="hover:text-white transition">Contact</a></div></div></footer>
    <script>document.querySelectorAll('a[href^="#"]').forEach(a=>a.addEventListener('click',e=>{e.preventDefault();const t=document.querySelector(a.getAttribute('href'));if(t)t.scrollIntoView({behavior:'smooth',block:'start'});}));if(window.location.hash==='#thank-you'){document.getElementById('contact-form').innerHTML='<div class="text-center py-8"><h3 class="text-2xl font-bold text-gray-900 mb-2">Thank You!</h3><p class="text-gray-600">We received your ${city.city} service-area request and will follow up within 24 hours.</p></div>';}</script>
    <script src="/assets/js/form-attribution.js"></script>
</body>
</html>
`;
}

function zhPage(city) {
  const url = `${SITE_ORIGIN}/zh/service-areas/${city.slug}/`;
  const enUrl = `${SITE_ORIGIN}/service-areas/${city.slug}/`;
  const title = `${city.zhCity}中餐馆 AI 电话接单`;
  const description = `Serviio 为${city.zhCity}中餐馆提供 AI 电话接单、中英文接听和 POS 对接评估，适合已有 POS 且电话订单较多的餐厅。`;
  const stateHref = city.stateSlug ? `/zh/service-areas/${city.stateSlug}/` : '/zh/service-areas/';
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="theme-color" content="#4f46e5">
    <title>${title} | Serviio</title>
    <meta name="description" content="${description}">
    <link rel="icon" type="image/svg+xml" href="/assets/logo.svg">
    <link rel="canonical" href="${url}">
    <link rel="alternate" hreflang="en" href="${enUrl}">
    <link rel="alternate" hreflang="zh" href="${url}">
    <link rel="alternate" hreflang="x-default" href="${enUrl}">
    <meta property="og:title" content="${title}">
    <meta property="og:description" content="${description}">
    <meta property="og:url" content="${url}">
    <meta property="og:type" content="website">
    <meta property="og:site_name" content="Serviio">
    <meta property="og:image" content="${SITE_ORIGIN}/assets/og-image.png">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${title}">
    <meta name="twitter:description" content="${description}">
    <meta name="twitter:image" content="${SITE_ORIGIN}/assets/og-image.png">
    <script type="application/ld+json">{"@context":"https://schema.org","@type":"Service","name":${json(title)},"serviceType":"中餐馆 AI 电话接单","description":${json(description)},"provider":{"@type":"Organization","name":"Serviio","url":"${SITE_ORIGIN}"},"areaServed":{"@type":"City","name":${json(city.city)}},"audience":{"@type":"Audience","audienceType":"使用餐厅 POS 系统的美国中餐馆老板"},"inLanguage":"zh-CN"}</script>
    <script type="application/ld+json">{"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":"首页","item":"${SITE_ORIGIN}/zh/"},{"@type":"ListItem","position":2,"name":"服务地区","item":"${SITE_ORIGIN}/zh/service-areas/"},{"@type":"ListItem","position":3,"name":${json(city.zhCity)},"item":"${url}"}]}</script>
    <script type="application/ld+json">{"@context":"https://schema.org","@type":"FAQPage","inLanguage":"zh-CN","mainEntity":[{"@type":"Question","name":${json(`Serviio 是否服务${city.zhCity}中餐馆？`)},"acceptedAnswer":{"@type":"Answer","text":${json(`可以。Serviio 可以评估${city.zhCity}中餐馆，尤其适合已有 POS 系统且电话订单稳定的餐厅。`)}}},{"@type":"Question","name":"可以评估哪些 POS 系统？","acceptedAnswer":{"@type":"Answer","text":"表单支持 39 Miles、Square、Toast、Clover、MenuSifu、Chowbus、Mealkeyway、其他 POS，以及暂时没有 POS 的餐厅。"}},{"@type":"Question","name":"附近哪些市场相关？","acceptedAnswer":{"@type":"Answer","text":${json(`附近相关市场包括${city.zhNearby}。`)}}}]}</script>
    <link rel="stylesheet" href="/assets/css/styles.css">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <style>body { font-family: 'Noto Sans SC', 'Inter', system-ui, sans-serif; }</style>
</head>
<body class="bg-white text-gray-900 antialiased">
    <nav class="fixed w-full z-50 glass border-b border-gray-100"><div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"><div class="flex justify-between items-center h-16"><a href="/zh/"><img src="/assets/logo.svg" alt="Serviio" class="h-8"></a><div class="hidden md:flex items-center space-x-8"><a href="/zh/service-areas/" class="text-gray-600 hover:text-gray-900 transition">服务地区</a><a href="${stateHref}" class="text-gray-600 hover:text-gray-900 transition">${city.zhState}</a><a href="/zh/restaurant-pos-phone-order-integration/" class="text-gray-600 hover:text-gray-900 transition">POS 对接</a><a href="#contact" class="gradient-bg text-white px-5 py-2 rounded-full font-medium hover:opacity-90 transition">检查适配</a><a href="/service-areas/${city.slug}/" hreflang="en" class="text-gray-600 hover:text-gray-900 transition">EN</a></div></div></div></nav>
    <main>
        <section class="pt-32 pb-20 px-4 sm:px-6 lg:px-8"><div class="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center"><div><div class="inline-flex items-center px-4 py-2 bg-primary-50 rounded-full text-primary-600 text-sm font-medium mb-8"><span class="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>${city.zhCity}服务地区</div><h1 class="text-5xl sm:text-6xl font-bold tracking-tight mb-6">${city.zhCity}中餐馆 AI 电话接单</h1><p class="text-xl text-gray-600 mb-8">Serviio 帮助${city.zhCity}中餐馆用 AI 接听电话订单，处理中英文来电，并评估外卖和自取订单的 POS 对接流程。</p><div class="flex flex-col sm:flex-row gap-4"><a href="#contact" class="gradient-bg text-white px-8 py-4 rounded-full font-semibold text-lg hover:opacity-90 transition shadow-lg shadow-primary-500/25 text-center">检查${city.zhCity}适配</a><a href="/zh/guides/restaurant-ai-phone-ordering-pos-guide/" class="bg-gray-100 text-gray-900 px-8 py-4 rounded-full font-semibold text-lg hover:bg-gray-200 transition text-center">阅读 POS 指南</a></div></div><div class="bg-white rounded-2xl shadow-xl border border-gray-100 p-8"><h2 class="text-2xl font-semibold mb-4">适合的${city.zhCity}餐厅</h2><ul class="space-y-4 text-gray-700"><li class="flex gap-3"><span class="text-green-500 font-bold">✓</span><span>${city.zhCity}中餐馆、中餐外卖店或亚洲餐厅</span></li><li class="flex gap-3"><span class="text-green-500 font-bold">✓</span><span>正在使用 39 Miles、Square、Toast、Clover、MenuSifu、Chowbus、Mealkeyway 或其他 POS</span></li><li class="flex gap-3"><span class="text-green-500 font-bold">✓</span><span>午餐、晚餐、周末或节假日电话订单较多</span></li></ul></div></div></section>
        <section class="py-24 px-4 sm:px-6 lg:px-8 bg-gray-50"><div class="max-w-7xl mx-auto"><div class="text-center mb-12"><h2 class="text-4xl font-bold mb-4">${city.zhCity}中餐外卖 AI 电话接单</h2><p class="text-xl text-gray-600 max-w-3xl mx-auto">本页覆盖${city.zhCity}中餐馆老板搜索的 AI 电话接听、AI 电话接单、餐厅 POS 电话订单和中英文外卖电话处理需求。</p></div><div class="grid md:grid-cols-3 gap-8"><div class="bg-white p-8 rounded-2xl border border-gray-100"><h3 class="text-xl font-semibold mb-3">附近餐饮市场</h3><p class="text-gray-600">${city.zhNearby}。</p></div><div class="bg-white p-8 rounded-2xl border border-gray-100"><h3 class="text-xl font-semibold mb-3">适合 POS 的电话订单</h3><p class="text-gray-600">在对接评估前记录 POS 系统、菜单流程、备注、取餐时间和电话订单量。</p></div><div class="bg-white p-8 rounded-2xl border border-gray-100"><h3 class="text-xl font-semibold mb-3">高峰期中英文接听</h3><p class="text-gray-600">当前台忙着服务客人、打包订单或收款时，帮助员工减少漏接电话。</p></div></div></div></section>
        <section class="py-20 px-4 sm:px-6 lg:px-8"><div class="max-w-5xl mx-auto text-center"><h2 class="text-3xl font-bold mb-4">${city.zhCity}相关 SEO 页面</h2><p class="text-lg text-gray-600 mb-8">这些页面把本地搜索需求连接到中餐馆 AI 电话接单、POS 对接和具体 POS 系统。</p><div class="flex flex-wrap justify-center gap-4 text-sm font-medium">${relatedLinks(RELATED_POS_LINKS_ZH)}</div></div></section>
        <section id="contact" class="py-24 px-4 sm:px-6 lg:px-8 bg-gray-900"><div class="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center"><div><h2 class="text-4xl font-bold text-white mb-4">检查您的${city.zhCity}餐厅</h2><p class="text-xl text-gray-400 mb-8">提交城市、POS 系统和电话订单量，我们会确认 Serviio 是否适合您的${city.zhCity}餐厅。</p></div><div class="bg-white rounded-2xl p-8"><form id="contact-form" action="https://formspree.io/f/xeeezpzn" method="POST" class="space-y-6"><input type="hidden" name="_subject" value="${city.city} Service Area Lead - Serviio (中文)"><input type="hidden" name="_next" value="${url}#thank-you"><input type="hidden" name="lead_source" value="zh_service_area_${city.slug.replace(/-/g, '_')}"><input type="hidden" name="ideal_customer_profile" value="Chinese restaurant owner with existing POS or POS interest"><input type="hidden" name="_language" value="zh"><div><label for="restaurant" class="block text-sm font-medium text-gray-700 mb-2">餐厅名称</label><input type="text" id="restaurant" name="restaurant" required class="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition" placeholder="金龙餐厅"></div><div><label for="name" class="block text-sm font-medium text-gray-700 mb-2">您的姓名</label><input type="text" id="name" name="name" required class="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition" placeholder="张先生"></div><div><label for="phone" class="block text-sm font-medium text-gray-700 mb-2">联系电话</label><input type="tel" id="phone" name="phone" required class="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition" placeholder="(555) 123-4567"></div><div><label for="city" class="block text-sm font-medium text-gray-700 mb-2">城市</label><input type="text" id="city" name="restaurant_city" required value="${city.zhCity}" class="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition"></div><div><label for="state" class="block text-sm font-medium text-gray-700 mb-2">州</label><input type="text" id="state" name="restaurant_state" required value="${city.abbr}" class="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition"></div><div><label for="pos_system" class="block text-sm font-medium text-gray-700 mb-2">当前使用的 POS 系统</label><select id="pos_system" name="pos_system" required class="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition"><option value="">请选择 POS</option><option>39 Miles</option><option>Square</option><option>Toast</option><option>Clover</option><option>MenuSifu</option><option>Chowbus</option><option>Mealkeyway</option><option>其他 POS</option><option>暂时没有 POS</option></select></div><div><label for="phone_orders" class="block text-sm font-medium text-gray-700 mb-2">每周大约电话订单量</label><select id="phone_orders" name="phone_orders_per_week" class="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition"><option value="">请选择范围</option><option>少于 25 单</option><option>25-75 单</option><option>76-150 单</option><option>150 单以上</option></select></div><div><label for="pos_recommendation_interest" class="block text-sm font-medium text-gray-700 mb-2">如果还没有 POS，是否希望了解 POS 推荐？</label><select id="pos_recommendation_interest" name="pos_recommendation_interest" class="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition"><option value="">请选择</option><option>希望了解 POS 推荐</option><option>只需要 AI 电话接单</option><option>不适用，我已经有 POS</option></select></div><button type="submit" class="w-full gradient-bg text-white py-4 rounded-lg font-semibold text-lg hover:opacity-90 transition">检查${city.zhCity}适配</button></form></div></div></section>
    </main>
    <footer class="bg-gray-900 border-t border-gray-800 py-12 px-4 sm:px-6 lg:px-8"><div class="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center"><div class="mb-6 md:mb-0"><img src="/assets/logo.svg" alt="Serviio" class="h-8 brightness-0 invert"><p class="text-gray-500 mt-2">${city.zhCity}中餐馆 AI 电话接单</p></div><div class="flex gap-8 text-gray-400"><a href="/zh/" class="hover:text-white transition">首页</a><a href="/zh/service-areas/" class="hover:text-white transition">服务地区</a><a href="/zh/#contact" class="hover:text-white transition">联系我们</a></div></div></footer>
    <script>document.querySelectorAll('a[href^="#"]').forEach(a=>a.addEventListener('click',e=>{e.preventDefault();const t=document.querySelector(a.getAttribute('href'));if(t)t.scrollIntoView({behavior:'smooth',block:'start'});}));if(window.location.hash==='#thank-you'){document.getElementById('contact-form').innerHTML='<div class="text-center py-8"><h3 class="text-2xl font-bold text-gray-900 mb-2">感谢您的咨询！</h3><p class="text-gray-600">我们已收到您的${city.zhCity}地区评估需求，将在 24 小时内联系您。</p></div>';}</script>
    <script src="/assets/js/form-attribution.js"></script>
</body>
</html>
`;
}

function sitemapEntry(city, lang) {
  const enUrl = `${SITE_ORIGIN}/service-areas/${city.slug}/`;
  const zhUrl = `${SITE_ORIGIN}/zh/service-areas/${city.slug}/`;
  const loc = lang === 'en' ? enUrl : zhUrl;
  return `  <url>
    <loc>${loc}</loc>
    <xhtml:link rel="alternate" hreflang="en" href="${enUrl}"/>
    <xhtml:link rel="alternate" hreflang="zh" href="${zhUrl}"/>
    <xhtml:link rel="alternate" hreflang="x-default" href="${enUrl}"/>
    <lastmod>${LASTMOD}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.80</priority>
  </url>`;
}

function updateSitemap() {
  let xml = fs.readFileSync('sitemap.xml', 'utf8');
  const entries = cities
    .flatMap((city) => [sitemapEntry(city, 'en'), sitemapEntry(city, 'zh')])
    .filter((entry) => !xml.includes(entry.match(/<loc>([^<]+)/)[1]))
    .join('\n');
  if (entries) {
    xml = xml.replace('\n  <url>\n    <loc>https://serviio.ai/guides/restaurant-ai-phone-ordering-pos-guide/</loc>', `\n${entries}\n  <url>\n    <loc>https://serviio.ai/guides/restaurant-ai-phone-ordering-pos-guide/</loc>`);
    fs.writeFileSync('sitemap.xml', xml);
  }
}

function insertLinks(file, marker, links) {
  let html = fs.readFileSync(file, 'utf8');
  const missing = links.filter((link) => !html.includes(link.href));
  if (missing.length === 0) return;
  const block = missing.map((link) => `<a class="${link.className}" href="${link.href}">${link.text}</a>`).join('');
  html = html.replace(marker, `${block}${marker}`);
  fs.writeFileSync(file, html);
}

function updateInternalLinks() {
  const enLinks = cities.map((city) => ({
    href: `/service-areas/${city.slug}/`,
    text: `${city.city} Chinese restaurant AI phone ordering`,
    className: 'text-primary-600 hover:text-primary-700',
  }));
  const zhLinks = cities.map((city) => ({
    href: `/zh/service-areas/${city.slug}/`,
    text: `${city.zhCity}中餐馆 AI 电话接单`,
    className: 'text-primary-600 hover:text-primary-700',
  }));
  const sitemapEnLinks = enLinks.map((link) => ({ ...link, className: 'hover:text-primary-700' }));
  const sitemapZhLinks = zhLinks.map((link) => ({ ...link, className: 'hover:text-primary-700' }));

  insertLinks('service-areas/index.html', '</div>\n            </div>\n        </section>\n\n        <section class="py-20', enLinks);
  insertLinks('zh/service-areas/index.html', '</div>\n            </div>\n        </section>\n\n        <section id="contact"', zhLinks);
  insertLinks('site-map/index.html', '</div>\n                </div>\n            </div>\n        </section>\n    </main>', sitemapEnLinks);
  insertLinks('zh/site-map/index.html', '</div>\n                </div>\n            </div>\n        </section>\n    </main>', sitemapZhLinks);
}

function updateIndexingScript() {
  const file = 'scripts/print-indexing-urls.js';
  let js = fs.readFileSync(file, 'utf8');
  const lines = cities.flatMap((city) => [
    `  '/service-areas/${city.slug}/',`,
    `  '/zh/service-areas/${city.slug}/',`,
  ]);
  const additions = lines.filter((line) => !js.includes(line)).join('\n');
  if (!additions) return;
  js = js.replace("  '/service-areas/',\n", `  '/service-areas/',\n${additions}\n`);
  fs.writeFileSync(file, js);
}

for (const city of cities) {
  writeFile(`service-areas/${city.slug}/index.html`, enPage(city));
  writeFile(`zh/service-areas/${city.slug}/index.html`, zhPage(city));
}
updateSitemap();
updateInternalLinks();
updateIndexingScript();

console.log(`Generated ${cities.length * 2} city service-area pages`);
