# Serviio First-Hour Authority Brief

Generated: 2026-06-21

Use this brief for the next manual authority block. Complete the external action first, then fill the evidence fields before syncing anything back to the tracker.

## Evidence Rule

- Do not mark a row submitted until there is a submitted form confirmation, sent-message proof, dashboard screenshot, written approval, or live URL.
- Keep no-POS restaurant owners as POS partner referral leads; prioritize restaurants already using 39 Miles, Square, Toast, Clover, MenuSifu, Chowbus, Mealkeyway, or another POS.

## 1. Google Business Profile

- Channel: Business profile
- Lead priority: P0 inbound restaurant-owner lead source
- Contact URL: https://www.google.com/business/
- Clean URL: https://serviio.ai/
- UTM URL: https://serviio.ai/?utm_source=google_business_profile&utm_medium=organic_listing&utm_campaign=free_search_marketing
- Subject or title: Serviio
- Expected lead channel: business_profile
- Evidence needed: Published profile URL, verification screenshot, or dashboard confirmation.

Execution checklist:

- Use clean homepage URL if Google rejects UTM parameters. Add service-area business details, phone, website, logo, restaurant technology category, services, products, Q&A, and one update post. Capture verification screenshot or dashboard confirmation, account/login used, submitted date, and pending review status.

Copy-paste payload:

```text
Title: Serviio
Tagline: AI phone ordering for restaurants.
Short description: Serviio is an AI phone ordering system for restaurants. It answers calls 24/7, takes orders in natural conversation, supports English and Chinese, and helps restaurants connect phone orders to POS-ready kitchen workflows.
Serviio helps restaurants reduce missed calls and capture takeout orders during lunch, dinner, weekends, and holidays. It is built for restaurants with phone-order volume, including Chinese restaurants using systems such as 39 Miles, Square, Toast, Clover, MenuSifu, Chowbus, and Mealkeyway.
```

Evidence fields to fill after the action:

- action_status: submitted
- evidence_url
- account_or_login
- confirmation_note
- submitted_date
- follow_up_date: 2026-06-27

Tracker command after evidence exists:

```bash
npm run marketing:mark -- --target "Google Business Profile" --status submitted --date 2026-06-20 --note "Submitted/contacted; add confirmation URL and account used. Follow up: 2026-06-27."
```

## 2. MenuSifu restaurant consultants

- Channel: POS-specific outreach
- Lead priority: P0 POS-ready Chinese restaurant lead source
- Contact URL: https://forms.menusifu.com/pages/demo-request
- Clean URL: https://serviio.ai/pos/menusifu-ai-phone-ordering/
- UTM URL: https://serviio.ai/pos/menusifu-ai-phone-ordering/?utm_source=menusifu_pos_consultant&utm_medium=partner_referral&utm_campaign=free_search_marketing
- Subject or title: AI phone ordering add-on for MenuSifu restaurants
- Expected lead channel: partner_referral
- Evidence needed: Partner reply, referral-page URL, submitted form confirmation, or sent-message URL.

Execution checklist:

- Submit MenuSifu partner or demo form with Serviio POS-ready phone-order copy. Ask for referral or integration contact path for Chinese restaurants using MenuSifu. Capture submitted form confirmation, account/login or email used, submitted date, and seven-day follow-up date.

Copy-paste payload:

```text
Subject: AI phone ordering add-on for MenuSifu restaurants
Title: MenuSifu AI phone ordering partner referral
Tagline: AI phone ordering for restaurants using MenuSifu.
Short description: Serviio helps MenuSifu restaurant operators answer phone orders with AI and evaluate POS-ready phone-order workflows.
Hi [Name], Serviio helps restaurants answer phone calls with AI, capture structured takeout order details, and evaluate how confirmed orders can move into the restaurant POS or kitchen workflow. We are especially focused on Chinese restaurants and takeout-heavy operators already using MenuSifu. These restaurants often still receive high phone volume during lunch and dinner rush, even when online ordering is available. Would you be open to a short partner/referral conversation? We can route POS-ready restaurants to an AI phone-ordering demo, and no-POS restaurants can be qualified separately for POS recommendations before they are a fit for Serviio. Relevant page: https://serviio.ai/pos/menusifu-ai-phone-ordering/?utm_source=menusifu_pos_consultant&utm_medium=partner_referral&utm_campaign=free_search_marketing Thanks, Serviio
Follow-up: Hi [Name], Following up on the note below. The best fit is a restaurant that already uses MenuSifu, receives regular phone orders, and wants fewer missed calls or less manual re-entry during rush hours. If there is a better person for partner or integration conversations, could you point me in the right direction? Thanks, Serviio
```

Evidence fields to fill after the action:

- action_status: submitted
- evidence_url
- account_or_login
- confirmation_note
- submitted_date
- follow_up_date: 2026-06-27

Tracker command after evidence exists:

```bash
npm run marketing:mark -- --target "MenuSifu restaurant consultants" --status submitted --date 2026-06-20 --note "Submitted/contacted; add confirmation URL and account used. Follow up: 2026-06-27."
```

