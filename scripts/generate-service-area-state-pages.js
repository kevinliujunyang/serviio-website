const fs = require('fs');
const path = require('path');

const SITE_ORIGIN = 'https://serviio.ai';
const LASTMOD = '2026-06-03';
const RELATED_POS_LINKS_EN = [
  ['Chinese restaurant POS integration', '/chinese-restaurant-pos-integration/'],
  ['AI phone answering for Chinese restaurants', '/ai-phone-answering-for-chinese-restaurants/'],
  ['39 Miles AI phone ordering', '/pos/39-miles-ai-phone-ordering/'],
  ['Square POS phone order AI', '/pos/square-ai-phone-ordering/'],
  ['Toast POS phone order AI', '/pos/toast-ai-phone-ordering/'],
  ['Clover POS phone order AI', '/pos/clover-ai-phone-ordering/'],
  ['MenuSifu AI phone ordering', '/pos/menusifu-ai-phone-ordering/'],
  ['Chowbus AI phone ordering', '/pos/chowbus-ai-phone-ordering/'],
  ['Mealkeyway AI phone ordering', '/pos/mealkeyway-ai-phone-ordering/'],
];
const RELATED_POS_LINKS_ZH = [
  ['中餐馆 POS 对接', '/zh/chinese-restaurant-pos-integration/'],
  ['中餐馆 AI 电话接听', '/zh/ai-phone-answering-for-chinese-restaurants/'],
  ['39 Miles AI 电话接单', '/zh/pos/39-miles-ai-phone-ordering/'],
  ['Square POS 电话订单 AI', '/zh/pos/square-ai-phone-ordering/'],
  ['Toast POS 电话订单 AI', '/zh/pos/toast-ai-phone-ordering/'],
  ['Clover POS 电话订单 AI', '/zh/pos/clover-ai-phone-ordering/'],
  ['MenuSifu AI 电话接单', '/zh/pos/menusifu-ai-phone-ordering/'],
  ['Chowbus AI 电话接单', '/zh/pos/chowbus-ai-phone-ordering/'],
  ['Mealkeyway AI 电话接单', '/zh/pos/mealkeyway-ai-phone-ordering/'],
];

const states = [
  {
    slug: 'california-chinese-restaurant-ai-phone-ordering',
    name: 'California',
    abbr: 'CA',
    cities: 'Bay Area, San Francisco, San Jose, Los Angeles, Irvine, San Diego, and Sacramento',
    cityList: ['San Francisco', 'San Jose', 'Los Angeles', 'Irvine', 'San Diego', 'Sacramento'],
    zhName: '加州',
    zhCities: '湾区、旧金山、圣何塞、洛杉矶、Irvine、圣地亚哥和萨克拉门托',
    zhCityList: ['旧金山', '圣何塞', '洛杉矶', 'Irvine', '圣地亚哥', '萨克拉门托'],
  },
  {
    slug: 'new-york-chinese-restaurant-ai-phone-ordering',
    name: 'New York',
    abbr: 'NY',
    cities: 'New York City, Queens, Flushing, Brooklyn, Manhattan, Long Island, and Albany',
    cityList: ['New York City', 'Queens', 'Flushing', 'Brooklyn', 'Manhattan', 'Long Island'],
    zhName: '纽约',
    zhCities: '纽约市、皇后区、法拉盛、布鲁克林、曼哈顿、长岛和 Albany',
    zhCityList: ['纽约市', '皇后区', '法拉盛', '布鲁克林', '曼哈顿', '长岛'],
  },
  {
    slug: 'new-jersey-chinese-restaurant-ai-phone-ordering',
    name: 'New Jersey',
    abbr: 'NJ',
    cities: 'Edison, Jersey City, Fort Lee, Princeton, Cherry Hill, and North Jersey',
    cityList: ['Edison', 'Jersey City', 'Fort Lee', 'Princeton', 'Cherry Hill', 'North Jersey'],
    zhName: '新泽西',
    zhCities: 'Edison、Jersey City、Fort Lee、Princeton、Cherry Hill 和新泽西北部',
    zhCityList: ['Edison', 'Jersey City', 'Fort Lee', 'Princeton', 'Cherry Hill', '新泽西北部'],
  },
  {
    slug: 'texas-chinese-restaurant-ai-phone-ordering',
    name: 'Texas',
    abbr: 'TX',
    cities: 'Houston, Dallas, Plano, Austin, San Antonio, Sugar Land, and Richardson',
    cityList: ['Houston', 'Dallas', 'Plano', 'Austin', 'San Antonio', 'Sugar Land'],
    zhName: '德州',
    zhCities: '休斯顿、达拉斯、Plano、奥斯汀、圣安东尼奥、Sugar Land 和 Richardson',
    zhCityList: ['休斯顿', '达拉斯', 'Plano', '奥斯汀', '圣安东尼奥', 'Sugar Land'],
  },
  {
    slug: 'massachusetts-chinese-restaurant-ai-phone-ordering',
    name: 'Massachusetts',
    abbr: 'MA',
    cities: 'Boston, Quincy, Cambridge, Malden, Brookline, Allston, and Somerville',
    cityList: ['Boston', 'Quincy', 'Cambridge', 'Malden', 'Brookline', 'Allston'],
    zhName: '马萨诸塞州',
    zhCities: '波士顿、Quincy、Cambridge、Malden、Brookline、Allston 和 Somerville',
    zhCityList: ['波士顿', 'Quincy', 'Cambridge', 'Malden', 'Brookline', 'Allston'],
  },
  {
    slug: 'pennsylvania-chinese-restaurant-ai-phone-ordering',
    name: 'Pennsylvania',
    abbr: 'PA',
    cities: 'Philadelphia, University City, Chinatown, Northeast Philadelphia, King of Prussia, and Pittsburgh',
    cityList: ['Philadelphia', 'University City', 'Chinatown', 'Northeast Philadelphia', 'King of Prussia', 'Pittsburgh'],
    zhName: '宾州',
    zhCities: '费城、University City、唐人街、费城东北区、King of Prussia 和 Pittsburgh',
    zhCityList: ['费城', 'University City', '唐人街', '费城东北区', 'King of Prussia', 'Pittsburgh'],
  },
];

