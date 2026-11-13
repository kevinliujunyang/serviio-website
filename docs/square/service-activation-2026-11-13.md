# Account service activation on 2026-11-13

The user selected Cloudflare D1 for website accounts and Resend for free transactional sign-in email. Existing Google Cloud restaurant databases are outside this change.

## D1

- Cloudflare account: `7b0c0394f09aba9d35662a0a62d4f7f9`.
- Database: `serviio-accounts-production`.
- Database ID: `8ac5ba86-4231-41c9-8101-fcfa25595f42`.
- Target production Pages project: `serviio-website`.
- Runtime binding: `ACCOUNT_DB`.
- Canonical `APP_ORIGIN`: `https://serviio.ai`.
- Initial free-plan dashboard showed zero of ten databases in use, with 5M rows read/day, 100k written/day and 5GB total storage. No plan upgrade was selected.

Applied the repository's `migrations/0001_accounts.sql` through the new database's SQL console. Verified all seven application tables by querying `sqlite_master`: accounts, account_sessions, restaurants, signin_challenges, oauth_attempts, square_connections and account_rate_limits. No customer records were imported or created. Cloudflare's internal `_cf_KV` table is separate from the application schema.

Saved production ACCOUNT_DB binding to this database and APP_ORIGIN. These settings are active in production. The account endpoint returns HTTP 401 authentication_required without a session, rather than configuration_unavailable. This read-only check does not establish email delivery or successful sign-in.

## Resend

Updated the server email adapter to support explicit EMAIL_PROVIDER=resend, a verified bare EMAIL_FROM address and server-only RESEND_API_KEY. The default Cloudflare adapter remains supported. No email credentials are stored in this document or source control.

The user signed in to Resend personally. With explicit approval, added the dashboard-provided DKIM TXT record at resend._domainkey.auth and DNS-only CNAME records rsend.auth -> rsend.forge.rmta.net and send.auth -> send.forge.rmta.net. Public DNS resolved all three; Resend reported auth.serviio.ai Verified. Existing root-domain mailbox records were preserved. Tracking was not enabled.

Production EMAIL_PROVIDER=resend and EMAIL_FROM=signin@auth.serviio.ai are saved. Created serviio-accounts-production and, at the user's request, replacement serviio-accounts-production-v2, each with Sending access restricted to auth.serviio.ai. The user handled secret entry; Cloudflare shows RESEND_API_KEY saved as a Secret. Secret contents were not inspected or recorded. The original key has not been revoked.

Retried production commit 648816ea2201fc4fe2576e1e669f750b3681dc19 after saving configuration. Cloudflare reported deployment 215719be-6cc5-4d8a-ac82-7607d120bf26 successful in 36 seconds on 2026-11-13. Email delivery and end-to-end sign-in remain unverified pending an authorized recipient. Automatic approval review rejected the proposed POST to delivered@resend.dev because the recipient and test message were not explicitly authorized; that POST was not executed.

Square authorization remains unconfigured and unverified. Database readiness alone does not establish working email sign-in or Square integration.

## Sign-in runtime failure investigation

Two approved diagnostic attempts returned HTTP 503 email_unavailable. After safe diagnostics were deployed as commit 98655ff, the live event classified the failure as transport, before any provider response; Resend had no matching logs. The provider adapters used redirect: error. Cloudflare documents this mode as unsupported and throwing during Request construction before a network request is sent: https://developers.cloudflare.com/workers/runtime-apis/request/.

Reproduced the failure in local workerd via the installed Miniflare runtime with all outbound requests mocked. The same setting affected both email and Square adapters. Changed both to redirect: manual; existing non-success response checks reject redirects without forwarding credentials. New runtime regression tests verify accepted provider responses and refusal to follow a redirect for each adapter. All 75 account tests passed. Earlier Node-only fetch mocks incorrectly accepted the unsupported mode, so their passing results did not establish Cloudflare runtime compatibility. Live post-fix delivery remains pending.

## Post-fix production verification

Cloudflare deployment c65c3c37-6ed3-4fb1-960d-caba3c65a30f of commit 2e17723c96e12cc48e6455e918405ff72cedb552 completed successfully in 25 seconds. With explicit approval for one final link to the user's chosen mailbox, POST /api/account/sign-in returned HTTP 200 {"ok":true} at 2026-11-13T22:00:29Z. Resend's Emails dashboard reported Delivered for message 01a1d6ed-2887-70bf-992c-a6d697e838b0, subject Sign in to Serviio. This confirms provider delivery after the runtime fix. The user still needs to open the email and explicitly confirm sign-in; inbox placement and completed browser session were not verified by the agent. No sign-in token or API credential was inspected or recorded.

## Restaurant feedback and Square setup state

Production variable names were inspected after the user reported a failed Square connection: APP_ORIGIN, EMAIL_FROM, EMAIL_PROVIDER and RESEND_API_KEY were present, but Square application configuration and TOKEN_ENCRYPTION_KEY were absent. The connect handler checks encryption before generating an authorization URL, so this deployment cannot start Square OAuth. Sign-in and profile persistence are separate and remain usable.

The account response now includes a boolean square_configured after validating local Square configuration and encryption readiness, without sending provider requests or exposing credentials. The page explains missing Square setup beside the disabled connection button instead of mislabeling it as an account outage. Square connection errors remain next to their button. Restaurant save feedback shows Saving, Saved, or Save changes according to the last confirmed server snapshot, including edits during a pending save. English and Chinese variants are covered. All 81 account tests passed; Square OAuth remains unconfigured.
