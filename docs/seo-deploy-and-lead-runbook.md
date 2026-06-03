# Serviio SEO Deploy and Lead Runbook

## Purpose

Turn the expanded SEO site into indexed pages and qualified leads for Chinese restaurant owners in the United States who use, or are considering, restaurant POS systems.

## Pre-Deploy Checks

Run these before every deploy:

```bash
npm run build
npm run validate:seo
python3 -m http.server 4173
npm run smoke:http -- http://127.0.0.1:4173
```

Stop the local server after the smoke test.

The validation script checks:
- crawlable page count
- title, description, and canonical coverage
- valid JSON-LD
- sitemap coverage
- lead-form qualification fields
- POS recommendation intent for restaurants without a POS
- source attribution through `landing_page`, `referrer`, UTM fields, `gclid`, and `msclkid`
- internal links
- `robots.txt` sitemap discovery

To print the priority Search Console URL Inspection list:

```bash
npm run indexing:urls
```

## Deploy

This repository currently has a mixed worktree during SEO buildout, so do not use `git add .` unless you have confirmed every untracked file belongs in the deploy.

```bash
git add assets/css/styles.css assets/js/form-attribution.js index.html package.json sitemap.xml site-map zh/index.html zh/site-map
git add ai-order-taking-for-restaurants ai-phone-agent-for-takeout-restaurants ai-phone-answering-for-chinese-restaurants ai-phone-ordering-for-chinese-takeout ai-restaurant-phone-agent bilingual-restaurant-phone-ordering
git add ai-voice-assistant-for-restaurants best-pos-for-chinese-restaurant-phone-orders chinese-restaurant-ai-phone-ordering chinese-restaurant-phone-order-automation chinese-restaurant-pos-integration chinese-restaurant-voice-ai phone-order-ai-for-small-restaurants pos pos-integrated-ai-phone-agent
git add restaurant-ai-assistant restaurant-ai-phone-order-taker restaurant-answering-service-for-takeout restaurant-automation-software-phone-orders restaurant-call-answering-ai restaurant-missed-call-recovery restaurant-phone-answering-service restaurant-phone-order-ai-pos restaurant-phone-order-automation restaurant-pos-phone-order-integration restaurant-pos-system-phone-orders restaurant-tech-ai-phone-ordering restaurant-voice-ordering-system service-areas takeout-order-phone-answering-service
git add zh/ai-order-taking-for-restaurants zh/ai-phone-agent-for-takeout-restaurants zh/ai-phone-answering-for-chinese-restaurants zh/ai-phone-ordering-for-chinese-takeout zh/ai-restaurant-phone-agent zh/bilingual-restaurant-phone-ordering
git add zh/ai-voice-assistant-for-restaurants zh/best-pos-for-chinese-restaurant-phone-orders zh/chinese-restaurant-ai-phone-ordering zh/chinese-restaurant-phone-order-automation zh/chinese-restaurant-pos-integration zh/chinese-restaurant-voice-ai zh/phone-order-ai-for-small-restaurants zh/pos zh/pos-integrated-ai-phone-agent
git add zh/restaurant-ai-assistant zh/restaurant-ai-phone-order-taker zh/restaurant-answering-service-for-takeout zh/restaurant-automation-software-phone-orders zh/restaurant-call-answering-ai zh/restaurant-missed-call-recovery zh/restaurant-phone-answering-service zh/restaurant-phone-order-ai-pos zh/restaurant-phone-order-automation zh/restaurant-pos-phone-order-integration zh/restaurant-pos-system-phone-orders zh/restaurant-tech-ai-phone-ordering zh/restaurant-voice-ordering-system zh/service-areas zh/takeout-order-phone-answering-service
git add docs scripts
git commit -m "Expand SEO landing pages and validation"
git push
```

Cloudflare Pages should deploy the pushed commit automatically.

## Production Indexing Checklist

After Cloudflare deploys:

1. Open `https://serviio.ai/sitemap.xml`.
2. Confirm all listed URLs return HTTP 200:
   ```bash
   npm run smoke:prod
   ```