function writeFile(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

function escapeJson(value) {
  return JSON.stringify(value);
}

function relatedLinks(links) {
  return links
    .map(([text, href]) => `<a href="${href}" class="text-primary-600 hover:text-primary-700">${text}</a>`)
    .join('');
}

function enPage(state) {
  const url = `${SITE_ORIGIN}/service-areas/${state.slug}/`;
  const zhUrl = `${SITE_ORIGIN}/zh/service-areas/${state.slug}/`;
  const title = `${state.name} Chinese Restaurant AI Phone Ordering`;
  const description = `AI phone ordering for ${state.name} Chinese restaurants using POS systems like 39 Miles, Square, Toast, Clover, MenuSifu, and Chowbus.`;
  const cityTags = state.cityList.map((city) => `<span class="bg-white border border-gray-200 rounded-full px-4 py-2 text-sm font-medium text-gray-700">${city}</span>`).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="theme-color" content="#4f46e5">
    <title>${title} | Serviio</title>
    <meta name="description" content="${description}">
    <meta name="keywords" content="${state.name} Chinese restaurant AI phone ordering, ${state.name} restaurant AI phone answering, ${state.name} Chinese takeout POS integration, ${state.abbr} restaurant phone order AI">
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
    <script type="application/ld+json">{"@context":"https://schema.org","@type":"Service","name":${escapeJson(`${state.name} Chinese restaurant AI phone ordering`)},"serviceType":"AI phone ordering for Chinese restaurants","description":${escapeJson(description)},"provider":{"@type":"Organization","name":"Serviio","url":"${SITE_ORIGIN}"},"areaServed":{"@type":"State","name":${escapeJson(state.name)}},"audience":{"@type":"Audience","audienceType":"Chinese restaurant owners using restaurant POS systems"}}</script>
    <script type="application/ld+json">{"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":"Home","item":"${SITE_ORIGIN}/"},{"@type":"ListItem","position":2,"name":"Service Areas","item":"${SITE_ORIGIN}/service-areas/"},{"@type":"ListItem","position":3,"name":${escapeJson(state.name)},"item":"${url}"}]}</script>
    <script type="application/ld+json">{"@context":"https://schema.org","@type":"FAQPage","mainEntity":[{"@type":"Question","name":${escapeJson(`Does Serviio serve Chinese restaurants in ${state.name}?`)},"acceptedAnswer":{"@type":"Answer","text":${escapeJson(`Yes. Serviio can evaluate Chinese restaurants in ${state.name}, especially restaurants with steady phone orders and an existing POS system.`)}}},{"@type":"Question","name":"Which POS systems can be reviewed?","acceptedAnswer":{"@type":"Answer","text":"The lead form supports 39 Miles, Square, Toast, Clover, MenuSifu, Chowbus, Mealkeyway, other POS systems, and restaurants that do not have a POS yet."}},{"@type":"Question","name":"Can setup be handled remotely?","acceptedAnswer":{"@type":"Answer","text":"Most setup work can be reviewed remotely, including menu intake, phone routing, call handling rules, and POS workflow fit."}}]}</script>
    <link rel="stylesheet" href="/assets/css/styles.css">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
