# Serviio accounts and Square onboarding implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use executing-plans to implement this plan task-by-task in the current session. Keep work local until deployment is authorized.

**Goal:** Add bilingual restaurant accounts and Square connection management to the existing website, then prepare Marketplace application materials.

**Architecture:** Static account pages call same-origin Cloudflare Pages Functions. Backend modules own email challenges, database transactions, secure sessions, encrypted Square authorization, and location selection. A separate scheduled Worker shares the database for renewal because scheduled execution is a Worker responsibility.

**Tech stack:** Existing HTML and Tailwind site, JavaScript modules, Web Crypto, Cloudflare Pages Functions, D1, Cloudflare Email Service REST API, and Node's test runner. Use `/opt/homebrew/bin/node` when Node is absent from PATH.

## Execution status on 2026-11-12

Tasks 1 through 5 are implemented and verified locally. Task 6 configuration examples, safe packaging, operations guidance and Marketplace drafts are prepared. Real email delivery, Square Sandbox authorization, scheduled cloud execution and production activation remain untested. No external application has been submitted. See `docs/square/local-verification.md` for evidence and remaining requirements. Checkbox steps below retain the original execution checklist; they do not certify external checks.

## File ownership

- `account/index.html`, `zh/account/index.html`: localized account screens.
- `assets/js/account.js`, `assets/css/account.css`: customer interactions and focused styling.
- `functions/api/account/[[path]].js`: Pages adapter dispatches API requests.
- `server/account/router.mjs`: HTTP routes, authentication, same-origin enforcement, safe errors.
- `server/account/security.mjs`: random tokens, token hashing, AES-GCM encryption, secure cookies.
- `server/account/store.mjs`: parameterized D1 queries and atomic challenge consumption.
- `server/account/email.mjs`: transactional email adapter.
- `server/account/square.mjs`: scoped OAuth and Square API calls.
- `server/account/renewal.mjs`: scheduled renewal and stale connection handling.
- `workers/square-renewal.mjs`: scheduled Worker adapter.
- `migrations/0001_accounts.sql`: schema and uniqueness constraints.
- `config/account-environment.example.json`: nonsecret configuration contract.
- `docs/square/onboarding-operations.md`: setup, activation and rollback instructions.
- `docs/square/marketplace-application.md`: application facts and review materials.
- `tests/account/*.test.mjs`: offline behavior and security checks.

## Task 1: Backend security and storage

