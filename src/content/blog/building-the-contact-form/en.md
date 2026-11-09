---
title: "A spam-resistant contact form on a static site: Astro, Vercel and Turnstile"
description: >-
  How I built this site's contact form with Astro, Vercel Functions and
  Cloudflare Turnstile, kept a strict CSP and handled personal data
  retention and deletion.
published: 2026-11-09
tags:
  - astro
  - vercel
  - security
  - privacy
  - developer-tools
---

Until a few days ago, getting in touch through this website meant clicking a `mailto:` link. It was a simple solution that had always worked well enough for a personal site, but it came with an obvious drawback: my email address was sitting in the HTML, readily available to bots scraping websites for addresses to spam.

I decided to add a proper contact form, but I wanted to avoid complicating the site's architecture for such a small feature. The website is built with [Astro](https://astro.build/), generated entirely as static pages and hosted on [Vercel](https://vercel.com/). It also uses a fairly strict [Content Security Policy (CSP)](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CSP), without `unsafe-inline` or `unsafe-eval`, and supports three languages. I wanted to keep all of that in place and introduce only the server-side code needed to receive messages.

There were two other requirements. First, I wanted to reduce spam without making genuine visitors jump through hoops just to send me a message. Second, the form would collect names, email addresses and messages, so I needed to decide how that information would be processed, how long to keep it and how to delete it when it was no longer needed.