</head>
<body class="bg-white text-gray-900 antialiased">
    <nav class="fixed w-full z-50 glass border-b border-gray-100"><div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"><div class="flex justify-between items-center h-16"><a href="/"><img src="/assets/logo.svg" alt="Serviio" class="h-8"></a><div class="hidden md:flex items-center space-x-8"><a href="/service-areas/" class="text-gray-600 hover:text-gray-900 transition">Service Areas</a><a href="/chinese-restaurant-ai-phone-ordering/" class="text-gray-600 hover:text-gray-900 transition">Chinese Restaurants</a><a href="/restaurant-pos-phone-order-integration/" class="text-gray-600 hover:text-gray-900 transition">POS Integration</a><a href="#contact" class="gradient-bg text-white px-5 py-2 rounded-full font-medium hover:opacity-90 transition">Check Fit</a><a href="/zh/service-areas/${state.slug}/" hreflang="zh" class="text-gray-600 hover:text-gray-900 transition">中文</a></div></div></div></nav>
    <main>
        <section class="pt-32 pb-20 px-4 sm:px-6 lg:px-8"><div class="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center"><div><div class="inline-flex items-center px-4 py-2 bg-primary-50 rounded-full text-primary-600 text-sm font-medium mb-8"><span class="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>${state.name} service area</div><h1 class="text-5xl sm:text-6xl font-bold tracking-tight mb-6">${state.name} Chinese restaurant AI phone ordering</h1><p class="text-xl text-gray-600 mb-8">Serviio helps ${state.name} Chinese restaurants answer phone orders with AI, handle bilingual calls, and qualify POS integration paths for takeout-heavy workflows.</p><div class="flex flex-col sm:flex-row gap-4"><a href="#contact" class="gradient-bg text-white px-8 py-4 rounded-full font-semibold text-lg hover:opacity-90 transition shadow-lg shadow-primary-500/25 text-center">Check ${state.abbr} Fit</a><a href="/restaurant-pos-system-phone-orders/" class="bg-gray-100 text-gray-900 px-8 py-4 rounded-full font-semibold text-lg hover:bg-gray-200 transition text-center">POS Phone Orders</a></div></div><div class="bg-white rounded-2xl shadow-xl border border-gray-100 p-8"><h2 class="text-2xl font-semibold mb-4">Best-fit ${state.name} restaurant</h2><ul class="space-y-4 text-gray-700"><li class="flex gap-3"><span class="text-green-500 font-bold">✓</span><span>Chinese restaurant, Chinese takeout, or Asian restaurant in ${state.name}</span></li><li class="flex gap-3"><span class="text-green-500 font-bold">✓</span><span>Uses 39 Miles, Square, Toast, Clover, MenuSifu, Chowbus, Mealkeyway, or another POS</span></li><li class="flex gap-3"><span class="text-green-500 font-bold">✓</span><span>Receives meaningful phone orders during lunch, dinner, weekends, or holidays</span></li></ul></div></div></section>
        <section class="py-24 px-4 sm:px-6 lg:px-8 bg-gray-50"><div class="max-w-7xl mx-auto"><div class="text-center mb-12"><h2 class="text-4xl font-bold mb-4">Local restaurant markets in ${state.name}</h2><p class="text-xl text-gray-600 max-w-3xl mx-auto">This page targets ${state.name} Chinese restaurant owners searching for AI phone answering, AI phone order taking, restaurant POS phone orders, and bilingual takeout call handling.</p></div><div class="flex flex-wrap justify-center gap-3 mb-12">${cityTags}</div><div class="grid md:grid-cols-3 gap-8"><div class="bg-white p-8 rounded-2xl border border-gray-100"><h3 class="text-xl font-semibold mb-3">Bilingual phone answering</h3><p class="text-gray-600">Serve English and Chinese callers with consistent order capture, pickup timing, menu questions, and SMS confirmation.</p></div><div class="bg-white p-8 rounded-2xl border border-gray-100"><h3 class="text-xl font-semibold mb-3">POS-ready qualification</h3><p class="text-gray-600">Prioritize restaurants already using POS systems and capture no-POS restaurants for later POS recommendation workflows.</p></div><div class="bg-white p-8 rounded-2xl border border-gray-100"><h3 class="text-xl font-semibold mb-3">Rush-hour call coverage</h3><p class="text-gray-600">Multi-line AI answering helps reduce missed calls when staff are cooking, packing, or serving guests.</p></div></div></div></section>
        <section class="py-20 px-4 sm:px-6 lg:px-8"><div class="max-w-5xl mx-auto text-center"><h2 class="text-3xl font-bold mb-4">Related ${state.name} search intents</h2><p class="text-lg text-gray-600 mb-8">Use this page for local combinations such as ${state.name} restaurant AI phone answering, ${state.name} Chinese takeout AI ordering, and ${state.name} restaurant POS phone order integration.</p><div class="flex flex-wrap justify-center gap-4 text-sm font-medium">${relatedLinks(RELATED_POS_LINKS_EN)}</div></div></section>
        <section id="contact" class="py-24 px-4 sm:px-6 lg:px-8 bg-gray-900"><div class="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center"><div><h2 class="text-4xl font-bold text-white mb-4">Check your ${state.name} restaurant</h2><p class="text-xl text-gray-400 mb-8">Tell us your city, POS system, and phone-order volume. We will confirm whether Serviio is a fit for your ${state.name} restaurant.</p></div><div class="bg-white rounded-2xl p-8"><form id="contact-form" action="https://formspree.io/f/xeeezpzn" method="POST" class="space-y-6"><input type="hidden" name="_subject" value="${state.name} Service Area Lead - Serviio"><input type="hidden" name="_next" value="${url}#thank-you"><input type="hidden" name="lead_source" value="service_area_${state.abbr.toLowerCase()}"><input type="hidden" name="ideal_customer_profile" value="Chinese restaurant owner with existing POS or POS interest"><div><label for="restaurant" class="block text-sm font-medium text-gray-700 mb-2">Restaurant Name</label><input type="text" id="restaurant" name="restaurant" required class="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition" placeholder="Golden Dragon"></div><div><label for="name" class="block text-sm font-medium text-gray-700 mb-2">Your Name</label><input type="text" id="name" name="name" required class="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition" placeholder="Owner or manager name"></div><div><label for="phone" class="block text-sm font-medium text-gray-700 mb-2">Phone Number</label><input type="tel" id="phone" name="phone" required class="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition" placeholder="(555) 123-4567"></div><div><label for="city" class="block text-sm font-medium text-gray-700 mb-2">City</label><input type="text" id="city" name="restaurant_city" required class="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition" placeholder="${state.cityList[0]}"></div><div><label for="state" class="block text-sm font-medium text-gray-700 mb-2">State</label><input type="text" id="state" name="restaurant_state" required value="${state.abbr}" class="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition"></div><div><label for="pos_system" class="block text-sm font-medium text-gray-700 mb-2">Current POS System</label><select id="pos_system" name="pos_system" required class="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition"><option value="">Select your POS</option><option>39 Miles</option><option>Square</option><option>Toast</option><option>Clover</option><option>MenuSifu</option><option>Chowbus</option><option>Mealkeyway</option><option>Other POS</option><option>No POS yet</option></select></div><div><label for="phone_orders" class="block text-sm font-medium text-gray-700 mb-2">Approximate phone orders per week</label><select id="phone_orders" name="phone_orders_per_week" class="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition" required><option value="">Select range</option><option>Under 25</option><option>25-75</option><option>76-150</option><option>150+</option></select></div><div><label for="pos_recommendation_interest" class="block text-sm font-medium text-gray-700 mb-2">If you do not have a POS, do you want POS recommendations?</label><select id="pos_recommendation_interest" name="pos_recommendation_interest" class="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition" required><option value="">Select one</option><option>Yes, I want POS recommendations</option><option>No, I only want AI phone ordering</option><option>Not applicable, I already have a POS</option></select></div><button type="submit" class="w-full gradient-bg text-white py-4 rounded-lg font-semibold text-lg hover:opacity-90 transition">Check ${state.abbr} Fit</button></form></div></div></section>
    </main>
    <footer class="bg-gray-900 border-t border-gray-800 py-12 px-4 sm:px-6 lg:px-8"><div class="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center"><div class="mb-6 md:mb-0"><img src="/assets/logo.svg" alt="Serviio" class="h-8 brightness-0 invert"><p class="text-gray-500 mt-2">AI phone ordering for ${state.name} Chinese restaurants</p></div><div class="flex gap-8 text-gray-400"><a href="/" class="hover:text-white transition">Home</a><a href="/service-areas/" class="hover:text-white transition">Service Areas</a><a href="/restaurant-pos-phone-order-integration/" class="hover:text-white transition">POS Integration</a></div></div></footer>
    <script>document.querySelectorAll('a[href^="#"]').forEach(a=>a.addEventListener('click',e=>{e.preventDefault();const t=document.querySelector(a.getAttribute('href'));if(t)t.scrollIntoView({behavior:'smooth',block:'start'});}));if(window.location.hash==='#thank-you'){document.getElementById('contact-form').innerHTML='<div class="text-center py-8"><h3 class="text-2xl font-bold text-gray-900 mb-2">Thank You!</h3><p class="text-gray-600">We received your ${state.name} service-area request and will follow up within 24 hours.</p></div>';}</script>
    <script src="/assets/js/form-attribution.js"></script>
