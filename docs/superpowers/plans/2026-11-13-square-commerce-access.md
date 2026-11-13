# Square commerce access implementation plan

> Use subagent-driven-development for the isolated provider task, with controller integration and independent review. User approved website API connection first and Square-hosted checkout. Live grants require owner approval. No live orders or payments are authorized for testing.

**Goal:** Connect menu, orders and hosted-checkout permissions to the website, verify actual grants, expose authenticated APIs bound to the saved restaurant location, and show honest readiness.

**Architecture:** Existing D1 sessions and encrypted Square connection remain the authority. Introspect token permissions without trusting the requested scopes. Read catalog and submit hosted checkout through server-only Square adapters. Checkout creates its own order in one idempotent call. No card data or client-provided prices enter Serviio.

**Tech stack:** Existing Cloudflare Pages Functions, JavaScript modules, D1, node:test, Miniflare/workerd.

## 1. Permissions and verification

Files: server/account/square.mjs; tests/account/provider.test.mjs.
- [x] Write failing tests for exact six scopes and token status identity/schema checks.
- [x] Export SQUARE_SCOPES = ['MERCHANT_PROFILE_READ','ITEMS_READ','ORDERS_READ','ORDERS_WRITE','PAYMENTS_READ','PAYMENTS_WRITE']; use joined scope in authorizationUrl.
- [x] Export squareRequest(env,path,body,accessToken,fetcher=fetch), using fixed configured provider origin and manual redirects.
- [x] Add retrieveTokenStatus(env,accessToken,merchantId,fetcher=fetch), POST /oauth2/token/status, and require matching client_id, merchant_id, string scopes. Return only granted/missing scopes and capability booleans.
- [x] Run provider tests, preserving legacy grant behavior as explicit missing scopes.

## 2. Catalog and commerce adapter

Files: new server/account/commerce.mjs; tests/account/commerce.test.mjs.
- [x] Implement listMenu, calculateCheckout, createCheckout, getOrder and getPayment through squareRequest. Keep caller prices and location overrides out of provider payloads.
- [x] Validate catalog identity, presence, prices and modifier requirements before quote/checkout. Reject unsupported catalog semantics.
- [x] Require a stable idempotency key, positive bounded quantities and ASAP pickup buyer details. CreatePaymentLink creates the order and hosted link together.
- [x] Assert selected-location isolation for order/payment lookup; verify redirect URLs stay on Square.
- [x] Run adapter tests with mocked outbound services only.

## 3. Authenticated website routes

Files: server/account/router.mjs; tests/account/integration.test.mjs.
- [x] Add GET square/permissions and square/menu; GET square/order and square/payment by id; POST square/quote and square/checkout.
- [x] Reuse authenticated activeConnection and token decryption. Introspect permissions and verify merchant/app identity for each commerce operation. Require a saved active location for catalog/commerce.
- [x] Missing grants return permissions_required, HTTP 409. No scopes are inferred from a successful reconnect.
- [x] Add account isolation, missing-grant, invalid-location and idempotency behavior tests. No production provider mutation is executed by tests.

## 4. Account UI

Files: assets/js/account.js; account/index.html; zh/account/index.html; assets/css/account.css; tests/account/ui.test.mjs.
- [x] Replace read-only consent copy with explicit menu, order and hosted-payment scope descriptions in English/Chinese.
- [x] Add a permissions refresh button and capability status. Reconnect is necessary when grants are missing.
- [x] Add read-only menu loading with cursor continuation and safe text rendering. Avoid adding a public order/payment submission button in this account setup phase.
- [x] Show API access status separately from voice-order activation and tested payment behavior.
- [x] Run UI tests; retain Saved/Save changes behavior and versioned no-store assets.

## 5. Review and release

- [x] Review spec compliance, then security/correctness; resolve findings.
- [x] Run node --test tests/account/*.test.mjs and npm run build:pages. Verify private files excluded and git diff --check clean.
- [ ] Integrate only scoped changes into main; preserve existing untracked notes. Deploy the authorized website work.
- [ ] Verify deployed UI and reconnect request scopes. Have owner review and approve expanded Square consent. Inspect actual returned grants and perform read-only menu retrieval.
- [ ] Report exact result, empty catalog if present, and untested live order/payment boundaries. Document setup and API examples without secrets.
