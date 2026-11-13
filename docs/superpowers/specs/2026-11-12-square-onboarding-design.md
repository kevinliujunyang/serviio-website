# Serviio restaurant accounts and Square onboarding

Date: 2026-11-12
Repository: /Users/kevin/Downloads/Serviio/serviio-website
Status: Approved in conversation and implemented locally. External service setup and qualification remain pending.

## Objective and approved scope

Build restaurant signup, sign-in, and Square authorization into the existing Cloudflare-hosted Serviio website. Prepare the Square App Partner application and Marketplace listing in the same workstream, after the website flow is ready. Marketplace publication depends on Square's acceptance and QA.

The repository currently contains a static bilingual website, Tailwind build scripts, and Formspree lead forms. The inspected repository has no existing authentication service, Pages Functions directory, or Square connection implementation. Existing marketing pages and lead forms remain part of the site.

## Approach

Use the existing Cloudflare Pages site, with server endpoints for accounts and Square OAuth. Use a Cloudflare database binding for account, session, restaurant, and integration records. A scheduled backend task manages token renewal. Email delivery uses a server-side adapter whose provider credentials must be configured before real sign-in can work. Implementation planning must verify current Pages, database, scheduling, and email capabilities before selecting bindings or creating resources.

Alternatives considered: a managed authentication provider would reduce account implementation work but add another service and configuration dependency. A separate application host would split deployment and operations. The approved direction is to extend the existing Cloudflare site.

## Customer flow

1. An English or Chinese navigation link opens the restaurant account page.
2. The owner supplies an email address and receives a short-lived sign-in link. A first verified sign-in creates the account. Public responses do not reveal whether an email already has an account.
3. An authenticated owner supplies restaurant name and contact information.
4. The owner clicks Connect Square and sees what access Serviio requests.
5. Square handles the owner's Square login and authorization. The callback verifies a single-use state value tied to the authenticated account before exchanging the code on the server.
6. Serviio retrieves authorized locations. The owner chooses an active location for the restaurant. The server validates that the location belongs to this connection.
7. The account page displays connection status, selected location, and reconnect or disconnect actions. Incomplete authorization, denied access, expired links, revoked tokens, and unavailable services have recoverable messages.

An authorized Square connection does not by itself activate voice ordering, payments, kitchen printing, or order submission.

## Server responsibilities and data

Store accounts, restaurant ownership, hashed session tokens, hashed single-use email challenges with expiry, OAuth attempts, encrypted Square tokens with renewal metadata, and the chosen Square location. Never return Square tokens to the browser. Keep encryption and provider secrets outside the database and source control. Bind records and all account operations to server-verified ownership.

Use HTTPS, secure HttpOnly cookies, session expiry and logout, same-origin checks on mutations, redirect allowlists, request limits, and single-use authorization challenges. Avoid secrets and sign-in links in logs. Email challenge consumption must resist automatic email-link scanners, for example by requiring an explicit confirmation action before creating the session.

Request only scopes used by the implemented flow. The first phase retrieves locations and validates the connection. Additional menu or order permissions belong to a separately implemented capability. No payment or order-writing permission is requested merely for future use.

Token exchange, encryption, renewal, and revocation happen on the backend. Renew tokens at least as frequently as Square recommends and expose stale or failed renewal status. Verify revocation events before changing connection state. Disconnect revokes Square authorization and removes usable stored credentials. Prevent a second account from silently taking ownership of an existing merchant connection.

## Verification and readiness

Use offline tests with mocked email and Square services for challenge expiry and replay, session isolation, unauthorized access, OAuth state mismatch and replay, callback errors, token encryption, token renewal, revocation, and location ownership. Exercise English and Chinese customer flows locally. Run existing site validation appropriate to changed pages.

After credentials and environment configuration are available, verify the full flow in Square Sandbox and an HTTPS preview environment. Report offline tests and Sandbox results separately. No claim of production readiness follows from mocked success alone.

Before activation, document required database bindings, email delivery credentials, encryption secret, Square application IDs and secrets, redirect URLs, webhook settings, scheduled renewal configuration, and rollback steps. Missing configuration must produce a clear unavailable state rather than a fake successful connection.

## Marketplace work in the same project

After the site is testable, assemble the App Partner application with company contact details, website, Square application ID, target markets, restaurant use case, and accurately stated customer adoption. Prepare listing copy, product screenshots, onboarding instructions, support contact, privacy and terms pages, requested-permission explanations, and a reviewer test procedure. Treat these materials as a preparation checklist, not a claim that Square has supplied a complete final QA checklist.

The published Square process is partner application, evaluation, signed agreement, Marketplace submission, then QA. Square chooses acceptance and publication timing. Check current submission requirements again before submitting. Do not fabricate customers, completed integrations, results, or approval status.

## Execution boundaries

Implementation and local verification are authorized. This scope confirmation does not authorize pushing the auto-deploying website, creating paid resources, sending customer emails, authorizing a real merchant account, submitting production orders, or accepting partnership agreements. Prepare reviewable application materials before any external submission. Use existing approved credentials through a secret mechanism; never request secrets in chat.

## Sources checked on 2026-11-12

- Square production OAuth requirements: https://developer.squareup.com/docs/oauth-api/movetoprod
- Square partner application and selection: https://squareup.com/us/en/partnerships/app-partner
- Square clarification dated 2026-10-30 on Marketplace access and unlisted integrations: https://developer.squareup.com/forums/t/clarification-on-square-app-marketplace-submission-process-for-existing-integration/28402

Square requires authentication with the partner platform before authorization, server-side encrypted token storage, limited scopes, renewal, connection status, and revocation support. Its forum clarification states that Marketplace listing or certification is not required to run an unlisted production integration.
