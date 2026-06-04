import {
  createCustomerEmailVerificationToken,
  verifyCustomerEmailVerificationToken,
} from "../tokens";

describe("customer email verification tokens", () => {
  it("verifies signed customer email confirmation tokens", () => {
    const token = createCustomerEmailVerificationToken({
      customerId: "cus_123",
      email: "Ava@Example.COM",
      expiresInSeconds: 60,
      issuedAt: new Date("2026-06-04T00:00:00.000Z"),
      secret: "test-secret",
    });

    expect(
      verifyCustomerEmailVerificationToken(token, {
        now: new Date("2026-06-04T00:00:10.000Z"),
        secret: "test-secret",
      }),
    ).toEqual({
      valid: true,
      payload: expect.objectContaining({
        customer_id: "cus_123",
        email: "ava@example.com",
      }),
    });
  });

  it("rejects tampered customer email confirmation tokens", () => {
    const token = createCustomerEmailVerificationToken({
      customerId: "cus_123",
      email: "ava@example.com",
      expiresInSeconds: 60,
      issuedAt: new Date("2026-06-04T00:00:00.000Z"),
      secret: "test-secret",
    });

    expect(
      verifyCustomerEmailVerificationToken(`${token}tampered`, {
        now: new Date("2026-06-04T00:00:10.000Z"),
        secret: "test-secret",
      }),
    ).toEqual({
      valid: false,
      reason: "invalid-signature",
    });
  });
});