3. In Google Search Console, submit `https://serviio.ai/sitemap.xml`.
4. Use URL Inspection and request indexing for the highest-priority pages:
   - `https://serviio.ai/chinese-restaurant-ai-phone-ordering/`
   - `https://serviio.ai/zh/chinese-restaurant-ai-phone-ordering/`
   - `https://serviio.ai/chinese-restaurant-phone-order-automation/`
   - `https://serviio.ai/zh/chinese-restaurant-phone-order-automation/`
   - `https://serviio.ai/restaurant-pos-phone-order-integration/`
   - `https://serviio.ai/zh/restaurant-pos-phone-order-integration/`
   - `https://serviio.ai/chinese-restaurant-pos-integration/`
   - `https://serviio.ai/zh/chinese-restaurant-pos-integration/`
   - `https://serviio.ai/restaurant-phone-order-ai-pos/`
   - `https://serviio.ai/zh/restaurant-phone-order-ai-pos/`
   - `https://serviio.ai/restaurant-ai-assistant/`
   - `https://serviio.ai/zh/restaurant-ai-assistant/`
   - `https://serviio.ai/restaurant-pos-system-phone-orders/`
   - `https://serviio.ai/zh/restaurant-pos-system-phone-orders/`
   - `https://serviio.ai/ai-voice-assistant-for-restaurants/`
   - `https://serviio.ai/zh/ai-voice-assistant-for-restaurants/`
   - `https://serviio.ai/restaurant-tech-ai-phone-ordering/`
   - `https://serviio.ai/zh/restaurant-tech-ai-phone-ordering/`
   - `https://serviio.ai/best-pos-for-chinese-restaurant-phone-orders/`
   - `https://serviio.ai/zh/best-pos-for-chinese-restaurant-phone-orders/`
   - `https://serviio.ai/restaurant-phone-order-automation/`
   - `https://serviio.ai/zh/restaurant-phone-order-automation/`
   - `https://serviio.ai/restaurant-automation-software-phone-orders/`
   - `https://serviio.ai/zh/restaurant-automation-software-phone-orders/`
   - `https://serviio.ai/service-areas/california-chinese-restaurant-ai-phone-ordering/`
   - `https://serviio.ai/zh/service-areas/california-chinese-restaurant-ai-phone-ordering/`
   - `https://serviio.ai/service-areas/new-york-chinese-restaurant-ai-phone-ordering/`
   - `https://serviio.ai/zh/service-areas/new-york-chinese-restaurant-ai-phone-ordering/`
   - `https://serviio.ai/service-areas/new-jersey-chinese-restaurant-ai-phone-ordering/`
   - `https://serviio.ai/zh/service-areas/new-jersey-chinese-restaurant-ai-phone-ordering/`
   - `https://serviio.ai/service-areas/texas-chinese-restaurant-ai-phone-ordering/`
   - `https://serviio.ai/zh/service-areas/texas-chinese-restaurant-ai-phone-ordering/`
   - `https://serviio.ai/pos/menusifu-ai-phone-ordering/`
   - `https://serviio.ai/zh/pos/menusifu-ai-phone-ordering/`
   - `https://serviio.ai/pos/39-miles-ai-phone-ordering/`
   - `https://serviio.ai/zh/pos/39-miles-ai-phone-ordering/`
5. Check Search Console again after Google crawls:
   - Pages indexed
   - Duplicate without user-selected canonical
   - Crawled but not indexed
   - Discovered but not indexed

## Lead Scoring

Score Formspree leads in this order.

High priority:
- Chinese restaurant or Asian restaurant
- United States location
- Existing POS: 39 Miles, Square, Toast, Clover, MenuSifu, Chowbus, Mealkeyway, or other POS
- 76+ phone orders per week, or clear rush-hour missed-call pain
- Lead source from a POS page, Chinese restaurant page, or automation page

Medium priority:
- Restaurant has a POS but low phone-order volume
- Restaurant is not Chinese but has high takeout phone volume
- Restaurant asks about bilingual call handling or multi-line coverage

Nurture or referral:
- No POS yet
- Wants POS recommendations through `pos_recommendation_interest`
- Low phone-order volume
- Not ready for AI phone ordering, but may be useful to POS partners

## Follow-Up SLA

Respond to high-priority leads within 24 hours.

First follow-up should confirm:
- Restaurant type
- City and state
- Current POS
- Weekly phone-order volume
- Main pain: missed calls, bilingual calls, manual entry, or after-hours calls
- Whether they want a demo or POS integration assessment

## Attribution Fields

Every Formspree form loads `/assets/js/form-attribution.js`, which appends:
- `landing_page`
- `landing_path`
- `referrer`
- `utm_source`
- `utm_medium`
- `utm_campaign`
- `utm_term`
- `utm_content`
- `gclid`
- `msclkid`

Use these fields to compare SEO, paid search, community posts, directory listings, and partner referrals.

## Weekly SEO Routine

Every week:

1. Review Search Console queries and landing pages.
2. Add internal links to pages with impressions but weak average position.
3. Contact 5 directory, POS consultant, or restaurant community partners.
4. Publish 1 bilingual educational post in a restaurant-owner community.
5. Ask 1 pilot or customer for a testimonial that includes city, restaurant type, POS system, and phone-order pain.
6. Add one new page only if Search Console shows a query cluster with impressions and no matching landing page.

## Google Scorecard

Google does not provide one organic SEO score. Use `docs/google-search-console-scorecard.md` as the weekly scorecard for:
- indexed page coverage
- clicks
- impressions
- CTR
- average position
- target-query page-one count
- leads by landing page and `lead_source`
