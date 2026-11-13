# Square menu, orders and hosted checkout

This website API phase uses the restaurant owner's existing Serviio session and selected Square location. It does not wire the voice agent, send payment links to customers, collect card data, configure kitchen printing, or prove production payment completion. No live orders or payments were placed during implementation.

## Authorization

Reconnect Square to request `MERCHANT_PROFILE_READ ITEMS_READ ORDERS_READ ORDERS_WRITE PAYMENTS_READ PAYMENTS_WRITE`. An earlier location-only token does not gain these scopes automatically. Owners review and approve the expanded request at Square. **Check API access** calls Square's token-status endpoint and verifies the returned application and merchant before reporting actual permissions. No scope is inferred from a successful redirect.

The account page can read a paginated menu after menu permission and a saved active location are verified. Empty catalog results mean no matching menu data was returned; they do not establish support for a production restaurant menu.

## Authenticated endpoints

All endpoints are under `/api/account/`, require the secure Serviio session, and return `Cache-Control: no-store`. POST requests require `Origin: https://serviio.ai` and `Content-Type: application/json`. Never put session cookies, access tokens, authorization codes or sign-in links in a public document.

| Method and path | Purpose | Side effects |
| --- | --- | --- |
| GET `square/permissions` | Verify actual grants | Read only at Square |
| GET `square/menu?cursor=...` | Selected-location catalog page | Read only at Square |
| POST `square/quote` | Calculate a catalog-backed order | No persisted Square order |
| POST `square/checkout` | Create one order and its hosted payment link together | Creates Square order and checkout link |
| GET `square/order?id=...` | Read order state for the selected location | Read only at Square |
| GET `square/payment?id=...` | Read payment state for the selected location | Read only at Square |

Menu objects include items/variations, modifiers, categories, taxes, discounts and images. Deleted and location-absent objects are excluded. Prices remain Square catalog data; reading this API is not an inventory reservation or proof of current kitchen availability.

### Quote and checkout input

```json
{
  "idempotency_key": "stable-owner-intent-0001",
  "line_items": [
    {
      "catalog_object_id": "SQUARE_VARIATION_ID",
      "quantity": 1,
      "modifiers": [{"catalog_object_id": "SQUARE_MODIFIER_ID", "quantity": 1}],
      "note": "Optional preparation note"
    }
  ],
  "buyer": {"name": "Customer name", "phone": "+14085550100"}
}
```

Use actual authorized catalog IDs. Buyer is optional for quote and required for checkout. Quantities are integers 1–99. The idempotency key must contain 16–64 letters, numbers, hyphens or underscores and stay the same when retrying the same intent. Do not generate a new key after a timeout. A changed intent requires a new key. Square may reject reuse with changed order data; do not retry by silently changing the key.

The backend rejects client-supplied prices, currency, totals, location IDs and arbitrary Square payload fields. It validates available catalog variations and basic modifier requirements, uses catalog pricing and automatic catalog taxes, and disables automatic discounts. Unsupported variable/measurement pricing, complex/default modifier behavior and non-restaurant pickup products fail rather than guessing. Inventory reservations, stock counts, preparation hours and merchant printer routing are not implemented here.

Hosted checkout creates the order itself. Do not call a separate CreateOrder first. The result is `{id, order_id, url}` with a trusted Square-hosted URL. The pickup is ASAP with the supplied customer name and E.164 phone; this does not promise a preparation time. There is no application fee in the payload and no Serviio card-entry form. The account setup page intentionally has no live order/payment submission button.

Immediately before sending CreatePaymentLink, an account/version/location/session-bound database lease prevents a concurrent logout, changed location or disconnect from silently submitting against stale ownership. Disconnect and location changes return a retryable busy result while the submission is in flight. The lease is released after the receipt or failure. External revocation can still race with a remote request; provider receipts and the original idempotency key determine the actual outcome.

A checkout URL or return redirect is not evidence of payment. Use Square order/payment readback and require the expected order, location and final payment status before treating a purchase as paid. Payment-event webhooks and fulfillment completion automation are future integration work. OAuth-revocation webhook and scheduled token-renewal infrastructure must be qualified separately before general availability.

## Verification boundary

Tests use local SQLite and mocked/intercepted outbound requests, including workerd. They verify scope/identity checks, missing grants, account and location isolation, idempotent request construction, catalog/modifier validation, stale-session checks, disconnect coordination and redirect rejection. They do not establish Square Sandbox transaction success, production settlement, POS visibility, receipts, kitchen printing or handset/voice behavior.

Before a live transaction test, obtain explicit authorization identifying the merchant, items, buyer, amount and test action. This implementation does not authorize that test. Keep Marketplace claims limited to capabilities actually qualified.

## Primary sources checked 2026-11-13

- [OAuth permissions](https://developer.squareup.com/docs/oauth-api/square-permissions)
- [Token status](https://developer.squareup.com/reference/square/oauth-api/retrieve-token-status)
- [Catalog listing](https://developer.squareup.com/reference/square/catalog-api/list-catalog)
- [Modifier-list item overrides](https://developer.squareup.com/reference/square/objects/CatalogItemModifierListInfo)
- [Hosted checkout creation](https://developer.squareup.com/reference/square/checkout-api/create-payment-link)
- [Checkout lifecycle pitfalls](https://developer.squareup.com/docs/checkout-api/common-pitfalls)
