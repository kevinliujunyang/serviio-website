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

Saved production ACCOUNT_DB binding to this database and APP_ORIGIN. These settings require a new Pages deployment to become active. Runtime validation and final deployment identity will be recorded after deployment.

## Resend

Updated the server email adapter to support explicit EMAIL_PROVIDER=resend, a verified bare EMAIL_FROM address and server-only RESEND_API_KEY. The default Cloudflare adapter remains supported. No email credentials are stored in this document or source control.

The user chose to sign in to Resend personally because account sign-in accepts Resend's terms. Domain verification, a scoped sending key and an authorized mailbox delivery test remain pending. Proposed sender subdomain is auth.serviio.ai; actual DNS records must come from the authenticated Resend dashboard. Do not replace existing root-domain MX records. Keep click/open tracking disabled for authentication mail.

Square authorization remains unconfigured and unverified. Database readiness alone does not establish working email sign-in or Square integration.
