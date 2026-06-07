import {
  createAccountReauthToken,
  deriveAccountSecurityWarnings,
  evaluateOAuthLinkIntent,
  getCustomerAccountConsolidationMode,
  hashOpaqueValue,
  isGoogleAutoLinkEnabled,
  normalizeCustomerEmail,
  verifyAccountReauthToken,
} from "../security";

describe("account coordination security", () => {
  it("normalizes customer email with trim and lowercase only", () => {
    expect(normalizeCustomerEmail("  Kurt+Orders@Example.COM ")).toBe(
      "kurt+orders@example.com",
    );
  });

  it("parses rollout controls conservatively", () => {
    expect(getCustomerAccountConsolidationMode("live")).toBe("live");
    expect(getCustomerAccountConsolidationMode("dry_run")).toBe("dry_run");
    expect(getCustomerAccountConsolidationMode("unexpected")).toBe("off");
    expect(getCustomerAccountConsolidationMode(undefined)).toBe("off");

    expect(isGoogleAutoLinkEnabled("true")).toBe(true);
    expect(isGoogleAutoLinkEnabled("TRUE")).toBe(true);
    expect(isGoogleAutoLinkEnabled("1")).toBe(false);
    expect(isGoogleAutoLinkEnabled(undefined)).toBe(false);
  });

  it("hashes opaque browser values without retaining the raw value", () => {
    const first = hashOpaqueValue("browser-nonce", "test-secret");
    const second = hashOpaqueValue("browser-nonce", "test-secret");

    expect(first).toBe(second);
    expect(first).not.toContain("browser-nonce");
    expect(first).toHaveLength(64);
  });

  it("accepts a pending, matching, unexpired OAuth link intent", () => {
    const result = evaluateOAuthLinkIntent(
      {
        customer_id: "cus_123",
        expected_email: "customer@example.com",
        nonce_hash: hashOpaqueValue("nonce-123", "secret"),
        status: "pending",
        expires_at: new Date("2026-06-07T12:10:00.000Z"),
      },
      {
        customerId: "cus_123",
        verifiedEmail: " Customer@Example.com ",
        nonce: "nonce-123",
        secret: "secret",
        now: new Date("2026-06-07T12:00:00.000Z"),
      },
    );

    expect(result).toEqual({ valid: true });
  });

  it.each([
    {
      name: "expired",
      intent: {
        customer_id: "cus_123",
        expected_email: "customer@example.com",
        nonce_hash: hashOpaqueValue("nonce-123", "secret"),
        status: "pending",
        expires_at: new Date("2026-06-07T11:59:59.000Z"),
      },
      input: {
        customerId: "cus_123",
        verifiedEmail: "customer@example.com",
        nonce: "nonce-123",
        secret: "secret",
        now: new Date("2026-06-07T12:00:00.000Z"),
      },
      reason: "expired",
    },
    {
      name: "already used",
      intent: {
        customer_id: "cus_123",
        expected_email: "customer@example.com",
        nonce_hash: hashOpaqueValue("nonce-123", "secret"),
        status: "used",
        expires_at: new Date("2026-06-07T12:10:00.000Z"),
      },
      input: {
        customerId: "cus_123",
        verifiedEmail: "customer@example.com",
        nonce: "nonce-123",
        secret: "secret",
        now: new Date("2026-06-07T12:00:00.000Z"),
      },
      reason: "not_pending",
    },
    {
      name: "different customer",
      intent: {
        customer_id: "cus_other",
        expected_email: "customer@example.com",
        nonce_hash: hashOpaqueValue("nonce-123", "secret"),
        status: "pending",
        expires_at: new Date("2026-06-07T12:10:00.000Z"),
      },
      input: {
        customerId: "cus_123",
        verifiedEmail: "customer@example.com",
        nonce: "nonce-123",
        secret: "secret",
        now: new Date("2026-06-07T12:00:00.000Z"),
      },
      reason: "customer_mismatch",
    },
    {
      name: "different email",
      intent: {
        customer_id: "cus_123",
        expected_email: "other@example.com",
        nonce_hash: hashOpaqueValue("nonce-123", "secret"),
        status: "pending",
        expires_at: new Date("2026-06-07T12:10:00.000Z"),
      },
      input: {
        customerId: "cus_123",
        verifiedEmail: "customer@example.com",
        nonce: "nonce-123",
        secret: "secret",
        now: new Date("2026-06-07T12:00:00.000Z"),
      },
      reason: "email_mismatch",
    },
    {
      name: "different nonce",
      intent: {
        customer_id: "cus_123",
        expected_email: "customer@example.com",
        nonce_hash: hashOpaqueValue("nonce-123", "secret"),
        status: "pending",
        expires_at: new Date("2026-06-07T12:10:00.000Z"),
      },
      input: {
        customerId: "cus_123",
        verifiedEmail: "customer@example.com",
        nonce: "wrong-nonce",
        secret: "secret",
        now: new Date("2026-06-07T12:00:00.000Z"),
      },
      reason: "nonce_mismatch",
    },
  ])("rejects a $name OAuth link intent", ({ intent, input, reason }) => {
    expect(evaluateOAuthLinkIntent(intent, input)).toEqual({
      valid: false,
      reason,
    });
  });

  it("derives sanitized operational warnings", () => {
    expect(
      deriveAccountSecurityWarnings({
        hasAccount: true,
        providers: [],
        hasIdentityConflict: true,
        consolidationStatus: "failed",
      }),
    ).toEqual(["no_usable_login", "identity_conflict", "consolidation_failed"]);
  });

  it("creates and verifies a short-lived customer-bound reauthentication proof", () => {
    const token = createAccountReauthToken({
      customerId: "cus_123",
      provider: "google",
      secret: "test-secret",
      issuedAt: new Date("2026-06-07T12:00:00.000Z"),
      expiresInSeconds: 300,
    });

    expect(
      verifyAccountReauthToken(token, {
        customerId: "cus_123",
        provider: "google",
        secret: "test-secret",
        now: new Date("2026-06-07T12:04:00.000Z"),
      }),
    ).toEqual({ valid: true });
  });

  it("rejects expired, tampered, or cross-customer reauthentication proofs", () => {
    const token = createAccountReauthToken({
      customerId: "cus_123",
      provider: "google",
      secret: "test-secret",
      issuedAt: new Date("2026-06-07T12:00:00.000Z"),
      expiresInSeconds: 60,
    });

    expect(
      verifyAccountReauthToken(token, {
        customerId: "cus_other",
        provider: "google",
        secret: "test-secret",
        now: new Date("2026-06-07T12:00:10.000Z"),
      }),
    ).toEqual({ valid: false, reason: "customer_mismatch" });
    expect(
      verifyAccountReauthToken(token, {
        customerId: "cus_123",
        provider: "google",
        secret: "test-secret",
        now: new Date("2026-06-07T12:02:00.000Z"),
      }),
    ).toEqual({ valid: false, reason: "expired" });
    expect(
      verifyAccountReauthToken(`${token}tampered`, {
        customerId: "cus_123",
        provider: "google",
        secret: "test-secret",
      }),
    ).toEqual({ valid: false, reason: "invalid_signature" });
  });
});
