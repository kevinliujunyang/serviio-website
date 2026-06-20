# Serviio SEO Deploy and Lead Runbook

## Purpose

Turn the expanded SEO site into indexed pages and qualified leads for Chinese restaurant owners in the United States who use, or are considering, restaurant POS systems.

## Pre-Deploy Checks

Run these before every deploy:

```bash
npm run sitemap:sync
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

To prepare a Bing/IndexNow batch for the top-priority buyer-intent URLs:

```bash
npm run indexnow:payload
```

For sitewide content or form changes that affect every landing page, prepare the full sitemap batch:

```bash
npm run indexnow:payload:all
```

After the pushed deploy is live and the IndexNow key file is reachable at `https://serviio.ai/13f7c37452042c38a20123e6f2db6946.txt`, submit the top-priority URL batch with:

```bash
npm run indexnow:submit
```

If the deploy changed most or all pages, submit the full sitemap batch instead:

```bash
npm run indexnow:submit:all
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
3. For sitewide lead-form changes, confirm production lead-form pages contain the new field before requesting recrawl:
   ```bash
   npm run smoke:prod:forms
   ```
4. Confirm the IndexNow key file returns HTTP 200:
   ```bash
   curl -s https://serviio.ai/13f7c37452042c38a20123e6f2db6946.txt
   ```
5. Submit the top-priority URL batch to IndexNow:
   ```bash
   npm run indexnow:submit
   ```
   If the deploy changed every lead form, submit the full sitemap batch:
   ```bash
   npm run indexnow:submit:all
   ```
6. In Google Search Console, submit `https://serviio.ai/sitemap.xml`.
7. Print the current URL Inspection queue:
   ```bash
   npm run indexing:urls
   ```
8. In Google Search Console, request indexing for every URL under `Top Priority URL Inspection List` first. These are the strongest buyer-intent pages for Chinese restaurant owners, POS-ready workflows, and named POS systems.
9. If daily URL Inspection quota remains, request indexing for `Secondary Priority URL Inspection List`, prioritizing:
   - pages with exact Chinese restaurant plus POS or phone-order intent
   - service-area pages for states or cities where outreach is active
   - guide pages used in directory, community, or partner submissions
10. Save the command output with the Search Console submission date so the next weekly review knows which URLs were requested.
11. Check Search Console again after Google crawls:
   - Pages indexed
   - Duplicate without user-selected canonical
   - Crawled but not indexed
   - Discovered but not indexed

## Lead Scoring

Export Formspree submissions as CSV and score them with:

```bash
npm run leads:score -- path/to/formspree-export.csv --out scored-leads.csv
```

To export POS-ready restaurant owners for Serviio demo follow-up:

```bash
npm run leads:demo-queue -- path/to/formspree-export.csv --out demo-leads.csv
```

This writes a focused call queue for `call_now` and `demo_queue` leads with existing POS systems. It includes POS system, phone-order volume, pain, buyer profile, and a short call script that keeps the conversation tied to POS workflow and 2% completed-order pricing.

To export only no-POS restaurant owners who asked for POS recommendations:

```bash
npm run leads:pos-partners -- path/to/formspree-export.csv --out pos-partner-leads.csv
```

This writes a smaller partner-handoff CSV with contact fields, POS recommendation interest, phone-order volume, pain, `recommended_pos_partner_targets`, `partner_next_action`, `pos_partner_pitch`, and `handoff_summary`. Use it for POS partner conversations or referral resale. Do not mix this file into the immediate Serviio demo queue because these restaurants are marked `serviio_fit_status=deprioritized_until_pos_ready`.

To export POS-ready demo leads that should later be asked for customer proof:

```bash
npm run leads:customer-proof -- path/to/formspree-export.csv --out customer-proof-followups.csv
```

This writes a proof follow-up queue for `call_now` and `demo_queue` leads only. Use it after a successful demo, pilot, or setup to request a testimonial through `https://serviio.ai/customer-proof-request/`. The output includes `proof_angle`, `suggested_message`, `authority_tracker_target=Pilot restaurant testimonial`, and `authority_tracker_note` so customer proof can become evidence in the authority tracker.

