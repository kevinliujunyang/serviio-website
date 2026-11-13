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