</body>
</html>
`;
}

function zhPage(state) {
  const url = `${SITE_ORIGIN}/zh/service-areas/${state.slug}/`;
  const enUrl = `${SITE_ORIGIN}/service-areas/${state.slug}/`;
  const title = `${state.zhName}中餐馆 AI 电话接单`;
  const description = `Serviio 为${state.zhName}中餐馆提供 AI 电话接单、中英文接听和 POS 对接评估，适合已有 POS 且电话订单较多的餐厅。`;
  const cityTags = state.zhCityList.map((city) => `<span class="bg-white border border-gray-200 rounded-full px-4 py-2 text-sm font-medium text-gray-700">${city}</span>`).join('');

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="theme-color" content="#4f46e5">
    <title>${title} | Serviio</title>
    <meta name="description" content="${description}">
    <meta name="keywords" content="${state.zhName}中餐馆 AI 电话接单, ${state.zhName}餐厅 AI 接电话, ${state.zhName}中餐外卖 POS 对接, ${state.abbr} 中餐馆电话接单">
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
    <script type="application/ld+json">{"@context":"https://schema.org","@type":"Service","name":${escapeJson(`${state.zhName}中餐馆 AI 电话接单`)},"serviceType":"中餐馆 AI 电话接单","description":${escapeJson(description)},"provider":{"@type":"Organization","name":"Serviio","url":"${SITE_ORIGIN}"},"areaServed":{"@type":"State","name":${escapeJson(state.name)}},"audience":{"@type":"Audience","audienceType":"使用餐厅 POS 系统的美国中餐馆老板"}}</script>
    <script type="application/ld+json">{"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":"首页","item":"${SITE_ORIGIN}/zh/"},{"@type":"ListItem","position":2,"name":"服务地区","item":"${SITE_ORIGIN}/zh/service-areas/"},{"@type":"ListItem","position":3,"name":${escapeJson(state.zhName)},"item":"${url}"}]}</script>
    <script type="application/ld+json">{"@context":"https://schema.org","@type":"FAQPage","inLanguage":"zh-CN","mainEntity":[{"@type":"Question","name":${escapeJson(`Serviio 是否服务${state.zhName}中餐馆？`)},"acceptedAnswer":{"@type":"Answer","text":${escapeJson(`可以。Serviio 可以评估${state.zhName}中餐馆，尤其适合已有 POS 系统且电话订单稳定的餐厅。`)}}},{"@type":"Question","name":"可以评估哪些 POS 系统？","acceptedAnswer":{"@type":"Answer","text":"表单支持 39 Miles、Square、Toast、Clover、MenuSifu、Chowbus、Mealkeyway、其他 POS，以及暂时没有 POS 的餐厅。"}},{"@type":"Question","name":"是否可以远程配置？","acceptedAnswer":{"@type":"Answer","text":"大部分评估可以远程完成，包括菜单、电话转接、接单规则和 POS 流程适配。"}}]}</script>
    <link rel="stylesheet" href="/assets/css/styles.css">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <style>body { font-family: 'Noto Sans SC', 'Inter', system-ui, sans-serif; }</style>
</head>
<body class="bg-white text-gray-900 antialiased">
    <nav class="fixed w-full z-50 glass border-b border-gray-100"><div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"><div class="flex justify-between items-center h-16"><a href="/zh/"><img src="/assets/logo.svg" alt="Serviio" class="h-8"></a><div class="hidden md:flex items-center space-x-8"><a href="/zh/service-areas/" class="text-gray-600 hover:text-gray-900 transition">服务地区</a><a href="/zh/chinese-restaurant-ai-phone-ordering/" class="text-gray-600 hover:text-gray-900 transition">中餐馆方案</a><a href="/zh/restaurant-pos-phone-order-integration/" class="text-gray-600 hover:text-gray-900 transition">POS 对接</a><a href="#contact" class="gradient-bg text-white px-5 py-2 rounded-full font-medium hover:opacity-90 transition">检查适配</a><a href="/service-areas/${state.slug}/" hreflang="en" class="text-gray-600 hover:text-gray-900 transition">EN</a></div></div></div></nav>
    <main>
        <section class="pt-32 pb-20 px-4 sm:px-6 lg:px-8"><div class="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center"><div><div class="inline-flex items-center px-4 py-2 bg-primary-50 rounded-full text-primary-600 text-sm font-medium mb-8"><span class="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>${state.zhName}服务地区</div><h1 class="text-5xl sm:text-6xl font-bold tracking-tight mb-6">${state.zhName}中餐馆 AI 电话接单</h1><p class="text-xl text-gray-600 mb-8">Serviio 帮助${state.zhName}中餐馆用 AI 接听电话订单，处理中英文来电，并评估外卖和自取订单的 POS 对接流程。</p><div class="flex flex-col sm:flex-row gap-4"><a href="#contact" class="gradient-bg text-white px-8 py-4 rounded-full font-semibold text-lg hover:opacity-90 transition shadow-lg shadow-primary-500/25 text-center">检查${state.abbr}适配</a><a href="/zh/restaurant-pos-system-phone-orders/" class="bg-gray-100 text-gray-900 px-8 py-4 rounded-full font-semibold text-lg hover:bg-gray-200 transition text-center">POS 电话订单</a></div></div><div class="bg-white rounded-2xl shadow-xl border border-gray-100 p-8"><h2 class="text-2xl font-semibold mb-4">适合的${state.zhName}餐厅</h2><ul class="space-y-4 text-gray-700"><li class="flex gap-3"><span class="text-green-500 font-bold">✓</span><span>${state.zhName}中餐馆、中餐外卖店或亚洲餐厅</span></li><li class="flex gap-3"><span class="text-green-500 font-bold">✓</span><span>正在使用 39 Miles、Square、Toast、Clover、MenuSifu、Chowbus、Mealkeyway 或其他 POS</span></li><li class="flex gap-3"><span class="text-green-500 font-bold">✓</span><span>午餐、晚餐、周末或节假日电话订单较多</span></li></ul></div></div></section>
        <section class="py-24 px-4 sm:px-6 lg:px-8 bg-gray-50"><div class="max-w-7xl mx-auto"><div class="text-center mb-12"><h2 class="text-4xl font-bold mb-4">${state.zhName}重点中餐馆市场</h2><p class="text-xl text-gray-600 max-w-3xl mx-auto">这个页面覆盖${state.zhName}中餐馆老板搜索的 AI 电话接听、AI 电话接单、餐厅 POS 电话订单和中英文外卖电话处理需求。</p></div><div class="flex flex-wrap justify-center gap-3 mb-12">${cityTags}</div><div class="grid md:grid-cols-3 gap-8"><div class="bg-white p-8 rounded-2xl border border-gray-100"><h3 class="text-xl font-semibold mb-3">中英文电话接听</h3><p class="text-gray-600">处理英文和中文来电，确认订单、取餐时间、菜单问题和短信确认。</p></div><div class="bg-white p-8 rounded-2xl border border-gray-100"><h3 class="text-xl font-semibold mb-3">POS 适配评估</h3><p class="text-gray-600">优先评估已有 POS 的餐厅；暂时没有 POS 的餐厅也可以进入 POS 推荐线索流程。</p></div><div class="bg-white p-8 rounded-2xl border border-gray-100"><h3 class="text-xl font-semibold mb-3">高峰期多线接听</h3><p class="text-gray-600">当员工在做菜、打包或服务客人时，AI 多线接听可以减少漏接电话。</p></div></div></div></section>
        <section class="py-20 px-4 sm:px-6 lg:px-8"><div class="max-w-5xl mx-auto text-center"><h2 class="text-3xl font-bold mb-4">${state.zhName}相关搜索需求</h2><p class="text-lg text-gray-600 mb-8">本页覆盖${state.zhName}餐厅 AI 接电话、${state.zhName}中餐外卖 AI 接单、${state.zhName}餐厅 POS 电话订单对接等本地搜索组合。</p><div class="flex flex-wrap justify-center gap-4 text-sm font-medium">${relatedLinks(RELATED_POS_LINKS_ZH)}</div></div></section>
        <section id="contact" class="py-24 px-4 sm:px-6 lg:px-8 bg-gray-900"><div class="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center"><div><h2 class="text-4xl font-bold text-white mb-4">检查您的${state.zhName}餐厅</h2><p class="text-xl text-gray-400 mb-8">提交城市、POS 系统和电话订单量，我们会确认 Serviio 是否适合您的${state.zhName}餐厅。</p></div><div class="bg-white rounded-2xl p-8"><form id="contact-form" action="https://formspree.io/f/xeeezpzn" method="POST" class="space-y-6"><input type="hidden" name="_subject" value="${state.name} Service Area Lead - Serviio (中文)"><input type="hidden" name="_next" value="${url}#thank-you"><input type="hidden" name="lead_source" value="zh_service_area_${state.abbr.toLowerCase()}"><input type="hidden" name="ideal_customer_profile" value="Chinese restaurant owner with existing POS or POS interest"><input type="hidden" name="_language" value="zh"><div><label for="restaurant" class="block text-sm font-medium text-gray-700 mb-2">餐厅名称</label><input type="text" id="restaurant" name="restaurant" required class="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition" placeholder="金龙餐厅"></div><div><label for="name" class="block text-sm font-medium text-gray-700 mb-2">您的姓名</label><input type="text" id="name" name="name" required class="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition" placeholder="张先生"></div><div><label for="phone" class="block text-sm font-medium text-gray-700 mb-2">联系电话</label><input type="tel" id="phone" name="phone" required class="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition" placeholder="(555) 123-4567"></div><div><label for="city" class="block text-sm font-medium text-gray-700 mb-2">城市</label><input type="text" id="city" name="restaurant_city" required class="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition" placeholder="${state.zhCityList[0]}"></div><div><label for="state" class="block text-sm font-medium text-gray-700 mb-2">州</label><input type="text" id="state" name="restaurant_state" required value="${state.abbr}" class="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition"></div><div><label for="pos_system" class="block text-sm font-medium text-gray-700 mb-2">当前使用的 POS 系统</label><select id="pos_system" name="pos_system" required class="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition"><option value="">请选择 POS</option><option>39 Miles</option><option>Square</option><option>Toast</option><option>Clover</option><option>MenuSifu</option><option>Chowbus</option><option>Mealkeyway</option><option>其他 POS</option><option>暂时没有 POS</option></select></div><div><label for="phone_orders" class="block text-sm font-medium text-gray-700 mb-2">每周大约电话订单量</label><select id="phone_orders" name="phone_orders_per_week" class="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition" required><option value="">请选择范围</option><option>少于 25 单</option><option>25-75 单</option><option>76-150 单</option><option>150 单以上</option></select></div><div><label for="pos_recommendation_interest" class="block text-sm font-medium text-gray-700 mb-2">如果还没有 POS，是否希望了解 POS 推荐？</label><select id="pos_recommendation_interest" name="pos_recommendation_interest" class="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition" required><option value="">请选择</option><option>希望了解 POS 推荐</option><option>只需要 AI 电话接单</option><option>不适用，我已经有 POS</option></select></div><button type="submit" class="w-full gradient-bg text-white py-4 rounded-lg font-semibold text-lg hover:opacity-90 transition">检查${state.abbr}适配</button></form></div></div></section>
    </main>
    <footer class="bg-gray-900 border-t border-gray-800 py-12 px-4 sm:px-6 lg:px-8"><div class="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center"><div class="mb-6 md:mb-0"><img src="/assets/logo.svg" alt="Serviio" class="h-8 brightness-0 invert"><p class="text-gray-500 mt-2">${state.zhName}中餐馆 AI 电话接单</p></div><div class="flex gap-8 text-gray-400"><a href="/zh/" class="hover:text-white transition">首页</a><a href="/zh/service-areas/" class="hover:text-white transition">服务地区</a><a href="/zh/restaurant-pos-phone-order-integration/" class="hover:text-white transition">POS 对接</a></div></div></footer>
    <script>document.querySelectorAll('a[href^="#"]').forEach(a=>a.addEventListener('click',e=>{e.preventDefault();const t=document.querySelector(a.getAttribute('href'));if(t)t.scrollIntoView({behavior:'smooth',block:'start'});}));if(window.location.hash==='#thank-you'){document.getElementById('contact-form').innerHTML='<div class="text-center py-8"><h3 class="text-2xl font-bold text-gray-900 mb-2">感谢您的咨询！</h3><p class="text-gray-600">我们已收到您的${state.zhName}地区评估需求，将在 24 小时内联系您。</p></div>';}</script>
    <script src="/assets/js/form-attribution.js"></script>
</body>
</html>
`;
}

