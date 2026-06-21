# Serviio Manual SERP Spot Check

Date: 2026-06-20

## Purpose

This snapshot records manual external-search evidence for the first-page SEO goal. It is not a replacement for Google Search Console, but it prevents local SEO validation from being mistaken for live ranking proof.

## Queries Checked

Exact Serviio-branded target-query searches checked in the web search tool:

- `"Serviio" "Chinese restaurant AI phone ordering"`
- `"Serviio" "MenuSifu AI phone ordering"`
- `"Serviio" "39 Miles AI phone ordering"`
- `"Serviio" "restaurant AI phone order taker"`

Broader non-branded searches checked:

- `Serviio AI phone ordering restaurant`
- `Serviio AI voice assistant restaurant orders phone`
- `site:serviio.ai serviio ai phone ordering restaurants`
- `serviio.ai restaurant POS AI phone ordering`

## Findings

- No first-page Serviio organic result was confirmed from the spot checks.
- Broad restaurant voice-AI searches surfaced adjacent restaurant voice-AI coverage and established restaurant-technology entities instead of Serviio.
- Product Hunt has a live Serviio entity page. It names Serviio as an AI voice assistant for restaurant phone orders, links to `serviio.ai`, and says Serviio sends structured orders directly to POS systems.
- The Product Hunt page is useful authority evidence only after claim/update ownership or listing proof is captured in the authority tracker.

## Current Local Evidence

- `npm run seo:coverage`: 127/127 priority queries covered.
- `npm run seo:authority`: 6/100 authority score.
- `npm run search:weekly-review -- --today 2026-06-20`: 127 watchlist rows still need Search Console data.

## Interpretation

The current bottleneck is not missing keyword coverage. The bottleneck is external proof:

1. Export fresh Google Search Console query/page data and update `docs/first-page-ranking-watchlist.csv`.
2. Complete first-hour authority actions: Google Business Profile, MenuSifu, 39 Miles/MENUPO, and pilot testimonial.
3. Claim or update the Product Hunt listing and record proof before treating it as authority evidence.
4. Use `docs/weekly-seo-review.md` after each export or authority update to decide whether the next task is indexing, authority, CTR rewrite, or near-page-one support.

## Source Notes

- Product Hunt live page checked: `https://www.producthunt.com/products/serviio`
- The Product Hunt page currently shows Serviio, a `Visit website` link to `serviio.ai`, the AI Voice Agents category, and restaurant/POS positioning.
