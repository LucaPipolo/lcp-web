import * as Sentry from "@sentry/astro"

Sentry.init({
  dsn: "https://5dfa2e82510f22215199bf30a53f0a5a@o388146.ingest.us.sentry.io/4511896576983040",
  // The dev server would otherwise report every build error as production.
  enabled: import.meta.env.PROD,
  environment: import.meta.env.SENTRY_ENVIRONMENT,
  dataCollection: {
    /**
     * Disabled automatic PII collection (IPs, emails, forms, cookies)
     * to process logs anonymously under GDPR Legitimate Interest, avoiding a cookie banner.
     */
    userInfo: false,
    httpBodies: [],
    cookies: false,
  },
  tracesSampleRate: 1.0,
})
