# Outreach interest confirmation

The personalized confirmation in the homepage contact section (`/#message`) uses the existing logo, Inter font,
homepage color tokens, and solid purple rounded button. It is hidden for ordinary visitors. No recipient data or lookup table is published.

Old `/interested.html` links redirect to the homepage and preserve their parameters.
New links target `/?t=TOKEN&r=Restaurant&s=System#message`.

Links use `t` (32 lowercase hexadecimal characters), `r` (restaurant display
name), and `s` (ordering system display name). Display values are untrusted text;
they are not proof of the recipient's identity or integration availability.
Only an explicit confirmation-button click sends a Formspree POST. A simple
GET does not submit interest. This is two clicks from email, with no typing.
The page cannot authenticate, expire, or globally deduplicate tokens. Match
notifications against the private CSV before following up, and deduplicate
repeated notifications by token. A success response confirms acceptance by
Formspree, not inbox delivery or trial activation.

Generate links using the hardened generator (Muse's original default output
would overwrite previous batch mappings):

```sh
python3 scripts/generate-outreach-tokens.py /private/path/recipients.csv --out-dir /private/path/new-batch
```

The input and output must be outside the website folder. Existing output
directories are rejected. Output permissions are private. Preserve both
`lead-tokens.csv` and `links.txt`; do not publish them. The mapping is resolved
manually; no inbox watcher is implemented here.

Without a valid-format token, the page offers an email fallback. With JavaScript
disabled, the confirmation button remains disabled and the fallback is shown.
Submission errors re-enable the button; requests time out after 20 seconds.
The existing endpoint is `https://formspree.io/f/xeeezpzn`.

Muse's supplied README reports a previous live endpoint and notification test.
That is external evidence, not independently verified by this implementation.
Automated local tests stub the endpoint so they create no real leads.
