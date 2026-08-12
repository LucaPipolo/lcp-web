import * as Sentry from "@sentry/astro"

Sentry.init({
  dsn: "https://5dfa2e82510f22215199bf30a53f0a5a@o388146.ingest.us.sentry.io/4511896576983040",
  dataCollection: {
    /**
     * Disabled automatic PII collection (IPs, emails, forms, cookies)
     * to process logs anonymously under GDPR Legitimate Interest, avoiding a cookie banner.
     */
    userInfo: false,
    httpBodies: [],
    cookies: false,
  },
  integrations: [
    /**
     * We leave out Session Replay integration to comply with GDPR WITHOUT showing a cookie banner.
     *
     * Session Replay records user behavior (mouse movements, clicks, window resizing).
     * Under EU ePrivacy Directive (Art. 5.3) and GDPR, recording UX sessions is classified
     * as non-essential behavioral tracking, which legally requires explicit user consent.
     */
    Sentry.browserTracingIntegration(),
  ],
  enableLogs: true,
  tracesSampleRate: 1.0,
})
