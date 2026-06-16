import { createRateLimitMiddleware, makeRateLimitKey } from "./middleware";

const minute = 60 * 1000;

const ipKey =
  (name: string) =>
  ({ clientIp }: { clientIp: string }) =>
    makeRateLimitKey(name, clientIp);

const actorKey =
  (name: string) =>
  ({ actorId, clientIp }: { actorId?: string; clientIp: string }) =>
    makeRateLimitKey(name, actorId || clientIp);

export const storeSearchRateLimit = createRateLimitMiddleware({
  name: "store_search",
  limit: 120,
  windowMs: minute,
  key: ipKey("store_search"),
});

export const storeAddressAutocompleteRateLimit = createRateLimitMiddleware({
  name: "store_address_autocomplete",
  limit: 120,
  windowMs: minute,
  key: ipKey("store_address_autocomplete"),
});

export const storeLocalityAutocompleteRateLimit = createRateLimitMiddleware({
  name: "store_locality_autocomplete",
  limit: 120,
  windowMs: minute,
  key: ipKey("store_locality_autocomplete"),
});

export const storeSupportTicketRateLimit = createRateLimitMiddleware({
  name: "store_support_ticket",
  limit: 5,
  windowMs: 10 * minute,
  key: ipKey("store_support_ticket"),
  message: "Too many support requests. Please try again shortly.",
});

export const storeNewsletterSubscribeRateLimit = createRateLimitMiddleware({
  name: "store_newsletter_subscribe",
  limit: 5,
  windowMs: 10 * minute,
  key: ipKey("store_newsletter_subscribe"),
});

export const storeWaitlistJoinRateLimit = createRateLimitMiddleware({
  name: "store_waitlist_join",
  limit: 10,
  windowMs: 10 * minute,
  key: ipKey("store_waitlist_join"),
});

export const customerEmailChangeRateLimit = createRateLimitMiddleware({
  name: "customer_email_change",
  limit: 5,
  windowMs: 15 * minute,
  key: actorKey("customer_email_change"),
});

export const customerGoogleLinkRateLimit = createRateLimitMiddleware({
  name: "customer_google_link",
  limit: 5,
  windowMs: 15 * minute,
  key: actorKey("customer_google_link"),
});

export const customerSetPasswordRateLimit = createRateLimitMiddleware({
  name: "customer_set_password",
  limit: 5,
  windowMs: 15 * minute,
  key: actorKey("customer_set_password"),
});

export const customerDisconnectGoogleRateLimit = createRateLimitMiddleware({
  name: "customer_disconnect_google",
  limit: 5,
  windowMs: 15 * minute,
  key: actorKey("customer_disconnect_google"),
});

export const customerEmailVerificationRateLimit = createRateLimitMiddleware({
  name: "customer_email_verification",
  limit: 5,
  windowMs: 15 * minute,
  key: actorKey("customer_email_verification"),
});

export const adminMeilisearchSyncRateLimit = createRateLimitMiddleware({
  name: "admin_meilisearch_sync",
  limit: 5,
  windowMs: 15 * minute,
  key: actorKey("admin_meilisearch_sync"),
});

export const adminEmailTestRateLimit = createRateLimitMiddleware({
  name: "admin_email_test",
  limit: 10,
  windowMs: 15 * minute,
  key: actorKey("admin_email_test"),
});

export const internalAiRateLimit = createRateLimitMiddleware({
  name: "internal_ai",
  limit: 120,
  windowMs: minute,
  key: ipKey("internal_ai"),
});
