import {
  ACCOUNT_COORDINATION_MODULE,
  OAuthLinkIntent,
  AccountSecurityEvent,
  GuestConsolidationRun,
  IdentityConflict,
} from "..";

describe("account coordination module", () => {
  it("exports stable module and model contracts", () => {
    expect(ACCOUNT_COORDINATION_MODULE).toBe("accountCoordination");
    expect(OAuthLinkIntent.name).toBe("OauthLinkIntent");
    expect(AccountSecurityEvent.name).toBe("AccountSecurityEvent");
    expect(GuestConsolidationRun.name).toBe("GuestConsolidationRun");
    expect(IdentityConflict.name).toBe("IdentityConflict");
  });

  it("stores only hashed OAuth browser proof and sanitized summaries", () => {
    expect(Object.keys(OAuthLinkIntent.schema)).toEqual(
      expect.arrayContaining([
        "customer_id",
        "expected_email",
        "nonce_hash",
        "status",
        "expires_at",
      ]),
    );
    expect(Object.keys(OAuthLinkIntent.schema)).not.toContain("nonce");
    expect(Object.keys(OAuthLinkIntent.schema)).not.toContain("token");

    expect(Object.keys(GuestConsolidationRun.schema)).toEqual(
      expect.arrayContaining([
        "canonical_customer_id",
        "normalized_email",
        "idempotency_key",
        "mode",
        "status",
        "summary",
      ]),
    );
  });
});
