# Sandbox verification record

Prepared 2026-11-12. All external checks below are untested. No Sandbox credentials, sending-domain account evidence or authorized HTTPS deployment were available during local implementation. Mocked tests must not be recorded as Sandbox passes.

Before testing, record the approved preview origin, source/build identity, isolated D1 identity, Square Sandbox application ID, pinned API version, email-domain readiness and test-recipient authorization in a private record. Keep secrets and sign-in links out of that record. Use a Sandbox seller only.

| Check | Expected evidence | Result |
| --- | --- | --- |
| English and Chinese sign-in delivery | Authorized mailbox receives correct localized link; generic request response; link requires explicit confirmation | Untested |
| Challenge expiry and replay | Expired and redeemed links fail; GET/scanner visit creates no session | Untested |
| Session isolation/logout | Second account cannot access first restaurant; logout invalidates session | Untested |
| Consent | Logged-in complete profile reaches Square Sandbox with only `MERCHANT_PROFILE_READ` and forced account selection | Untested |
| Callback | Correct state succeeds once; denied/mismatched/replayed state fails safely; no code/token in redirect or logs | Untested |
| Location | Only active locations owned by this grant can be saved; state survives reload | Untested |
| Disconnect | Square grant revoked and usable local credentials cleared; failures remain retryable | Untested |
| Signed webhook | Sandbox revocation changes status; invalid signature and altered body do not | Untested |
| Renewal | Authorized invocation exercises actual Sandbox refresh, persists replacement credentials and survives subsequent location read | Untested |
| Scheduled execution | Daily Worker run appears in Cloudflare and shares preview D1/key; failures alert the operator | Untested |
| Public-file isolation | Download attempts return no backend, migration, configuration, test, private preview or secret contents | Untested |
| API and page cache/privacy | API no-store, account pages noindex/no-store/no-referrer, secure session cookie | Untested |

For each executed row, record passed or failed, timestamp, redacted evidence and an issue reference. Do not publish screenshot images containing sign-in fragments, OAuth codes, account email, seller/location identifiers or cookies. Verify production independently after approval. No real phone calls, SMS, payments or restaurant orders are needed for this onboarding test.