function sitemapEntry(state, lang) {
  const enUrl = `${SITE_ORIGIN}/service-areas/${state.slug}/`;
  const zhUrl = `${SITE_ORIGIN}/zh/service-areas/${state.slug}/`;
  const loc = lang === 'en' ? enUrl : zhUrl;
  return `  <url>
    <loc>${loc}</loc>
    <xhtml:link rel="alternate" hreflang="en" href="${enUrl}"/>
    <xhtml:link rel="alternate" hreflang="zh" href="${zhUrl}"/>
    <xhtml:link rel="alternate" hreflang="x-default" href="${enUrl}"/>
    <lastmod>${LASTMOD}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.82</priority>
  </url>`;
}

function insertBeforeEnd(file, block) {
  const current = fs.readFileSync(file, 'utf8');
  const next = current.replace('\n</urlset>', `\n${block}\n</urlset>`);
  fs.writeFileSync(file, next);
}

function updateSitemap() {
  let xml = fs.readFileSync('sitemap.xml', 'utf8');
  const entries = states
    .flatMap((state) => [sitemapEntry(state, 'en'), sitemapEntry(state, 'zh')])
    .filter((entry) => !xml.includes(entry.match(/<loc>([^<]+)/)[1]))
    .join('\n');
  if (entries) {
    xml = xml.replace('\n</urlset>', `\n${entries}\n</urlset>`);
    fs.writeFileSync('sitemap.xml', xml);
  }
}