## 3. 39 Miles restaurant consultants

- Channel: POS-specific outreach
- Lead priority: P0 POS-ready Chinese restaurant lead source
- Contact URL: https://pos.menuorg.com/en/
- Clean URL: https://serviio.ai/pos/39-miles-ai-phone-ordering/
- UTM URL: https://serviio.ai/pos/39-miles-ai-phone-ordering/?utm_source=39_miles_pos_consultant&utm_medium=partner_referral&utm_campaign=free_search_marketing
- Subject or title: AI phone ordering add-on for 39 Miles restaurants
- Expected lead channel: partner_referral
- Evidence needed: Partner reply, referral-page URL, submitted form confirmation, or sent-message URL.

Execution checklist:

- Contact 39 Miles/MENUPO using the official contact path with Serviio POS-ready phone-order copy. Ask for referral, integration, or consultant contact path for Chinese restaurants using 39 Miles. Capture sent-message URL or screenshot, account/login or email used, submitted date, and seven-day follow-up date.

Copy-paste payload:

```text
Subject: AI phone ordering add-on for 39 Miles restaurants
Title: 39 Miles AI phone ordering partner referral
Tagline: AI phone ordering for restaurants using 39 Miles.
Short description: Serviio helps 39 Miles restaurant operators answer phone orders with AI and evaluate POS-ready phone-order workflows.
Hi [Name], Serviio helps restaurants answer phone calls with AI, capture structured takeout order details, and evaluate how confirmed orders can move into the restaurant POS or kitchen workflow. We are especially focused on Chinese restaurants and takeout-heavy operators already using 39 Miles. These restaurants often still receive high phone volume during lunch and dinner rush, even when online ordering is available. Would you be open to a short partner/referral conversation? We can route POS-ready restaurants to an AI phone-ordering demo, and no-POS restaurants can be qualified separately for POS recommendations before they are a fit for Serviio. Relevant page: https://serviio.ai/pos/39-miles-ai-phone-ordering/?utm_source=39_miles_pos_consultant&utm_medium=partner_referral&utm_campaign=free_search_marketing Thanks, Serviio
Follow-up: Hi [Name], Following up on the note below. The best fit is a restaurant that already uses 39 Miles, receives regular phone orders, and wants fewer missed calls or less manual re-entry during rush hours. If there is a better person for partner or integration conversations, could you point me in the right direction? Thanks, Serviio
```

Evidence fields to fill after the action:

- action_status: submitted
- evidence_url
- account_or_login
- confirmation_note
- submitted_date
- follow_up_date: 2026-06-27

Tracker command after evidence exists:

```bash
npm run marketing:mark -- --target "39 Miles restaurant consultants" --status submitted --date 2026-06-20 --note "Submitted/contacted; add confirmation URL and account used. Follow up: 2026-06-27."
```

## 4. Pilot restaurant testimonial

- Channel: Customer proof
- Lead priority: P2 proof asset for conversion
- Contact URL: https://serviio.ai/customer-proof-request/
- Clean URL: https://serviio.ai/customer-proof-request/
- UTM URL: https://serviio.ai/customer-proof-request/?utm_source=customer_testimonial&utm_medium=customer_proof&utm_campaign=free_search_marketing
- Subject or title: Customer proof request for restaurant AI phone ordering
- Expected lead channel: customer_proof
- Evidence needed: Published testimonial/case-study URL or written customer approval note.

Execution checklist:

- Send customer proof request link to a pilot, demo, or customer contact. Ask for city, restaurant type, POS system, weekly phone-order volume, phone-order pain, quote, and publication permission. Capture written approval, submitted proof form URL or screenshot, submitted date, and follow-up date.

Copy-paste payload:

```text
Subject: Customer proof request for restaurant AI phone ordering
Title: Chinese restaurant AI phone ordering testimonial
Tagline: Customer proof for POS-ready restaurant phone ordering.
Short description: Request a testimonial or proof note from a POS-ready restaurant after a demo, pilot, or successful setup.
Hi [Name], Thank you for trying Serviio for restaurant phone ordering. If the pilot or demo was useful, could you share a short proof note we can use for restaurant-owner trust and follow-up conversations? The most helpful version mentions your city, restaurant type, POS system, weekly phone-order volume, and the main phone-order pain: missed calls, bilingual calls, manual POS entry, after-hours calls, or menu questions. You can choose whether the proof can be published, anonymized, or kept internal for sales conversations. Proof form: https://serviio.ai/customer-proof-request/?utm_source=customer_testimonial&utm_medium=customer_proof&utm_campaign=free_search_marketing Thanks, Serviio
```

Evidence fields to fill after the action:

- action_status: submitted
- evidence_url
- account_or_login
- confirmation_note
- submitted_date
- follow_up_date: 2026-06-27

Tracker command after evidence exists:

```bash
npm run marketing:mark -- --target "Pilot restaurant testimonial" --status submitted --date 2026-06-20 --note "Submitted/contacted; add confirmation URL and account used. Follow up: 2026-06-27."
```

Generated 4 first-hour authority actions from docs/authority-first-hour-submission-log.csv.