Every lead export includes `lead_acquisition_channel` so SEO and authority work can be tied back to qualified lead quality. Current channel values are `business_profile`, `partner_referral`, `customer_proof`, `calculator`, `directory_or_listing`, `community_or_association`, `indexing_or_webmaster`, `seo_landing_page`, and `direct_or_unknown`.

Calculator-origin demo leads from `/restaurant-missed-call-revenue-calculator/` include the calculator assumptions and estimate fields in the demo queue:
- `calculator_missed_calls_per_week`
- `calculator_order_rate_percent`
- `calculator_average_order_value`
- `calculator_recovery_rate_percent`
- `estimated_lost_orders`
- `estimated_lost_revenue`
- `estimated_recoverable_revenue`
- `estimated_serviio_fee`

Use these fields during the first call. Confirm the owner still believes the missed-call estimate is directionally right, then qualify whether the order should flow to the current POS, a kitchen workflow, or a staff confirmation step. Do not quote the calculator as a guaranteed recovery number.

Calculator-origin no-POS leads keep the same estimate fields in the POS partner handoff export. Use `estimated_recoverable_revenue`, `estimated_lost_orders`, and `estimated_serviio_fee` to explain why the owner may be commercially ready for POS recommendations before Serviio AI phone ordering. These leads should stay out of the immediate Serviio demo queue until the POS path is chosen.

For a quick count without writing a scored CSV:

```bash
npm run leads:score -- path/to/formspree-export.csv --summary-only
npm run leads:demo-queue -- path/to/formspree-export.csv --summary-only
npm run leads:pos-partners -- path/to/formspree-export.csv --summary-only
npm run leads:customer-proof -- path/to/formspree-export.csv --summary-only
```

The lead-scoring summary prints acquisition-channel counts. Use those counts to compare whether business profiles, directories, partner referrals, calculators, community posts, or SEO landing pages are producing POS-ready demo leads versus no-POS partner-referral leads.

Before processing a new export format, run the scorer regression check:

```bash
npm run leads:test
```

To preview the complete routing workflow without real Formspree data, regenerate the sample outputs:

```bash
npm run leads:sample:score
npm run leads:sample:demo
npm run leads:sample:pos-partners
npm run leads:sample:customer-proof
```

The fixture at `docs/sample-formspree-leads.csv` includes POS-ready demo leads, no-POS POS-referral leads, and a partner/referral inquiry. The generated sample CSVs make it easy to verify that the split is working before processing live leads, including customer-proof follow-ups for POS-ready demo leads.

Call high-priority leads first. The script writes routing, fit, and contact columns before the original Formspree columns:
- `lead_priority`
- `lead_route`
- `lead_next_action`
- `lead_score`
- `lead_reason`
- `pos_readiness`
- `phone_volume_tier`
- `pain_signal`
- `urgent_pain_signal`
- `chinese_or_asian_intent`
- `priority_seo_source`
- `partner_inquiry`
- `us_location_captured`
- `pos_focus`
- `conversion_offer`
- `buyer_profile`
- `monetization_route`
- `partner_referral_priority`
- `partner_next_action`
- `pos_partner_lead_status`
- `pos_partner_lead_type`
- `recommended_pos_partner_targets`
- `pos_partner_pitch`
- `pos_partner_lead_package`
- `serviio_fit_status`
- `pos_purchase_timeline`
- `pos_purchase_timeline_urgency`

Use `buyer_profile` as the quick outreach summary. It combines POS readiness, phone-order volume tier, Chinese or Asian restaurant intent, priority SEO source, location capture, partner referral priority, POS purchase timeline urgency, urgent pain signals, the POS-specific landing-page focus, conversion offer such as `pos_readiness_checklist`, and the original `lead_source`.

Use `pain_signal` and `urgent_pain_signal` to spot owners with immediate operational pain. Urgent pain includes missed calls, rush-hour call overload, manual POS re-entry, or after-hours calls. These leads can outrank similar-volume leads because the business problem is clearer.

