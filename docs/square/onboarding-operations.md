# Account and Square operations

Prepared 2026-11-12. Local implementation and offline checks do not establish email delivery, Square Sandbox success, or production readiness. Resource creation, deployments, customer emails, real merchant authorization, orders, and partnership submission need separate authorization.

## Local preview

Use the installed development dependencies and run these commands from the website root:

```sh
npm run build
npm run db:account:local
npm run dev:account
```

Open `http://127.0.0.1:8788/account/` or `/zh/account/`. The checked-in local configuration uses a synthetic database ID, a local persistent database and no email or Square credentials. The scripts explicitly use local mode. The pages render and the account API reports missing delivery configuration honestly. This preview cannot complete real email sign-in or Square authorization without separately configured services. Do not add production credentials to this local example. The automated account tests exercise full flows with synthetic email and Square responses. They require a Node version with `node:sqlite`, such as the installed Node 25.

## Environment contract

Use `config/account-environment.example.json` as a reference, not an importable deployment configuration. Configure preview and production separately. Never share their databases, email test recipients, Square applications, webhook secrets, or encryption keys.

| Setting | Setup |
| --- | --- |
| `ACCOUNT_DB` | Pages D1 binding containing `migrations/0001_accounts.sql`; renewal Worker binds the same environment database. |
| `APP_ORIGIN` | Exact canonical HTTPS origin without a trailing slash or path. Use a stable preview hostname because OAuth and webhook URLs must match. |
| `SQUARE_ENVIRONMENT` | `sandbox` for preview; `production` only after qualification and authorization. |
| `SQUARE_APP_ID` | Corresponding Square application ID, not a seller personal access token. |
| `SQUARE_APP_SECRET` | Secret for that application and environment. |
| `SQUARE_API_VERSION` | Verified supported `YYYY-MM-DD` version. Pin consistently in Pages, Worker, and webhook subscription; review release notes before upgrading. |
| Redirect URL | Register `APP_ORIGIN/api/account/square/callback` in the correct Square application environment. |
| `SQUARE_WEBHOOK_URL` | Exact externally configured `APP_ORIGIN/api/account/square/webhook`, including its path and trailing-slash choice. The signature uses this exact URL and unmodified request body. |
| `SQUARE_WEBHOOK_SIGNATURE_KEY` | Secret from the matching webhook subscription for `oauth.authorization.revoked`. |
| `TOKEN_ENCRYPTION_KEY` | Independent cryptographically random 32-byte key encoded as base64url. Store in a secret manager and back it up securely. Pages and renewal Worker must use the same key within one environment. |
| `EMAIL_PROVIDER` | `resend` for the selected free-tier sender. `cloudflare` or an unset value preserves the original Cloudflare adapter. Unknown values fail closed. |
| `RESEND_API_KEY` | Resend sending-only server secret, scoped to the verified sending domain when available. Never expose it in the browser. |
| `EMAIL_ACCOUNT_ID` | Only for the Cloudflare alternative. Account with Email Service sending access. |
| `EMAIL_API_TOKEN` | Only for the Cloudflare alternative. Server secret with Email Sending permission. |
| `EMAIL_FROM` | Bare email address on the selected provider's verified domain. For Resend, verify the sending subdomain and keep click/open tracking disabled. Confirm provider permission and actual delivery to the authorized test mailbox. |

Never paste credentials in chat, track `.dev.vars`, dump tokens, or save sign-in links in screenshots or logs. The public site contact `info@serviio.ai` is verified from the website source; it does not prove Email Service onboarding or sending authorization.

## Packaging and activation sequence

1. Review the local diff and run account tests, existing site checks, and `npm run build:pages`. The build command compiles CSS and writes the allowlisted static site to `public-dist`. The default `npm run build` must use this packaging flow too.
2. Before any branch push, confirm deployment controls. This repository auto-deploys on push. Its previous output was the repository root. Set the Pages build command to `npm run build:pages` and output directory to `public-dist` as part of an authorized activation. Do not deploy backend source while output remains `.`.
3. The builder publishes tracked marketing pages listed in `sitemap.xml`, public tracked assets and SEO metadata, plus explicit account screens and assets. It excludes `server/`, `migrations/`, `tests/`, `docs/`, `config/`, `workers/`, dependencies, dot files and private `preview.html`. New marketing pages need both sitemap and Git inclusion. New account files need deliberate builder review.
4. Keep `functions/` in the repository root for the Pages Functions build. Its imports of `server/account/*` are bundled server-side. Neither directory belongs in static output. `_routes.json` in `public-dist` limits Functions invocation to `/api/account/*`. `_headers` protects static account screens; API code must set its own no-store and referrer headers because static header rules do not apply to Function responses.
5. `.pagesignore` is secondary protection for accidental root uploads. Do not rely on ignore semantics or headers as access control. Inspect the actual output and bundle before activation. After authorized preview deployment, request representative private paths and confirm that no source, secret or private content is returned. Pages may return the public homepage for unknown paths, so a `200` alone does not prove exposure or exclusion.
6. After authorized resource setup, apply the migration to the isolated preview D1 database, configure Pages bindings and secrets, and register the preview redirect and webhook in Square Sandbox. Back up any existing database before migration. Do not point preview at production D1.
7. Copy `config/renewal-worker.example.toml` to an ignored local configuration. Replace placeholders, bind preview D1, and set only its required Square secret and encryption key through secret tooling. Its `main` path is relative to the config file, so retain it under `config/` or adjust the path. Publish and enable the daily scheduled Worker only when authorized. Scheduled triggers are separate from Pages Functions.
8. Run the Sandbox procedure in `sandbox-verification.md` with explicitly authorized email recipients and a Sandbox seller. Save redacted outcomes, build identity, configuration fingerprint and timestamps. Qualify production separately with its own application and credentials.

