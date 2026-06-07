import {
  checkAccountSecurityRateLimit,
  clearAccountSecurityRateLimitBuckets,
} from "../rate-limit";

describe("account security rate limiting", () => {
  beforeEach(() => {
    clearAccountSecurityRateLimitBuckets();
  });

  it("allows attempts until the customer and action bucket reaches its limit", () => {
    expect(
      checkAccountSecurityRateLimit("cus_123", "email_change", 2, 60_000),
    ).toMatchObject({ allowed: true });
    expect(
      checkAccountSecurityRateLimit("cus_123", "email_change", 2, 60_000),
    ).toMatchObject({ allowed: true });

    expect(
      checkAccountSecurityRateLimit("cus_123", "email_change", 2, 60_000),
    ).toMatchObject({
      allowed: false,
      retryAfterMs: expect.any(Number),
    });
  });

  it("keeps customer and operation buckets isolated", () => {
    checkAccountSecurityRateLimit("cus_123", "email_change", 1, 60_000);

    expect(
      checkAccountSecurityRateLimit("cus_456", "email_change", 1, 60_000),
    ).toMatchObject({ allowed: true });
    expect(
      checkAccountSecurityRateLimit("cus_123", "google_link", 1, 60_000),
    ).toMatchObject({ allowed: true });
  });
});
