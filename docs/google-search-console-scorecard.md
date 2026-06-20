# Serviio Google Search Console Scorecard

## Purpose

Measure whether Serviio is moving toward first-page Google rankings and qualified leads from Chinese restaurant owners in the United States who use POS systems such as 39 Miles, Square, Toast, Clover, MenuSifu, Chowbus, and Mealkeyway.

Google does not provide one official organic SEO score. Use this scorecard instead.

## Weekly Metrics

Track every Monday after deployment.

Analyze a Search Console CSV export with:

```bash
npm run search:analyze -- path/to/search-console-export.csv --out search-console-analysis.md
```

Regenerate the first-page ranking watchlist before the weekly review:

```bash
npm run search:watchlist
```

This writes `docs/first-page-ranking-watchlist.csv` from the priority queries below. Fill in current Search Console position, clicks, impressions, CTR, and last checked date each week. The watchlist maps every target query to the intended landing page and authority target, so "first page" remains measurable instead of becoming a vague SEO task.

After exporting fresh query/page data from Search Console, update the watchlist with:

```bash
npm run search:watchlist:update -- path/to/search-console-export.csv --checked YYYY-MM-DD
```

Preview the update workflow with sample data:

```bash
npm run search:watchlist:sample
```

This writes `docs/sample-first-page-ranking-watchlist-updated.csv` and marks rows as `page_one`, `near_page_one`, `needs_authority_or_relevance`, `ranking_on_other_page`, or `no_search_console_data`.

Convert the updated watchlist into a weekly action queue:

```bash
npm run search:ranking-actions -- --watchlist docs/first-page-ranking-watchlist.csv --out ranking-action-queue.md
```

Preview the action queue with sample data:

```bash
npm run search:ranking-actions:sample
```

This writes `docs/sample-ranking-action-queue.md` and prioritizes `push_to_page_one`, `ctr_rewrite`, `authority_and_relevance`, `align_target_page`, and `indexing_or_data_check` work. Use this queue before creating new SEO pages so the highest-leverage existing ranking opportunities get worked first.

Preview the analyzer without live Search Console data:

```bash
npm run search:sample
```

This regenerates `docs/sample-search-console-analysis.md` from `docs/sample-search-console-export.csv`. The fixture includes named POS, Chinese restaurant, phone-answering, local service-area, and restaurant-tech rows so the buyer-intent, POS-specific, internal-link, and title/meta queues can be reviewed before a live export is available.

Use the report to find page-one wins, position 8-20 opportunities, weak-position internal-link targets, the aggregated internal-link action queue, low-CTR title/meta rewrite candidates, and the `Title/Meta Rewrite Briefs` table.

Start with `Buyer-Intent Action Queue` before generic SEO cleanups. It scores query/page rows for Chinese restaurant, POS, named-POS, phone-order, and commercial intent so the weekly work stays focused on pages most likely to produce qualified restaurant-owner leads.

Use `POS-Specific Query Opportunities` to improve pages and outreach anchors for 39 Miles, Square, Toast, Clover, MenuSifu, Chowbus, and Mealkeyway searches. These rows may have lower volume, but they are closer to the POS-ready buyer profile.

Use `Title/Meta Rewrite Briefs` as the direct page-edit queue for high-intent rows that are either near page one or already on page one with weak CTR. Apply these suggestions before broad copy rewrites because they are tied to real Search Console query/page evidence.

Audit whether priority queries are represented in crawlable page text with:

```bash
npm run seo:coverage
```

Use missing exact phrases as internal-link, FAQ, title/meta, or body-copy candidates before creating another landing page.

Audit whether off-site authority is strong enough to support first-page movement with:

```bash
npm run seo:authority
```

Use the authority audit to track submitted listings, live backlinks/profiles, high-fit partner/POS outreach, business profiles, and customer proof. This is the main score to watch after on-page validation passes, because first-page Google movement usually needs external trust signals in addition to crawlable keyword coverage.