## Renewal and incident response

The scheduled Worker calls the shared renewal module. A database lease limits concurrent renewal, and renewal updates must preserve disconnect/revocation decisions. The current batch limit is 100 connections per run. Monitor due backlog and increase authorized schedule frequency before volume exceeds a daily batch. A due backlog above 100 requires a schedule/capacity review before activation at that scale. Retry ordering must give other due connections a turn when earlier connections fail. Page access is not a substitute for a functioning schedule. Keep `APP_ORIGIN` configured on the Worker because its shared Square configuration validates the canonical origin even for refresh.

Square recommends renewing within seven days and detecting tokens older than eight days. Monitor cron execution and its processed, renewed, failed and skipped counts, renewal timestamps, connection status, provider errors and email delivery failures. Configure an operator alert for missed daily runs, failed batches, and any renewable connection older than eight days. Alerting infrastructure is an activation prerequisite; these documents do not create alerts. Do not log tokens, authorization codes, sign-in URLs, cookies, raw email payloads or full webhook bodies.

For email failures, check the selected EMAIL_PROVIDER, required server secret, verified sender, quota, suppression and provider response through an authorized account view. Resend acceptance returns a message ID; it does not prove receipt in the mailbox. Resend Free currently allows 100 emails/day and 3,000/month, and quota failures must remain visible and retryable. Cloudflare sending to arbitrary customers requires Workers Paid, so its routing-only free tier is not a substitute for the selected free transactional sender. Customers should see an unavailable or retryable state. Never expose a debug sign-in link to bypass delivery.

For a renewal failure, inspect redacted status and age, correct configuration, and retry through the leased workflow. Revoked or invalid grants require the owner's reconnect. Never restore a token backup over a disconnected merchant. For webhook failures, check the exact URL, raw-body signature and matching subscription key; an unverified event must not change connection ownership or status.

Disconnect must revoke at Square before clearing usable local credentials. A provider failure requires a retry and retained encrypted state. The application does not activate voice service, catalog synchronization, payment collection, kitchen printing or order submission when a location is selected.

## Retention and key changes

The renewal cleanup removes expired sessions, sign-in challenges, OAuth attempts and expired abuse-limit rows. Account/profile records need an approved retention and deletion policy before general availability. No retention period or contractual deletion promise is established by this implementation. A verified support request must reconcile account ownership, revoke the merchant connection, remove authorized records and address backups according to an approved policy. Do not promise immediate backup erasure.

The current encryption format has no multi-key rotation mechanism. Replacing `TOKEN_ENCRYPTION_KEY` directly makes existing tokens unreadable. For an authorized rotation, pause new connections and scheduled renewal, back up encrypted records and the old key, decrypt and re-encrypt all applicable rows in a reviewed migration, verify counts and decryptability, update Pages and Worker together, then resume and verify renewal. If the key is compromised, follow incident response and revoke affected grants rather than treating re-encryption as revocation. This change does not implement a rotation migration.

## Rollback

Keep the qualified source/build identity, migration history, binding configuration and protected key backup. Disable new connection entry if necessary, while preserving support and disconnect access. A frontend rollback must keep the renewal Worker and secrets for existing connections. Do not roll the database back destructively or remove encrypted records to recover a static page. Restore a compatible frontend/API release, retain schema compatibility, and verify existing account access, status, renewal and disconnect in the authorized environment. If all integration service must stop, coordinate grant revocation and owner communication through a separately authorized procedure.

## Primary sources checked 2026-11-12

- [Pages routing](https://developers.cloudflare.com/pages/functions/routing/) documents `_routes.json` and Functions directory routing.
- [Pages serving behavior](https://developers.cloudflare.com/pages/configuration/serving-pages/) documents unknown-route fallback.
- [Cloudflare email setup](https://developers.cloudflare.com/email-service/get-started/send-emails/) requires domain onboarding before transactional sending.
- [Email Sending REST API](https://developers.cloudflare.com/email-service/api/send-emails/rest-api/) describes the delivery response, including queued, delivered and permanent-bounce outcomes. Accepted or queued status alone does not prove receipt in the destination mailbox.
- [Square production OAuth](https://developer.squareup.com/docs/oauth-api/movetoprod) covers authenticated sellers, limited permissions, encrypted server tokens and renewal.
- [Square API versioning](https://developer.squareup.com/docs/build-basics/versioning-overview) explains explicit version pinning.

Provider documentation was reviewed; this does not establish that this Cloudflare account or Square application is configured.

## Resend sources checked 2026-11-13

- https://resend.com/docs/api-reference/emails/send-email
- https://resend.com/docs/api-reference/introduction
- https://resend.com/docs/knowledge-base/account-quotas-and-limits
- https://resend.com/docs/dashboard/domains/introduction
- https://developers.cloudflare.com/email-service/platform/pricing/

Production D1 activation progress is recorded separately in `service-activation-2026-11-13.md`. Email sign-in remains unqualified until provider configuration and a real authorized mailbox test complete.

## Website commerce API phase

The location-only capability descriptions in the initial onboarding record are historical. Current website permissions, menu preview, authenticated order/hosted-checkout APIs, limitations and qualification boundaries are specified in [commerce-api.md](commerce-api.md). Existing owners must reconnect and approve the expanded request; verify actual scopes rather than treating connection status as permission evidence. Do not claim live ordering/payment completion from offline tests.
