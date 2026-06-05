# Serviio Free Search Marketing Checklist

## Purpose

Use free search and directory channels to create discovery, backlinks, referral traffic, and lead signals for Serviio. This supports the SEO goal for Chinese restaurant owners in the United States who use POS systems such as 39 Miles, Square, Toast, Clover, MenuSifu, Chowbus, and Mealkeyway.

Paid SEM can be tested later, but this checklist focuses on free or no-budget actions first.

## Tracking Rules

Use one row per listing, directory submission, community post, or partner outreach.

Seed tracker:

```bash
npm run marketing:tracker
```

This writes `docs/free-search-marketing-tracker.csv` with priority channels, landing URLs, and UTM URLs.

Print search queries for finding free directory, association, community, and partner targets:

```bash
npm run marketing:prospects
```

Use the output to find real submission pages and outreach targets, then record the live URL or contact URL back into `docs/free-search-marketing-tracker.csv`.

Print the current tracker status and next execution queue:

```bash
npm run marketing:summary
```

Prioritize `High-Impact Submission Queue` first. It scores rows by priority, ready URL, partner/referral value, POS intent, Chinese/Asian restaurant fit, and local landing-page relevance. Use `Ready-To-Submit Rows` when you need quick submissions with known URLs, and use `marketing:prospects` for high-score rows that still need target research.

Print an execution-ready brief for the next manual submission session:

```bash
npm run marketing:next
```

Use `Ready Submissions` first when time is limited. Use `Target Research` for the highest-score partner, POS consultant, and restaurant-technology rows that still need a real target URL.

The tracker includes an `IndexNow priority URL batch` row. Keep that row as `submitted` after successful `npm run indexnow:submit` responses, and update `notes` if a later batch is submitted.

Print ready-to-paste submission packets for rows with a known target URL:

```bash
npm run marketing:packets
```

Export outreach-ready CSV for spreadsheet, CRM, or mail-merge execution:

```bash
npm run marketing:outreach-csv -- --out outreach.csv --limit 25
```

The default export focuses on partner outreach, POS-specific outreach, Chinese/Asian associations, community posts, educational/resource listings, and restaurant technology directories. Use `--all` only when you also want generic directories, business profiles, and webmaster rows.

Use the ready-to-paste listing and outreach copy in:

```text
docs/free-search-submission-copy.md
```

Required fields:

| Field | What To Record |
| --- | --- |
| Channel | Google Business Profile, Bing Places, Apple Business Connect, directory, partner, community, customer proof |
| Target | Name of platform, directory, organization, group, or partner |
| URL | Submission page, live listing, or contact URL |
| Status | Not started, submitted, live, rejected, follow-up needed |
| Owner | Person responsible |
| Date submitted | Date first submitted |
| Date live | Date listing or post went live |
| Landing URL | Serviio page used in the listing or outreach |
| UTM URL | Tagged link used for attribution |
| Notes | Category, requirements, login, follow-up, or lead quality |

Recommended UTM pattern:

```text
https://serviio.ai/chinese-restaurant-ai-phone-ordering/?utm_source=[source]&utm_medium=organic_listing&utm_campaign=free_search_marketing
```

Use `utm_medium=partner_referral` for consultants or partner links, and `utm_medium=community_post` for WeChat/community posts.

## First 7 Free Search Actions

1. Claim or create Google Business Profile.
   - URL: `https://www.google.com/business/`
   - Landing URL: `https://serviio.ai/`
   - Category target: software company, marketing service, or business service depending on eligibility.
   - Add: business name, service area, phone, website, logo, product description, and service descriptions.

2. Add Bing Places for Business.
   - URL: `https://www.bingplaces.com/`
   - Landing URL: `https://serviio.ai/`
   - Mirror the same NAP, website, categories, and service description used in Google.

3. Add Apple Business Connect.
   - URL: `https://businessconnect.apple.com/`
   - Landing URL: `https://serviio.ai/`
   - Add logo, business description, service area, website, phone, and branded action link.

4. Submit sitemap in Google Search Console.
   - Sitemap: `https://serviio.ai/sitemap.xml`
   - Inspect and request indexing for the URL list from:
     ```bash
     npm run indexing:urls
     ```

5. Submit sitemap in Bing Webmaster Tools.
   - Sitemap: `https://serviio.ai/sitemap.xml`
   - Use Bing URL submission for highest-priority POS and Chinese restaurant pages.
   - After deploy, use IndexNow for the top-priority URL batch:
     ```bash
     npm run indexnow:payload
     npm run indexnow:submit
     ```
   - Record the result in the `IndexNow priority URL batch` tracker row.

6. Submit free AI/product listings.
   - Start with AI tool directories, startup directories, and SaaS directories that allow free submission.
   - Best landing URL: `https://serviio.ai/guides/restaurant-ai-phone-ordering-pos-guide/`
   - Anchor text: `restaurant AI phone ordering POS guide`

7. Submit local and restaurant industry listings.
   - Target Chinese business associations, Asian chambers of commerce, restaurant technology directories, and restaurant consultant resource pages.
   - Best landing URL: `https://serviio.ai/chinese-restaurant-ai-phone-ordering/`
   - Anchor text: `AI phone ordering for Chinese restaurants`