| Metric | Source | Target |
| --- | --- | --- |
| Indexed sitemap URLs | Search Console Pages report | 90%+ of submitted URLs indexed |
| Total organic clicks | Search Console Performance | Up week over week after indexing |
| Total organic impressions | Search Console Performance | Up week over week after indexing |
| Average CTR | Search Console Performance | Improve for high-intent pages |
| Average position | Search Console Performance | Move priority queries toward top 10 |
| Page-one target queries | Search Console query export | Increase count of queries with position 1-10 |
| Qualified form leads | Formspree plus attribution fields | Increase leads from priority pages |
| High-priority lead rate | Lead scoring rubric | More POS-ready Chinese restaurant owners |
| Live authority links/profiles | Free search tracker plus authority audit | 5+ first, then 15+ |
| High-fit partner/POS outreach started | Free search tracker plus authority audit | 8+ active opportunities |
| Customer proof assets | Free search tracker plus authority audit | 1+ pilot proof, then repeat monthly |

## Weekly Action Queue

After running the Search Console analyzer, use `Internal-Link Action Queue` first. For each target page:
- Add one exact or close-variant anchor from a suggested source hub.
- Prefer homepage, sitemap, guide, POS, and core category links before creating a new page.
- Re-run `npm run validate:seo` after link edits.
- Recheck the same query/page rows the following week to see whether average position moves toward page one.

When time is limited, use this order:
1. Buyer-intent rows with score 80+ and position 8-20.
2. POS-specific rows for named POS systems, even at lower volume.
3. Title/meta rewrite briefs for page-one low-CTR and near-page-one rows.
4. Internal-link action queue for pages with impressions but weak position.
5. CTR rewrite candidates that are already in positions 1-20.

## Priority Queries

Track these as exact query groups in Search Console exports:

- chinese restaurant ai phone ordering
- ai phone answering for chinese restaurants
- chinese restaurant phone answering service
- phone answering service for chinese restaurants
- ai phone answering service for restaurants
- restaurant ai phone answering service
- restaurant ai phone order taker
- restaurant phone order taker ai
- ai order taker for restaurant phone calls
- restaurant voice ordering system
- restaurant phone ordering system
- phone ordering system for restaurants
- restaurant pos phone order integration
- pos integrated ai phone agent
- restaurant phone order ai pos
- restaurant ai pos integration
- restaurant pos system phone orders
- restaurant POS phone order automation
- AI phone ordering for existing POS
- phone orders connected to restaurant POS
- restaurant POS integration service
- restaurant POS integration checklist
- Chinese restaurant POS integration checklist
- AI phone ordering POS readiness checklist
- how to connect phone orders to POS
- restaurant phone order automation
- restaurant ai assistant
- ai assistant for restaurants
- restaurant AI assistant for phone orders
- restaurant customer service ai
- ai customer service for restaurants
- restaurant ai customer support
- ai voice assistant for restaurants
- voice assistant restaurant ordering
- voice AI for restaurant phone calls
- restaurant ai receptionist
- ai receptionist for restaurants
- restaurant virtual receptionist
- ai receptionist for chinese restaurants
- chinese restaurant ai receptionist
- chinese restaurant virtual receptionist
- restaurant tech ai phone ordering
- restaurant technology AI phone ordering
- restaurant technology AI ordering
- restaurant tech phone order automation
- restaurant tech voice AI
- restaurant operations automation
- restaurant customer service automation
- takeout order automation software
- restaurant automation software phone orders
- automate restaurant phone orders
- automated phone ordering for restaurants
- best pos for chinese restaurant
- chinese restaurant pos system
- pos system for chinese takeout restaurant
- POS system for takeout restaurant
- restaurant POS for phone orders
- best POS for takeout orders
- restaurant POS order management
- Chinese takeout order POS
- best POS for Chinese takeout orders
- ai phone ordering for chinese takeout
- bilingual restaurant phone ordering
- mandarin ai phone answering for restaurants
- mandarin restaurant phone ordering
- mandarin and cantonese ai phone ordering
- cantonese ai phone ordering for chinese takeout
- cantonese restaurant phone order ai
- restaurant phone answering AI
- AI restaurant call answering
- restaurant call automation
- restaurant phone call AI
- restaurant missed call recovery
- restaurant missed call revenue calculator
- restaurant phone order revenue loss calculator
- 39 miles ai phone ordering
- 39 Miles AI phone answering
- 39 Miles AI order taker
- 39 Miles phone order integration
- 39 Miles POS AI phone agent
- Chinese restaurant 39 Miles phone orders
- menusifu ai phone ordering
- MenuSifu AI phone answering
- MenuSifu AI order taker
- MenuSifu phone order integration
- MenuSifu POS AI phone agent
- Chinese restaurant MenuSifu phone orders
- chowbus ai phone ordering
- Chowbus AI phone answering
- Chowbus AI order taker
- Chowbus phone order integration
- Chowbus POS AI phone agent
- Chinese restaurant Chowbus phone orders
- mealkeyway ai phone ordering
- Mealkeyway AI phone answering
- Mealkeyway AI order taker
- Mealkeyway phone order integration
- Mealkeyway POS AI phone agent
- Chinese restaurant Mealkeyway phone orders
- square ai phone ordering for restaurants
- Square AI phone answering
- Square AI order taker
- Square restaurant phone order integration
- Square POS phone order AI
- AI phone agent Square POS
- Chinese restaurant Square phone orders
- toast ai phone ordering for restaurants
- Toast AI phone answering
- Toast AI order taker
- Toast restaurant phone order integration
- Toast POS phone order AI
- AI phone agent Toast POS
- Chinese restaurant Toast phone orders
- clover ai phone ordering for restaurants
- Clover AI phone answering
- Clover AI order taker
- Clover restaurant phone order integration
- Clover POS phone order AI
- AI phone agent Clover POS
- Chinese restaurant Clover phone orders
- restaurant without POS
- massachusetts chinese restaurant ai phone ordering
- boston chinese restaurant ai phone ordering
- restaurant ai assistant boston
- pennsylvania chinese restaurant ai phone ordering
- philadelphia chinese restaurant ai phone ordering
- restaurant pos phone order integration philadelphia

## Priority Landing Pages

Review clicks, impressions, CTR, and average position for:

