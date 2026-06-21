# Serviio Authority Command Center

Generated: 2026-06-21

## Score Snapshot

- Current authority score: 6/100
- First-hour projected score after ordered completion: 47/100
- First-hour projected delta: +41
- Evidence-qualified submitted or follow-up rows: 0
- Evidence-qualified live authority rows: 1
- High-fit partner/POS/association rows started: 0

## First-Hour Queue

| Position | Target | Individual Delta | Individual Score | Cumulative Delta | Cumulative Score |
| ---: | --- | ---: | ---: | ---: | ---: |
| 1 | Google Business Profile | 7 | 13 | 7 | 13 |
| 2 | MenuSifu restaurant consultants | 8 | 14 | 15 | 21 |
| 3 | 39 Miles restaurant consultants | 8 | 14 | 23 | 29 |
| 4 | Pilot restaurant testimonial | 18 | 24 | 41 | 47 |

## Immediate Execution Details

Use these details during the next manual authority block. Do not run the tracker command until the external action is actually submitted and evidence fields are filled.

### 1. Google Business Profile

- Channel: Business profile
- Contact URL: https://www.google.com/business/
- Landing URL: https://serviio.ai/
- UTM URL: https://serviio.ai/?utm_source=google_business_profile&utm_medium=organic_listing&utm_campaign=free_search_marketing
- Subject: Serviio
- Proof fields: Published profile URL, verification screenshot, or dashboard confirmation.
- Evidence channel: business_profile

Tracker command after real submission:

```bash
npm run marketing:mark -- --target "Google Business Profile" --status submitted --date 2026-06-21 --note "Submitted/contacted; add confirmation URL and account used. Follow up: 2026-06-28."
```

### 2. MenuSifu restaurant consultants

- Channel: POS-specific outreach
- Contact URL: https://forms.menusifu.com/pages/demo-request
- Landing URL: https://serviio.ai/pos/menusifu-ai-phone-ordering/
- UTM URL: https://serviio.ai/pos/menusifu-ai-phone-ordering/?utm_source=menusifu_pos_consultant&utm_medium=partner_referral&utm_campaign=free_search_marketing
- Subject: AI phone ordering add-on for MenuSifu restaurants
- Proof fields: Partner reply, referral-page URL, submitted form confirmation, or sent-message URL.
- Evidence channel: partner_referral

Tracker command after real submission:

```bash
npm run marketing:mark -- --target "MenuSifu restaurant consultants" --status submitted --date 2026-06-21 --note "Submitted/contacted; add confirmation URL and account used. Follow up: 2026-06-28."
```

### 3. 39 Miles restaurant consultants

- Channel: POS-specific outreach
- Contact URL: https://pos.menuorg.com/en/
- Landing URL: https://serviio.ai/pos/39-miles-ai-phone-ordering/
- UTM URL: https://serviio.ai/pos/39-miles-ai-phone-ordering/?utm_source=39_miles_pos_consultant&utm_medium=partner_referral&utm_campaign=free_search_marketing
- Subject: AI phone ordering add-on for 39 Miles restaurants
- Proof fields: Partner reply, referral-page URL, submitted form confirmation, or sent-message URL.
- Evidence channel: partner_referral

Tracker command after real submission:

```bash
npm run marketing:mark -- --target "39 Miles restaurant consultants" --status submitted --date 2026-06-21 --note "Submitted/contacted; add confirmation URL and account used. Follow up: 2026-06-28."
```

### 4. Pilot restaurant testimonial

- Channel: Customer proof
- Contact URL: https://serviio.ai/customer-proof-request/
- Landing URL: https://serviio.ai/customer-proof-request/
- UTM URL: https://serviio.ai/customer-proof-request/?utm_source=customer_testimonial&utm_medium=customer_proof&utm_campaign=free_search_marketing
- Subject: Customer proof request for restaurant AI phone ordering
- Proof fields: Published testimonial/case-study URL or written customer approval note.
- Evidence channel: customer_proof

Tracker command after real submission:

```bash
npm run marketing:mark -- --target "Pilot restaurant testimonial" --status submitted --date 2026-06-21 --note "Submitted/contacted; add confirmation URL and account used. Follow up: 2026-06-28."
```


## Evidence Readiness

- Rows ready for first-hour sync: 0/4
- Rows ready for live-listing sync: 0/1

### Pending First-Hour Evidence

- Google Business Profile: set `action_status`, `submitted_date`, confirmation evidence, `follow_up_date`
- MenuSifu restaurant consultants: set `action_status`, `submitted_date`, confirmation evidence, `follow_up_date`
- 39 Miles restaurant consultants: set `action_status`, `submitted_date`, confirmation evidence, `follow_up_date`
- Pilot restaurant testimonial: set `action_status`, `submitted_date`, confirmation evidence, `follow_up_date`

### Pending Live Listing Evidence

- Product Hunt Serviio listing: set `action_status`, `completed_date`, `evidence_url` live URL, confirmation evidence

## Commands

```bash
npm run marketing:submission-preflight:first-hour
npm run marketing:submission-sync -- --apply --log docs/authority-first-hour-submission-log.csv
npm run marketing:live-listings-preflight
npm run marketing:live-listings-sync -- --apply
npm run seo:authority
```

## Remaining Milestones

- Get 5 live authority links or profiles recorded in the tracker.
- Submit or contact at least 15 authority targets.
- Start 8 high-fit partner, POS, association, or restaurant-tech opportunities.
- Create or claim Google Business Profile, Bing Places, and Apple Business Connect if eligible.
- Secure 1 customer proof or pilot testimonial mentioning city, restaurant type, POS, and phone-order pain.