function updateIndexingScript() {
  const file = 'scripts/print-indexing-urls.js';
  let js = fs.readFileSync(file, 'utf8');
  const marker = "  '/service-areas/',\n";
  const additions = states
    .flatMap((state) => [`  '/service-areas/${state.slug}/',`, `  '/zh/service-areas/${state.slug}/',`])
    .filter((line) => !js.includes(line))
    .join('\n');
  if (!additions) return;
  if (js.includes(marker)) {
    js = js.replace(marker, `${marker}${additions}\n`);
  } else {
    js = js.replace("  '/zh/pos/mealkeyway-ai-phone-ordering/',", `  '/zh/pos/mealkeyway-ai-phone-ordering/',\n  '/service-areas/',\n${additions}`);
  }
  fs.writeFileSync(file, js);
}

function updateServiceAreaIndex() {
  let html = fs.readFileSync('service-areas/index.html', 'utf8');
  const links = states.map((state) => `<a href="/service-areas/${state.slug}/" class="text-primary-600 hover:text-primary-700">${state.name} Chinese restaurant AI phone ordering</a>`);
  if (!html.includes('/service-areas/california-chinese-restaurant-ai-phone-ordering/')) {
    html = html.replace('</div>\n            </div>\n        </section>\n\n        <section class="py-20 px-4 sm:px-6 lg:px-8">', `</div>
                <div class="mt-10 flex flex-wrap justify-center gap-4 text-sm font-medium">${links.join('')}</div>
            </div>
        </section>

        <section class="py-20 px-4 sm:px-6 lg:px-8">`);
  } else {
    const missing = links.filter((link) => !html.includes(link.match(/href="([^"]+)/)[1])).join('');
    if (missing) {
      html = html.replace('<a class="text-primary-600 hover:text-primary-700" href="/service-areas/san-francisco-chinese-restaurant-ai-phone-ordering/">', `${missing}<a class="text-primary-600 hover:text-primary-700" href="/service-areas/san-francisco-chinese-restaurant-ai-phone-ordering/">`);
    }
  }
  if (html !== fs.readFileSync('service-areas/index.html', 'utf8')) {
    fs.writeFileSync('service-areas/index.html', html);
  }

  let zh = fs.readFileSync('zh/service-areas/index.html', 'utf8');
  const zhLinks = states.map((state) => `<a href="/zh/service-areas/${state.slug}/" class="text-primary-600 hover:text-primary-700">${state.zhName}中餐馆 AI 电话接单</a>`);
  if (!zh.includes('/zh/service-areas/california-chinese-restaurant-ai-phone-ordering/')) {
    zh = zh.replace('</div>\n            </div>\n        </section>\n\n        <section id="contact"', `</div>
                <div class="mt-10 flex flex-wrap justify-center gap-4 text-sm font-medium">${zhLinks.join('')}</div>
            </div>
        </section>

        <section id="contact"`);
  } else {
    const missing = zhLinks.filter((link) => !zh.includes(link.match(/href="([^"]+)/)[1])).join('');
    if (missing) {
      zh = zh.replace('<a class="text-primary-600 hover:text-primary-700" href="/zh/service-areas/san-francisco-chinese-restaurant-ai-phone-ordering/">', `${missing}<a class="text-primary-600 hover:text-primary-700" href="/zh/service-areas/san-francisco-chinese-restaurant-ai-phone-ordering/">`);
    }
  }
  if (zh !== fs.readFileSync('zh/service-areas/index.html', 'utf8')) {
    fs.writeFileSync('zh/service-areas/index.html', zh);
  }
}

for (const state of states) {
  writeFile(`service-areas/${state.slug}/index.html`, enPage(state));
  writeFile(`zh/service-areas/${state.slug}/index.html`, zhPage(state));
}

updateSitemap();
updateIndexingScript();
updateServiceAreaIndex();

console.log(`Generated ${states.length * 2} state service-area pages.`);
