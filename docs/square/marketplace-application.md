> Capability update, 2026-11-13: the draft below describes the initial location-only release. The website commerce phase now requests menu, order and hosted-checkout permissions and implements server APIs and a read-only menu preview. See [commerce-api.md](commerce-api.md). Live transaction qualification and a revised Marketplace listing are required before submission; this historical draft must not be submitted unchanged.

# Square App Partner application draft

Prepared 2026-11-12. Internal preparation only. Nothing has been submitted or approved. Do not accept a partnership agreement or submit this draft without the owner's review and authorization.

The [current Square partner page](https://squareup.com/us/en/partnerships/app-partner) asks for contact name, email, company, website, integration status, application ID if integrated, industry, markets, current customer count and an app description. Its application is selective. Square controls evaluation, agreement, listing requirements and publication timing. Confirm the current submission path and obtain Square's applicable QA checklist after acceptance; this pack is not that checklist.

## Verified and pending application fields

| Field | Draft / evidence |
| --- | --- |
| Product name | Serviio, as used by the existing site. Legal company name remains unverified. |
| Website | https://serviio.ai, identified in repository `AGENTS.md` and website metadata. |
| Product/support email | info@serviio.ai, present in both homepage sources. Confirm monitored support coverage before submitting. |
| Product telephone | (408) 409-9079, documented in site `AGENTS.md`; confirm suitability as partner/support contact. |
| Applicant first/last name and role | Pending owner confirmation. Do not infer a legal applicant from the repository path or Git identity. |
| Legal company name, address and jurisdiction | Pending legal/company records and authorized signatory. |
| Industry | Proposed: restaurants / food and beverage, consistent with the current website. Select the matching current form option. |
| Markets | Pending owner confirmation and actual operational support evidence. A US-focused website does not establish every market served or supported Square country. |
| Square App ID | Not configured or verified in this workstream. Retrieve the correct production ID securely before submission. The app ID is not the app secret. |
| Currently integrated with Square | Local onboarding implementation only. Sandbox, production adoption and Marketplace QA remain unverified. Do not answer as a completed live integration. |
| Current customers/businesses | Unverified. Obtain an auditable, dated count and distinguish all Serviio customers from Square-connected businesses. Do not report an inferred number or zero as a verified count. |
| Pricing | Website states 2% per completed order and no monthly/setup fee. Confirm actual commercial terms and any Marketplace requirements before listing. This connection-only release does not calculate or collect that fee. |

## Proposed application description

Serviio develops AI phone ordering for restaurants. We are adding an authenticated restaurant onboarding flow that lets an owner authorize a Square connection, choose an active Square location and manage connection status. The current Square capability requests read access to merchant profile information for location discovery. It does not synchronize menus, submit orders, accept payments or activate phone ordering. We want to work with Square on a qualified restaurant integration and an accurate Marketplace listing as those capabilities become ready.

This draft describes the local implementation. Replace its readiness statement only after the relevant Sandbox and production evidence exists.

## Permissions explanation

The initial permission is `MERCHANT_PROFILE_READ`. Serviio uses it to retrieve the seller's authorized locations and validate the owner's selected active location. Tokens remain encrypted on the backend, and the owner can disconnect. Additional catalog, order, customer or payment permissions require a separately implemented and reviewed capability and renewed consent where necessary. No future-use scopes belong in the initial application. Never request seller personal access tokens. [Square's production OAuth requirements](https://developer.squareup.com/docs/oauth-api/movetoprod) require authenticated platform accounts and in-scope permissions.

## Draft listing copy

Proposed title: Serviio

Proposed short description: Connect a Square restaurant location to your Serviio account.

Proposed detailed description: Sign in to your Serviio restaurant account, add your restaurant details and authorize read access to your Square locations. Choose an active location and view connection status from your account page. Reconnect or disconnect when needed. This release prepares your restaurant account for Serviio onboarding. Connecting Square alone does not turn on phone ordering, menu synchronization, order submission, payments or kitchen printing.

Proposed support URL: https://serviio.ai/#message. This is an existing inquiry form, not a verified support SLA. Confirm that the form can support integration customers and supply any dedicated support URL required by Square.

Account entry URLs after authorized deployment: https://serviio.ai/account/ and https://serviio.ai/zh/account/. These are planned activation URLs; publication has not been verified.

## Legal and listing evidence still required

- Confirm legal company identity, authorized signatory, applicant contact and supported markets.
- Confirm current application ID, integration status and dated adoption counts with primary records.
- Complete `sandbox-verification.md`, record production qualification separately and obtain the current Square review requirements.
- Provide owner-approved privacy policy and terms URLs covering account/contact data, sign-in delivery, Square permissions and tokens, subprocessors, retention, deletion requests, support and disconnection. Repository inspection found no dedicated terms or privacy page. Marketing inquiry text does not supply these policies. This pack creates no legal terms, consent or retention commitments.
- Review existing marketing claims and pricing against the qualified capability. Do not imply that this location-only release provides working Square order submission or payments.
- Supply approved logo/listing art and accurate screenshots from the implemented UI. Capture sign-in, explicit email-link confirmation, profile, consent explanation, location selection, connection status and disconnect in English and Chinese. Keep account information and authorization URLs out of images. The existing `assets/logo.svg` is an available source asset, not proof it meets Square's current artwork specifications.
- Supply reviewer access using an authorized test mailbox and Square Sandbox seller. Never place real credentials or sign-in links in this repository. Keep the private reviewer handoff separate from public listing copy.

## Reviewer procedure

Use the qualified HTTPS preview and the private test-access handoff. Open the account page, request a sign-in email, follow the link and explicitly confirm it. Save a complete restaurant profile, review the permissions explanation and connect the supplied Square Sandbox account. Select an active location, reload to confirm persistence, and verify status. Disconnect and verify the revocation outcome. Repeat the customer path in Chinese. Test denied consent and a reused sign-in link; each must give a recoverable message. Follow the private operator procedure for webhook and scheduled refresh evidence. These instructions are proposed for review; no reviewer credentials or completed external results are included.

Ask Square whether the connection-only capability is eligible for a listing before representing it as a finished restaurant ordering integration. Keep any subsequent menu/order scope and claims aligned with tested behavior.