- `/chinese-restaurant-ai-phone-ordering/`
- `/zh/chinese-restaurant-ai-phone-ordering/`
- `/guides/restaurant-ai-phone-ordering-pos-guide/`
- `/zh/guides/restaurant-ai-phone-ordering-pos-guide/`
- `/guides/chinese-restaurant-pos-comparison/`
- `/zh/guides/chinese-restaurant-pos-comparison/`
- `/ai-order-taking-for-restaurants/`
- `/zh/ai-order-taking-for-restaurants/`
- `/ai-restaurant-phone-agent/`
- `/zh/ai-restaurant-phone-agent/`
- `/ai-phone-agent-for-takeout-restaurants/`
- `/zh/ai-phone-agent-for-takeout-restaurants/`
- `/ai-phone-answering-for-chinese-restaurants/`
- `/zh/ai-phone-answering-for-chinese-restaurants/`
- `/chinese-restaurant-phone-answering-service/`
- `/zh/chinese-restaurant-phone-answering-service/`
- `/chinese-restaurant-ai-receptionist/`
- `/zh/chinese-restaurant-ai-receptionist/`
- `/chinese-restaurant-phone-order-automation/`
- `/zh/chinese-restaurant-phone-order-automation/`
- `/chinese-restaurant-ai-order-taker/`
- `/zh/chinese-restaurant-ai-order-taker/`
- `/chinese-restaurant-pos-ai-phone-agent/`
- `/zh/chinese-restaurant-pos-ai-phone-agent/`
- `/chinese-restaurant-customer-service-ai/`
- `/zh/chinese-restaurant-customer-service-ai/`
- `/ai-phone-ordering-for-chinese-takeout/`
- `/zh/ai-phone-ordering-for-chinese-takeout/`
- `/mandarin-cantonese-ai-phone-ordering/`
- `/zh/mandarin-cantonese-ai-phone-ordering/`
- `/chinese-restaurant-voice-ai/`
- `/zh/chinese-restaurant-voice-ai/`
- `/restaurant-ai-phone-order-taker/`
- `/zh/restaurant-ai-phone-order-taker/`
- `/restaurant-pos-phone-order-integration/`
- `/zh/restaurant-pos-phone-order-integration/`
- `/restaurant-pos-integration-checklist/`
- `/zh/restaurant-pos-integration-checklist/`
- `/chinese-restaurant-pos-integration/`
- `/zh/chinese-restaurant-pos-integration/`
- `/pos-integrated-ai-phone-agent/`
- `/zh/pos-integrated-ai-phone-agent/`
- `/restaurant-phone-order-ai-pos/`
- `/zh/restaurant-phone-order-ai-pos/`
- `/restaurant-ai-assistant/`
- `/zh/restaurant-ai-assistant/`
- `/restaurant-customer-service-ai/`
- `/zh/restaurant-customer-service-ai/`
- `/restaurant-phone-answering-service/`
- `/zh/restaurant-phone-answering-service/`
- `/restaurant-call-answering-ai/`
- `/zh/restaurant-call-answering-ai/`
- `/restaurant-missed-call-recovery/`
- `/zh/restaurant-missed-call-recovery/`
- `/takeout-order-phone-answering-service/`
- `/zh/takeout-order-phone-answering-service/`
- `/restaurant-answering-service-for-takeout/`
- `/zh/restaurant-answering-service-for-takeout/`
- `/phone-order-ai-for-small-restaurants/`
- `/zh/phone-order-ai-for-small-restaurants/`
- `/bilingual-restaurant-phone-ordering/`
- `/zh/bilingual-restaurant-phone-ordering/`
- `/restaurant-voice-ordering-system/`
- `/zh/restaurant-voice-ordering-system/`
- `/restaurant-pos-system-phone-orders/`
- `/zh/restaurant-pos-system-phone-orders/`
- `/ai-voice-assistant-for-restaurants/`
- `/zh/ai-voice-assistant-for-restaurants/`
- `/restaurant-phone-order-automation/`
- `/zh/restaurant-phone-order-automation/`
- `/restaurant-tech-ai-phone-ordering/`
- `/zh/restaurant-tech-ai-phone-ordering/`
- `/best-pos-for-chinese-restaurant-phone-orders/`
- `/zh/best-pos-for-chinese-restaurant-phone-orders/`
- `/chinese-restaurant-pos-system/`
- `/zh/chinese-restaurant-pos-system/`
- `/takeout-pos-system/`
- `/zh/takeout-pos-system/`
- `/chinese-takeout-pos-system/`
- `/zh/chinese-takeout-pos-system/`
- `/chinese-restaurant-phone-order-pos-workflow/`
- `/zh/chinese-restaurant-phone-order-pos-workflow/`
- `/guides/connect-phone-orders-to-pos/`
- `/zh/guides/connect-phone-orders-to-pos/`
- `/restaurant-automation-software-phone-orders/`
- `/zh/restaurant-automation-software-phone-orders/`
- `/service-areas/california-chinese-restaurant-ai-phone-ordering/`
- `/zh/service-areas/california-chinese-restaurant-ai-phone-ordering/`
- `/service-areas/new-york-chinese-restaurant-ai-phone-ordering/`
- `/zh/service-areas/new-york-chinese-restaurant-ai-phone-ordering/`
- `/service-areas/new-jersey-chinese-restaurant-ai-phone-ordering/`
- `/zh/service-areas/new-jersey-chinese-restaurant-ai-phone-ordering/`
- `/service-areas/texas-chinese-restaurant-ai-phone-ordering/`
- `/zh/service-areas/texas-chinese-restaurant-ai-phone-ordering/`
- `/service-areas/massachusetts-chinese-restaurant-ai-phone-ordering/`
- `/zh/service-areas/massachusetts-chinese-restaurant-ai-phone-ordering/`
- `/service-areas/san-francisco-chinese-restaurant-ai-phone-ordering/`
- `/zh/service-areas/san-francisco-chinese-restaurant-ai-phone-ordering/`
- `/service-areas/los-angeles-chinese-restaurant-ai-phone-ordering/`
- `/zh/service-areas/los-angeles-chinese-restaurant-ai-phone-ordering/`
- `/service-areas/new-york-city-chinese-restaurant-ai-phone-ordering/`
- `/zh/service-areas/new-york-city-chinese-restaurant-ai-phone-ordering/`
- `/service-areas/houston-chinese-restaurant-ai-phone-ordering/`
- `/zh/service-areas/houston-chinese-restaurant-ai-phone-ordering/`
- `/service-areas/seattle-chinese-restaurant-ai-phone-ordering/`
- `/zh/service-areas/seattle-chinese-restaurant-ai-phone-ordering/`
- `/service-areas/chicago-chinese-restaurant-ai-phone-ordering/`
- `/zh/service-areas/chicago-chinese-restaurant-ai-phone-ordering/`
- `/service-areas/boston-chinese-restaurant-ai-phone-ordering/`
- `/zh/service-areas/boston-chinese-restaurant-ai-phone-ordering/`
- `/service-areas/pennsylvania-chinese-restaurant-ai-phone-ordering/`
- `/zh/service-areas/pennsylvania-chinese-restaurant-ai-phone-ordering/`
- `/service-areas/philadelphia-chinese-restaurant-ai-phone-ordering/`
- `/zh/service-areas/philadelphia-chinese-restaurant-ai-phone-ordering/`
- `/pos/39-miles-ai-phone-ordering/`
- `/zh/pos/39-miles-ai-phone-ordering/`
- `/pos/square-ai-phone-ordering/`
- `/zh/pos/square-ai-phone-ordering/`
- `/pos/toast-ai-phone-ordering/`
- `/zh/pos/toast-ai-phone-ordering/`
- `/pos/clover-ai-phone-ordering/`
- `/zh/pos/clover-ai-phone-ordering/`
- `/pos/menusifu-ai-phone-ordering/`
- `/zh/pos/menusifu-ai-phone-ordering/`
- `/pos/chowbus-ai-phone-ordering/`
- `/zh/pos/chowbus-ai-phone-ordering/`
- `/pos/mealkeyway-ai-phone-ordering/`
- `/zh/pos/mealkeyway-ai-phone-ordering/`

## Decision Rules

If impressions are growing but average position is worse than 20:
- add internal links from related pages
- improve page titles and H1s around the exact query
- build backlinks to the page from relevant directories and partner posts

If average position is 8-20 but CTR is low:
- rewrite title tags and meta descriptions for clearer restaurant-owner intent
- mention POS names and Chinese restaurant use case earlier
- compare the SERP manually and adjust the offer

If a page is discovered but not indexed:
- inspect the URL in Search Console
- confirm canonical matches the production URL
- request indexing for priority pages
- add internal links from `/` and related pages

If leads are low despite impressions:
- tighten CTA copy
- reduce ambiguity in the form
- compare `lead_source`, `landing_page`, `first_utm_*`, `current_page`, and `utm_*` fields
- prioritize pages that attract POS-ready restaurants

## Minimum Evidence For Progress

Do not claim ranking progress from local validation alone.

Evidence that counts:
- Search Console shows indexed pages
- Search Console shows impressions for target queries
- average position improves for target queries
- target pages enter position 1-10
- Formspree receives qualified leads with POS and phone-order-volume fields

Evidence that does not prove ranking:
- local sitemap validation
- Lighthouse SEO score
- page count alone
- title/meta changes before indexing