- [ ] Add tests for random challenges, hashing, authenticated encryption, wrong-key rejection, and expiry. Use Node's built-in test runner and strict assertions.

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { randomToken, hashToken, encrypt, decrypt } from '../../server/account/security.mjs';
test('stored tokens do not contain the original secret', async () => {
  const value = randomToken();
  assert.notEqual(await hashToken(value), value);
});
test('encrypted credentials round trip and reject another key', async () => {
  const key = randomToken();
  const encrypted = await encrypt('merchant-secret', key);
  assert.equal(await decrypt(encrypted, key), 'merchant-secret');
  await assert.rejects(() => decrypt(encrypted, randomToken()));
});
```

- [ ] Run `/opt/homebrew/bin/node --test tests/account/security.test.mjs`. Confirm missing implementation fails before adding it.
- [ ] Implement Web Crypto security helpers. Use 32-byte cryptographically random tokens, SHA-256 token hashes, AES-GCM with independent random IVs, and a validated 32-byte deployment key. Never log secrets.
- [ ] Create schema for accounts, sessions, restaurants, sign-in challenges, OAuth attempts, Square connections, and abuse limits. Store only hashes for session and challenge tokens. Make normalized email unique. Make Square merchant IDs unique across accounts. Add indexes on expiry and renewal due date.
- [ ] Implement prepared D1 statements and atomic single-use challenge claims. Test concurrent redemption, expired challenges, cross-account access, and merchant ownership conflicts against SQLite-compatible constraints. A successful read followed by an unconditional update is not an atomic claim.
- [ ] Rerun the focused tests. Commit only this task's explicit files.

## Task 2: Email sign-in and authenticated accounts

- [ ] Add tests for generic sign-in responses, email validation, rate limits, scanner-safe link landing, replay rejection, session expiry, logout, and missing email configuration. Mock outbound email; tests must not send real messages.
- [ ] Implement `POST /api/account/sign-in` accepting `{email, locale}`. Normalize email, enforce per-IP and per-address limits, and send a 15-minute challenge. Return the same success body for existing and new addresses. Return a service-unavailable response when delivery configuration is missing or delivery fails.
- [ ] Implement an account-page sign-in link that carries the challenge in the URL fragment. The page removes the fragment immediately and asks for explicit confirmation before `POST /api/account/verify`. A GET never consumes the challenge.
- [ ] Verify the challenge atomically. Create the account on the first verified sign-in. Issue a 7-day opaque session in a Secure, HttpOnly, SameSite=Lax cookie. Store only its hash. Set `Cache-Control: no-store` on every account API response.
- [ ] Implement `GET /api/account/me`, `POST /api/account/logout`, and `POST /api/account/restaurant`. Require authentication and exact Origin match on browser mutations. Validate restaurant name and contact fields on the server.
- [ ] Implement Cloudflare Email Service through its documented REST API. Keep the account ID, sending token, and verified sender in server environment bindings. Use fixed templates and escape user data. Allow a test-only injected sender; never expose a development sign-in link through a deployed endpoint.
- [ ] Run `/opt/homebrew/bin/node --test tests/account/auth.test.mjs` and commit explicit files after passing.

## Task 3: Square authorization and location ownership

- [ ] Add mocked tests for unauthenticated start, state mismatch, state replay, denied authorization, failed exchange, merchant ownership collision, and selecting a foreign location.
- [ ] Implement `POST /api/account/square/connect`. Require an authenticated restaurant owner and complete restaurant profile. Store a random, single-use, 10-minute OAuth state tied to that account and session. Return an authorization URL using `session=false` and only `MERCHANT_PROFILE_READ` for the initial location capability.
- [ ] Implement `GET /api/account/square/callback`. Require the matching authenticated session and atomically claim state. Exchange the code server-side. Separate Sandbox and production base URLs. Store encrypted access and refresh tokens plus expiry and renewal timestamps. Enforce merchant uniqueness before retaining the connection; do not revoke an existing merchant grant to resolve an ownership collision.
- [ ] Implement `GET /api/account/square/locations` and `POST /api/account/square/location`. Retrieve locations from the authenticated merchant and revalidate the submitted active location before storing it. Never trust a client-provided merchant ID or account ID.
- [ ] Return stable customer-facing errors and redirect callback outcomes to the account page using a fixed allowlisted path. No provider error payloads, authorization codes, or tokens appear in redirect URLs or HTML.
- [ ] Run `/opt/homebrew/bin/node --test tests/account/square.test.mjs` and commit explicit files.

## Task 4: Connection lifecycle and scheduled renewal

- [ ] Add tests for encrypted refresh-token use, renewal due after seven days, failed renewal, revoked access, disconnect failure, concurrent refresh, and signature verification against an unmodified webhook body.
- [ ] Implement idempotent renewal with a database lease so page requests and the scheduled Worker cannot refresh the same connection concurrently. Persist replacement refresh tokens atomically. Never resurrect a disconnected connection after an in-flight renewal completes.
- [ ] Expose connected, reconnect-required, renewal-failed, and disconnected status. Distinguish cached state from a provider-checked state; refresh validation on account access with a bounded timeout. Treat tokens older than eight days without successful renewal as a visible operational fault.
- [ ] Implement `POST /api/account/square/disconnect` using server-side revocation. If Square revocation fails, show a retryable failure and retain enough encrypted state to retry. Clear credentials after confirmed revocation.
- [ ] Implement `POST /api/account/square/webhook` with Square's documented signature over the configured notification URL and raw body. Handle authorization revocation idempotently. Check the current event schema before mapping merchant identity.
- [ ] Add the scheduled Worker for daily renewal. Keep its configuration separate from Pages configuration. Share only the necessary D1 binding and secrets. Include bounded batches and cleanup of expired challenges/sessions.
- [ ] Run `/opt/homebrew/bin/node --test tests/account/lifecycle.test.mjs` and commit explicit files.

## Task 5: Bilingual website screens

- [ ] Build English and Chinese account pages with existing colors and typography, proper labels, keyboard navigation, visible focus, accessible status messages, and mobile layout. Add `noindex` and `Referrer-Policy: no-referrer` to account screens.
- [ ] Add account links to `index.html` and `zh/index.html`. Preserve existing marketing copy and lead forms.
- [ ] Implement loading, sign-in requested, explicit link confirmation, authenticated profile, Square consent explanation, active location selection, connection status, reconnect, disconnect, and logout states. Use `textContent` for server-provided content. Do not insert user or provider strings as HTML.
- [ ] Prevent duplicate button submissions and preserve typed profile values on recoverable failures. Explain missing service setup accurately; never show a simulated successful Square connection as real.
- [ ] Verify sign-in controls and navigation using a local browser with mocked backend responses, then exercise the integrated local backend. Check both languages and narrow screen widths.
- [ ] Run the focused account tests and existing `validate:seo`, `validate:seo:test`, and `smoke:anchors:test` scripts using the installed Node path. Report pre-existing failures separately. Commit only the account UI and intentional homepage changes.

## Task 6: Configuration, Sandbox checks and Marketplace materials

- [ ] Add a nonsecret environment example and ignore `.dev.vars`, `.wrangler`, local database files, secret exports, and test screenshots that contain sign-in links. Do not place real resource identifiers or credentials in examples.
- [ ] Document Pages D1 binding `ACCOUNT_DB`, canonical `APP_ORIGIN`, Square environment and version, application ID/secret, redirect URL, webhook URL/signature key, token encryption key, email account/sending secret/from address, and renewal Worker bindings. Distinguish preview from production databases, secrets and Square applications.
- [ ] Document migration and activation steps without running production commands. Verify Pages output exclusions so `server/`, `migrations/`, `tests/`, private docs, and configuration cannot be downloaded from the public site. Add an explicit build-output allowlist or deployment ignore mechanism and test it before activation.
- [ ] Write an operations guide with token renewal monitoring, email delivery failures, connection revocation, encryption-key rotation, data retention, and rollback. A frontend rollback must not remove the renewal task for existing connected merchants.
- [ ] Prepare the App Partner application with verified company contacts, target industry, markets, current integration status, application ID when configured, and honestly stated adoption. Keep unverified facts as an explicit evidence checklist, never fabricated values.
- [ ] Prepare Marketplace copy, screenshots after the UI exists, reviewer instructions, support links, and privacy/terms requirements. Request the current QA checklist from Square after partner acceptance. Do not claim Marketplace approval or fixed review timing.
- [ ] Test Square Sandbox in an HTTPS preview only after credentials and preview activation are authorized. Record each of sign-in delivery, consent, callback, location selection, disconnect, webhook revocation and renewal as passed, failed or untested with evidence. Offline mocks are not Sandbox evidence.
- [ ] Complete `git diff --check`, focused account tests, existing relevant site checks, and a secrets/public-file exposure review. Present the local result and exact remaining activation prerequisites. Do not push the auto-deploying branch or submit external applications without the applicable final authorization.

## Source evidence checked 2026-11-12

- https://developers.cloudflare.com/pages/functions/bindings/
- https://developers.cloudflare.com/email-service/get-started/send-emails/
- https://developers.cloudflare.com/workers/configuration/cron-triggers/
- https://developer.squareup.com/docs/oauth-api/movetoprod
- https://squareup.com/us/en/partnerships/app-partner
- https://developer.squareup.com/forums/t/clarification-on-square-app-marketplace-submission-process-for-existing-integration/28402

Cloudflare Email Service supports transactional sending but requires sending-domain onboarding. Presence of Cloudflare DNS is not proof that the Serviio account has completed that setup. Inspect account configuration through an authorized read-only path before claiming email readiness.
