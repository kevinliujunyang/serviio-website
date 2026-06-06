# Serviio SEO Authority Playbook

## Objective

Build enough off-page authority, local trust, and referral traffic to support first-page rankings for Chinese restaurant AI phone ordering and POS-specific searches.

## Priority Backlink Targets

The operational tracker for free listing and outreach work lives in `docs/free-search-marketing-checklist.md`.

Restaurant technology directories:
- restaurant technology marketplaces
- restaurant POS consultant directories
- AI tools directories with a restaurant operations category
- startup directories where B2B SaaS listings are allowed

Chinese restaurant and Asian business communities:
- Chinese restaurant owner associations
- local Chinese business associations
- Asian chamber of commerce directories
- WeChat groups and community newsletters where business listings are allowed

Partner/referral sources:
- independent POS consultants
- menu digitization providers
- restaurant website agencies
- local restaurant marketing agencies
- phone system and VoIP consultants serving restaurants

Customer proof:
- one testimonial per early restaurant
- include city, restaurant category, POS system, and phone-order problem
- quote should mention practical outcome such as fewer missed calls, less manual entry, or better bilingual call handling

## Outreach Message

Subject: AI phone ordering for Chinese restaurants using POS systems

Hi [Name],

Serviio helps Chinese restaurants answer phone orders with AI in English and Chinese, then route confirmed orders toward the restaurant's POS or kitchen workflow.

We are focused on restaurants using systems like 39 Miles, Square, Toast, Clover, MenuSifu, Chowbus, and Mealkeyway. If you work with restaurant owners who miss phone orders during rush hours, I think this could be useful to your audience.

Could we be listed as a restaurant phone ordering / AI answering resource, or discuss a referral path for restaurants that need phone automation?

Thanks,
Serviio

## Community Post

Many Chinese restaurants still lose phone orders during lunch and dinner rush because staff are busy packing food, serving guests, or answering in-store questions.

Serviio is an AI phone answering system for restaurants. It can answer in English and Chinese, take pickup orders, ask about modifiers and spice level, and evaluate integration with POS systems like 39 Miles, Square, Toast, Clover, MenuSifu, Chowbus, and Mealkeyway.

If your restaurant gets regular phone orders and already uses a POS, you can check fit here:
https://serviio.ai/chinese-restaurant-ai-phone-ordering/

For an educational explanation of the workflow before evaluating vendors:
https://serviio.ai/guides/restaurant-ai-phone-ordering-pos-guide/

## Review/Testimonial Request

Hi [Customer],

Could you share a short sentence about what Serviio helped with?

The most useful format is:
"Before Serviio, we had trouble with [missed calls / bilingual calls / manual order entry]. After setup, [specific improvement]. We use [POS system] in [city/state]."

This helps other restaurant owners understand whether Serviio is relevant to their setup.

## Weekly Authority Routine

1. Submit Serviio to 3 relevant directories or partner lists.
2. Contact 5 restaurant consultants, POS consultants, or local business groups.
3. Post 1 bilingual educational piece for restaurant owners.
4. Ask 1 customer or pilot restaurant for a testimonial.
5. Review Search Console queries and add internal links to pages that are gaining impressions.

Record each submission, listing URL, UTM URL, and follow-up status in `docs/free-search-marketing-tracker.csv`. Use the helper command after each real action:

```bash
npm run marketing:mark -- --target "POS consultants" --status submitted --note "Sent partner referral note to contact form; check for reply next week."
```

Use `status=live` only after the listing or backlink is visible, and include the live URL:

```bash
npm run marketing:mark -- --target "Restaurant POS directory" --status live --url "https://example.com/serviio" --note "Published listing with restaurant AI phone-ordering anchor."
```

Run `npm run seo:authority` after the tracker update. The score should rise only when rows are submitted, need follow-up, or go live.

Before starting new outreach, check whether already-submitted rows need a second touch:

```bash
npm run marketing:follow-ups
```

Follow-ups matter because a submitted partner form does not create ranking authority until it becomes a live listing, backlink, referral relationship, or documented rejection. Use the printed `marketing:mark` command to keep each row current after the second touch.

Use `/guides/restaurant-ai-phone-ordering-pos-guide/` as the default link for educational submissions, community answers, and directory listings that prefer resource content over a direct sales page.

Use `/guides/chinese-restaurant-pos-comparison/` for POS consultant outreach, restaurant technology resource pages, and conversations with no-POS owners who need a POS recommendation path before AI phone ordering.