## Priority Free Listing Targets

Start with these categories before spending money on ads.

| Priority | Channel | Target Type | Best Landing Page | Anchor Or Listing Phrase |
| --- | --- | --- | --- | --- |
| P0 | Google Business Profile | Free local/business profile | `/` | AI phone ordering for restaurants |
| P0 | Google Search Console | Free indexing and query data | `/sitemap.xml` | Sitemap submission |
| P0 | Bing Places | Free Bing local/business profile | `/` | Restaurant AI phone answering |
| P0 | Bing Webmaster Tools | Free indexing and query data | `/sitemap.xml` | Sitemap submission |
| P0 | Apple Business Connect | Free Apple Maps/Siri profile | `/` | AI phone ordering for restaurants |
| P1 | Educational resource listings | Free guide/resource link | `/guides/restaurant-ai-phone-ordering-pos-guide/` | Restaurant AI phone ordering POS guide |
| P1 | AI directories | Free product listing | `/restaurant-ai-phone-order-taker/` | Restaurant AI phone order taker |
| P1 | Startup directories | Free SaaS listing | `/ai-voice-assistant-for-restaurants/` | AI voice assistant for restaurants |
| P1 | Restaurant technology directories | Vendor/resource listing | `/restaurant-pos-phone-order-integration/` | Restaurant POS phone order integration |
| P1 | Chinese business associations | Member/vendor listing | `/chinese-restaurant-ai-phone-ordering/` | AI phone ordering for Chinese restaurants |
| P1 | Asian chambers of commerce | Business directory | `/service-areas/` | AI phone ordering service areas |
| P1 | State Asian chambers | Local business directory | `/service-areas/california-chinese-restaurant-ai-phone-ordering/` | California Chinese restaurant AI phone ordering |
| P1 | State Asian chambers | Local business directory | `/service-areas/new-york-chinese-restaurant-ai-phone-ordering/` | New York Chinese restaurant AI phone ordering |
| P1 | State Asian chambers | Local business directory | `/service-areas/massachusetts-chinese-restaurant-ai-phone-ordering/` | Massachusetts Chinese restaurant AI phone ordering |
| P1 | State Asian chambers | Local business directory | `/service-areas/pennsylvania-chinese-restaurant-ai-phone-ordering/` | Pennsylvania Chinese restaurant AI phone ordering |
| P1 | POS consultants | Partner/resource link | `/guides/chinese-restaurant-pos-comparison/` | Chinese restaurant POS comparison |
| P2 | WeChat/community posts | Education/referral post | `/zh/chinese-restaurant-ai-phone-ordering/` | 中餐馆 AI 电话接单 |
| P2 | Local restaurant owner groups | Community post | `/service-areas/boston-chinese-restaurant-ai-phone-ordering/` | Boston Chinese restaurant AI phone ordering |
| P2 | Local restaurant owner groups | Community post | `/service-areas/philadelphia-chinese-restaurant-ai-phone-ordering/` | Philadelphia Chinese restaurant AI phone ordering |
| P2 | Customer testimonials | Proof/backlink | relevant state or POS page | city + restaurant type + POS system |

## Copy Blocks

### Short Listing Description

Serviio is an AI phone ordering system for restaurants. It answers calls 24/7, takes orders in natural conversation, supports English and Chinese, and helps POS-ready restaurants connect phone orders to their kitchen workflow.

### Chinese Restaurant Listing Description

Serviio helps Chinese restaurants answer phone orders with AI in English and Chinese. It supports takeout and pickup orders, menu questions, modifiers, SMS confirmation, and POS workflows for systems such as 39 Miles, Square, Toast, Clover, MenuSifu, Chowbus, and Mealkeyway.

### Chinese Copy

Serviio 是面向美国中餐馆的 AI 电话接单系统，可用中文和英文接听电话、确认外卖和自取订单、处理菜单问题和备注，并评估与 39 Miles、Square、Toast、Clover、MenuSifu、Chowbus、Mealkeyway 等 POS 系统的对接流程。

Full submission copy, category suggestions, feature lists, pricing text, and association outreach templates live in `docs/free-search-submission-copy.md`.
For the highest-scoring POS/referral rows, use the POS-specific partner, restaurant website partner, and community permission-request blocks in that file before marking a row as submitted.

## Weekly Routine

Every week, complete and record:

1. 3 free directory/listing submissions.
2. 5 partner or consultant outreach messages.
3. 1 bilingual community post.
4. 1 customer proof request.
5. 1 Search Console review.
6. 1 internal-link update if Search Console shows impressions but weak average position.

## Success Criteria

Good early signs:

- Listings go live with followed or crawlable links.
- Search Console impressions appear for target query clusters.
- Referral sessions show `utm_campaign=free_search_marketing`.
- Formspree leads include `landing_page`, `first_utm_source`, `current_page`, email, phone, POS system, city/state, and phone-order volume.
- Partner or directory traffic produces POS-ready Chinese restaurant leads.

Do not count a listing as successful until it is live and the URL is recorded.