Use `partner_inquiry` to separate POS consultants, restaurant technology partners, website agencies, and referral partners from ordinary restaurant-owner leads. Partner-page submissions should go to partnership follow-up first, not the restaurant demo queue.

Use the customer proof follow-up export after a lead has a real demo, pilot, or successful setup. Do not count proof as authority until the customer submits permission or a testimonial. Once proof is usable, update the `Pilot restaurant testimonial` row in `docs/free-search-marketing-tracker.csv` with `status=submitted` or `status=live`, the evidence note, and the live proof URL if one exists.

Use `monetization_route` to split follow-up:
- `serviio_demo`: POS-ready restaurant lead. Keep this in Serviio's demo pipeline first.
- `pos_partner_referral`: no-POS lead that asked for POS recommendations. Preserve it for POS partner follow-up or referral resale.
- `partner_relationship`: partner, consultant, agency, or referral-channel lead. Qualify channel fit, POS focus, geography, and referral process.
- `unknown`: incomplete POS data. Confirm POS status before routing.

Use `partner_referral_priority` to handle no-POS leads:
- `hot`: no-POS lead with POS recommendation interest plus useful commercial signals such as US location, medium/high phone volume, Chinese or Asian intent, or a priority SEO source.
- `warm`: no-POS lead that wants POS recommendations but needs more qualification before a partner handoff.
- `strategic`: partner/referral-channel inquiry from the POS partner referral page.
- `none`: POS-ready Serviio lead or ambiguous lead without a POS referral path.

Use the POS partner packaging fields when a restaurant owner does not have a POS but asks for recommendations:
- `pos_partner_lead_status=qualified_for_pos_partner`: this no-POS lead can be worked as a POS partner referral instead of a Serviio demo.
- `pos_partner_lead_type=hot_no_pos_restaurant`: prioritize partner handoff because the lead has stronger commercial signals.
- `pos_partner_lead_type=warm_no_pos_restaurant`: keep nurturing and collect timeline, budget, and POS requirements before handoff.
- `pos_partner_lead_package`: copy this summary into partner follow-up. It includes restaurant name, location, POS status, phone-order volume, POS recommendation interest, pain, lead source, and landing page.
- For calculator-origin no-POS leads, the POS partner handoff also includes `calculator_missed_calls_per_week`, `estimated_lost_orders`, `estimated_lost_revenue`, `estimated_recoverable_revenue`, and `estimated_serviio_fee`. Use those values as context for urgency, not as guaranteed revenue.
- `serviio_fit_status=deprioritized_until_pos_ready`: do not push immediate AI phone ordering until the restaurant chooses or implements a POS.
- `pos_purchase_timeline`: use this to prioritize POS partner handoff. `Immediately` and `Within 1 month` are stronger resale/referral signals than `Not sure yet`.
- `pos_purchase_timeline_urgency`: normalized timeline bucket. `urgent` means immediate or within 1 month, `near_term` means roughly 1-3 months, `unknown` means the owner is unsure, and `not_applicable` means the restaurant already has a POS. Treat urgent no-POS leads as stronger POS partner handoff candidates, especially when location and Chinese/POS-intent are present.

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
- `partner_pipeline`: POS consultant, restaurant technology partner, website agency, or referral-channel inquiry.
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

Work the generated report in this order:
1. `Buyer-Intent Action Queue` for high-value Chinese restaurant, POS, and phone-order rows.
2. `POS-Specific Query Opportunities` for 39 Miles, Square, Toast, Clover, MenuSifu, Chowbus, and Mealkeyway pages or outreach anchors.
3. `Title/Meta Rewrite Briefs` for page-one low-CTR rows and near-page-one rows where title/meta copy can pull more qualified clicks.
4. `Internal-Link Action Queue` for pages that need more internal authority.

## Google Scorecard

Google does not provide one organic SEO score. Use `docs/google-search-console-scorecard.md` as the weekly scorecard for:
- indexed page coverage
- clicks
- impressions
- CTR
- average position
- target-query page-one count
- leads by landing page and `lead_source`