The result is the [form on this site's contact page](/en/contact/). I built it using Vercel Functions, Cloudflare Turnstile, Brevo and Neon, keeping the frontend static and adding server-side functionality only where it was necessary.

## Adding a contact form without giving up static generation

The first decision was where to run the code that would receive submissions. Astro has an [official Vercel adapter](https://docs.astro.build/en/guides/integrations-guide/vercel/), but adopting it would have changed the project's build process. This website already has a particular setup: middleware handles language selection before caching, and security headers, including the CSP, are defined in `vercel.json`. I didn't want to change a working configuration just to add a handful of endpoints.

Instead, I kept Astro's static output and added [Vercel Functions](https://vercel.com/docs/functions) directly. They live in the `api/` directory and are deployed by Vercel independently of the rest of the site. I ended up with three: `contact.ts` receives submissions, `cleanup.ts` deletes expired data and `notify.ts` sends notices when relevant changes are made to the privacy policy.

The contact endpoint uses standard Web APIs, taking a `Request` and returning a `Response`. There was no need to introduce a backend framework or change how Astro builds the pages.

I also made sure the browser and server share the same validation rules. Field lengths, email address format and the maximum number of links are defined in a single TypeScript module used by both. That means I can change a rule in one place without ending up in a situation where the browser accepts a message that the server then rejects.

For the interactive parts of the form, I chose [Alpine.js](https://alpinejs.dev/) with its [CSP-compatible build](https://alpinejs.dev/advanced/csp). This version doesn't evaluate JavaScript expressions directly inside HTML attributes, so I use component methods rather than inline expressions. It takes a little getting used to, but it keeps the logic out of the markup and lets me maintain the CSP without allowing `unsafe-eval`.

The form asks for just four things: a name, email address, message and reason for getting in touch. For the last field, visitors can choose between a job opportunity, a project, a collaboration or something else. The message placeholder changes depending on the selection, suggesting what information might be useful to include. I've also paid attention to validation: errors appear only after someone has started interacting with a field, and if they try to submit invalid data, focus moves to the first field that needs attention. Each error is associated with its input through `aria-describedby`, so screen readers can announce it correctly.

The result is a fairly straightforward form that fits into the existing website without requiring server-side rendering. I've also included a [Notion Calendar](https://www.notion.com/product/calendar) link for anyone who would rather book a call than write a message.

## Reducing spam without making the form harder to use

Any public contact form will attract spam eventually. My aim was to keep it to a minimum without introducing intrusive CAPTCHAs or unnecessary steps for people who simply want to get in touch.

I went with several layers of protection, starting with the simplest and cheapest checks. The form contains a hidden _honeypot_ field that genuine visitors won't normally see or fill in, but some bots will complete automatically. I also measure how much time has passed since the page was opened. A submission arriving in under three seconds is treated as suspicious. Neither approach is foolproof, but together they can filter out some automated requests before any external services need to be called.

The main protection comes from [Cloudflare Turnstile](https://www.cloudflare.com/application-services/products/turnstile/), configured in _managed_ mode with `appearance: "interaction-only"`. Most visitors never have to interact with it. The widget only appears when Cloudflare decides an additional check is needed.

The Turnstile script loads only on the contact page. The browser generates a token, which is sent with the message and verified by the server function through Cloudflare's `siteverify` API. Each token can only be verified once, so I reset the widget after every submission attempt. I've also added a timeout for situations where a browser extension blocks the script. Rather than leaving the form waiting indefinitely, I show a message explaining why it can't proceed.

Keeping the existing CSP was one of my main requirements. Integrating Turnstile only needed two additions, both restricted to Cloudflare's domain:

```text
script-src 'self' https://challenges.cloudflare.com
frame-src https://challenges.cloudflare.com
```

The `form-action` directive remains set to `'none'` because the form doesn't use a traditional HTML submission. Instead, it sends the data to the function using `fetch`.

On top of those checks, I configured _rate limiting_ in the [Vercel Firewall](https://vercel.com/docs/vercel-firewall/vercel-waf/rate-limiting). It blocks IP addresses that make more than five requests within ten minutes. Because the firewall acts before a request reaches the function, blocked requests don't execute any server-side code.

Together, these checks give me several layers of protection. The inexpensive checks filter out simpler automated submissions, Turnstile handles more sophisticated cases and the firewall limits repeated attempts. When the initial checks detect a suspicious submission, the function also returns an apparently successful response, rather than giving bots useful feedback about which protection they triggered.

For genuine visitors, most of this happens without any noticeable interruption.

## Delivering messages with Brevo

Once a submission has passed validation, it needs to reach my inbox. I chose [Brevo](https://www.brevo.com/), a European service that I'd also like to use for a future newsletter. The function calls its HTTP API directly, without adding an SDK for what is essentially a single request.

Messages arrive as plain-text emails. The sender is an address on my own domain, authenticated with DKIM and covered by a DMARC policy, while the `Reply-To` header contains the visitor's email address. This means I can reply straight from my inbox without copying addresses between messages.

I decided against sending automatic confirmation emails. A public form that sends messages to arbitrary email addresses can be abused to send unwanted mail to third parties, and I didn't want to introduce that risk just to acknowledge a submission. Instead, the form displays a confirmation on the page when the message has been sent successfully.

I also don't add people who use the contact form to my Brevo contact list. Someone writing to me is asking for a reply, and their email address is used for that purpose. If I introduce a newsletter later, subscribing to it will be a separate process.

## Storing data and handling privacy properly

At this stage, the form could already do its job: receive a submission, validate it and email me the message. But I also wanted to deal with what happens to the data afterwards, rather than letting it sit indefinitely in an inbox or database.

The first consideration was the legal basis for processing. The form doesn't rely on consent to read and respond to messages. Those activities are based on legitimate interests under [Article 6(1)(f) of the GDPR](https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:02016R0679-20160504). Where an enquiry concerns a potential professional engagement, the pre-contractual measures covered by Article 6(1)(b) may also apply, provided the relevant conditions are met.

That's why I avoided the usual "I consent to the processing of my personal data" checkbox. Instead, the form displays a short privacy notice with a link to the full policy, together with an unticked checkbox confirming that the visitor has read the information.

I also wanted to keep a record of exactly what information had been shown when someone submitted the form. Alongside each message, I store the wording of the privacy notice, its version, the submission date and time, the page it came from and some technical information. An [article on AyudaWP](https://ayudawp.com/registro-consentimiento-cookies-formularios-pedidos/) about documenting privacy notices and consent records helped shape this part of the implementation.

One important detail is that the server reads the privacy notice directly from the YAML files used to generate the website. It doesn't accept a copy supplied by the browser, because a modified client could send different wording from what was actually published. The record also includes a SHA-256 hash of its contents, making subsequent changes detectable.

For IP addresses, I decided to store only an HMAC-SHA-256 hash calculated using a secret key kept separately. This lets me compare records associated with the same address without retaining the original IP. It's still pseudonymised personal data, though, so I treat and retain it accordingly.

### Two databases with different retention periods

I used [Neon](https://neon.tech/) for storage, creating two separate databases hosted in Frankfurt, Germany. One stores the messages themselves, while the other stores records of the privacy information shown to visitors. Each database has its own credentials, and a shared identifier links each message to its corresponding record.

Keeping them separate makes sense because they serve different purposes and have different retention periods. I've set **12 months for messages**, which I consider enough time to handle an enquiry and pick up a conversation if someone gets back in touch later. Privacy records are kept for **3 years**, so I can demonstrate what information was provided even after the associated message has been deleted. I chose that period partly with Spanish data protection legislation in mind; it's not a retention period prescribed by the GDPR for all processing.

The next question was how to make sure the data actually gets deleted when those periods expire. I created `api/cleanup.ts`, a Vercel Function that runs every night at 03:00 UTC through a [Cron Job](https://vercel.com/docs/cron-jobs):

```json
"crons": [{ "path": "/api/cleanup", "schedule": "0 3 * * *" }]
```

The function runs two `DELETE` queries, one against each database, applying the relevant retention period. The endpoint is protected using `CRON_SECRET`, which Vercel includes in the `Authorization` header of scheduled requests. Any request without the correct secret is rejected.

I could have run the cleanup whenever a new message arrived, avoiding the need for a cron job. But if nobody used the form for several months, expired data would remain in storage. A scheduled task ensures deletion happens regardless of how often the form is used.

### Making sure messages aren't lost

There was one more failure scenario to account for: what if Brevo can't send an email, or Neon becomes temporarily unavailable?

The function starts both the database write and email delivery at the same time, using `Promise.allSettled`:

```ts
const [kept, delivered] = await Promise.allSettled([
  keep(submission, request),
  deliver(submission),
])

if (kept.status === "rejected" && delivered.status === "rejected") {
  return json({ error: "generic" }, 502)
}
```

I treat the submission as successful if at least one operation completes. If the message reaches the database but email delivery fails, I can still retrieve it. If the email arrives but the database is unavailable, I haven't lost the message either. Any errors are recorded in Vercel's logs.

This also avoids displaying an error to someone whose message has already arrived through one of the two channels. Otherwise, they might try submitting it again and create duplicates.

## Notifying people when the privacy policy changes

While updating the privacy policy to cover the new form, I started thinking about what would happen the next time I needed to change it.

People who contact me are given specific information about how their data is handled, and I keep a record of the version they were shown. If I later changed the data controller, introduced a new purpose or significantly changed how previously collected data is processed, I might need to inform the people affected before those changes take effect.

The [European guidelines on transparency](https://ec.europa.eu/newsroom/article29/items/622227) distinguish between purely editorial changes and substantive ones. Fixing a typo doesn't necessarily require contacting everyone individually, but a change that materially affects people's rights or reasonable expectations may call for a specific notification.

I therefore built a small system for sending notices when they're needed, rather than automatically emailing everyone whenever the wording of the policy changes.

Each notice is defined in a YAML file containing the subject and message in all three languages supported by the website. A script lets me check the number of recipients, send a test and finally send the notice:

```sh
bun run notify notices/2027-01-nuovo-hosting.yaml
bun run notify notices/2027-01-nuovo-hosting.yaml --test
bun run notify notices/2027-01-nuovo-hosting.yaml --send
```

The greeting, explanation of why the recipient is receiving the email, link to the updated policy and instructions for exercising their rights are added automatically. Everyone receives an individual message in the language they used when submitting the contact form, so their email address is never exposed to other recipients.

The script runs on my computer, but `api/notify.ts` handles delivery on Vercel. That keeps Brevo's credentials and database connection details in server-side environment variables. The endpoint is protected with a dedicated secret and uses an idempotency key to reduce the risk of duplicate emails if a request needs to be retried after an error.

The system also logs each notification run, including when it happened, which version of the privacy policy it concerned and how many emails were sent. Recipient addresses aren't stored in that log.

I don't expect to use this feature often, but I'd rather have it ready than have to reconstruct a list of affected people manually when the need arises.

## The result

The contact form is now part of the website without changing its static architecture. Astro still generates the pages, while Vercel Functions handle the few operations that need a server: receiving messages, storing them, deleting expired records and sending privacy notices when necessary.

To reduce spam, I've combined several checks with Cloudflare Turnstile and the Vercel Firewall. The CSP remains strict, with only the permissions needed for the verification widget. Messages are delivered through Brevo and stored in Neon, separately from the records documenting which privacy information was shown to visitors.

What mattered most to me was managing the full lifecycle of the data, from collection to deletion, without relying on manual housekeeping. The form now retains the information it needs for defined periods, removes it automatically when those periods expire and provides a way to communicate important changes if necessary.

There's still one small improvement on my list: removing the email address currently published directly in the homepage HTML and generating it in the browser with JavaScript to make automated harvesting a little harder.

I'd also like to add a newsletter in the future. Some of this infrastructure will be reusable, particularly Brevo, Turnstile and the record-keeping system. Newsletter subscriptions, however, will require specific consent and double opt-in. Email addresses collected through the contact form will remain entirely separate.

For now, the new form is available on the [contact page](/en/contact/).
