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

Use the report to find page-one wins, position 8-20 opportunities, weak-position internal-link targets, and low-CTR title/meta rewrite candidates.

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
- restaurant phone order automation
- restaurant ai assistant
- ai assistant for restaurants
- restaurant customer service ai
- ai customer service for restaurants
- restaurant ai customer support
- ai voice assistant for restaurants
- restaurant ai receptionist
- ai receptionist for restaurants
- restaurant virtual receptionist
- ai receptionist for chinese restaurants
- chinese restaurant ai receptionist
- chinese restaurant virtual receptionist
- restaurant tech ai phone ordering
- restaurant automation software phone orders
- automate restaurant phone orders
- automated phone ordering for restaurants
- best pos for chinese restaurant
- chinese restaurant pos system
- pos system for chinese takeout restaurant
- ai phone ordering for chinese takeout
- bilingual restaurant phone ordering
- mandarin ai phone answering for restaurants
- mandarin restaurant phone ordering
- mandarin and cantonese ai phone ordering
- cantonese ai phone ordering for chinese takeout
- cantonese restaurant phone order ai
- restaurant missed call recovery
- 39 miles ai phone ordering
- menusifu ai phone ordering
- chowbus ai phone ordering
- mealkeyway ai phone ordering
- square ai phone ordering for restaurants
- toast ai phone ordering for restaurants
- clover ai phone ordering for restaurants
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
- `/chinese-restaurant-pos-integration/`
- `/zh/chinese-restaurant-pos-integration/`
- `/pos-integrated-ai-phone-agent/`
- `/zh/pos-integrated-ai-phone-agent/`
- `/restaurant-phone-order-ai-pos/`
- `/zh/restaurant-phone-order-ai-pos/`
- `/restaurant-ai-assistant/`
- `/zh/restaurant-ai-assistant/`
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
