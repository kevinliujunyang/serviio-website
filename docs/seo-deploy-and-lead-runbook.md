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
- persisted source attribution through first-touch landing fields, current-page fields, UTM fields, `gclid`, and `msclkid`
- internal links
- homepage Organization schema authority signals for contact, Chinese restaurant AI ordering, POS integration, and named POS systems
- Search Console priority paths against `sitemap.xml` and `scripts/print-indexing-urls.js`
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
4. Print the current URL Inspection queue:
   ```bash
   npm run indexing:urls
   ```
5. In Google Search Console, request indexing for every URL under `Top Priority URL Inspection List` first. These are the strongest buyer-intent pages for Chinese restaurant owners, POS-ready workflows, and named POS systems.
6. If daily URL Inspection quota remains, request indexing for `Secondary Priority URL Inspection List`, prioritizing:
   - pages with exact Chinese restaurant plus POS or phone-order intent
   - service-area pages for states or cities where outreach is active
   - guide pages used in directory, community, or partner submissions
7. Save the command output with the Search Console submission date so the next weekly review knows which URLs were requested.
8. Check Search Console again after Google crawls:
   - Pages indexed
   - Duplicate without user-selected canonical
   - Crawled but not indexed
   - Discovered but not indexed

## Lead Scoring

Export Formspree submissions as CSV and score them with:

```bash
npm run leads:score -- path/to/formspree-export.csv --out scored-leads.csv
```

For a quick count without writing a scored CSV:

```bash
npm run leads:score -- path/to/formspree-export.csv --summary-only
```

Before processing a new export format, run the scorer regression check:

```bash
npm run leads:test
```

Call high-priority leads first. The script writes routing, fit, and contact columns before the original Formspree columns:
- `lead_priority`
- `lead_route`
- `lead_next_action`
- `lead_score`
- `lead_reason`
- `pos_readiness`
- `phone_volume_tier`
- `chinese_or_asian_intent`
- `priority_seo_source`
- `us_location_captured`
- `pos_focus`
- `buyer_profile`

Use `buyer_profile` as the quick outreach summary. It combines POS readiness, phone-order volume tier, Chinese or Asian restaurant intent, priority SEO source, location capture, the POS-specific landing-page focus, and the original `lead_source`.

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

Routing fields:
- `call_now`: POS-ready, high-volume, Chinese/POS-intent lead. Call within 24 hours.
- `demo_queue`: POS-ready lead that should get POS workflow questions and a fit check.
- `pos_referral`: no-POS lead that explicitly wants POS recommendations.
- `nurture_no_pos`: no-POS lead without clear POS recommendation interest.
- `manual_review`: incomplete or ambiguous lead; confirm POS, volume, and fit manually.

## Follow-Up SLA

Respond to high-priority leads within 24 hours.

First follow-up should confirm:
- Restaurant type
- City and state
- Email and phone
- Current POS
- Weekly phone-order volume
- Main pain: missed calls, bilingual calls, manual entry, or after-hours calls
- Whether they want a demo or POS integration assessment

## Attribution Fields

Every Formspree form loads `/assets/js/form-attribution.js`, which appends:
- `landing_page`
- `landing_path`
- `first_referrer`
- `first_utm_source`
- `first_utm_medium`
- `first_utm_campaign`
- `first_utm_term`
- `first_utm_content`
- `first_gclid`
- `first_msclkid`
- `first_seen_at`
- `current_page`
- `current_path`
- `referrer`
- `utm_source`
- `utm_medium`
- `utm_campaign`
- `utm_term`
- `utm_content`
- `gclid`
- `msclkid`
- `last_page`
- `last_path`
- `last_seen_at`

Use first-touch fields to attribute the original directory, community, Search Console, or partner referral. Use current and last fields to see which page finally converted after the visitor browsed the site.

Free search marketing submissions and UTM tracking rules live in `docs/free-search-marketing-checklist.md`.

## Weekly SEO Routine

Every week:

1. Review Search Console queries and landing pages.
2. Add internal links to pages with impressions but weak average position.
3. Contact 5 directory, POS consultant, or restaurant community partners.
4. Publish 1 bilingual educational post in a restaurant-owner community.
5. Ask 1 pilot or customer for a testimonial that includes city, restaurant type, POS system, and phone-order pain.
6. Add one new page only if Search Console shows a query cluster with impressions and no matching landing page.

Use the Search Console export analyzer before deciding what to edit:

```bash
npm run search:analyze -- path/to/search-console-export.csv --out search-console-analysis.md
```

## Google Scorecard

Google does not provide one organic SEO score. Use `docs/google-search-console-scorecard.md` as the weekly scorecard for:
- indexed page coverage
- clicks
- impressions
- CTR
- average position
- target-query page-one count
- leads by landing page and `lead_source`
