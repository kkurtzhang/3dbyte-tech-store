import {
  buildDefaultSenderProfiles,
  validateSenderProfile,
} from "../sender-profiles";

describe("email sender profiles", () => {
  it("builds staging-safe default sender profiles", () => {
    const profiles = buildDefaultSenderProfiles({ APP_ENV: "staging" });

    expect(profiles).toEqual([
      expect.objectContaining({
        key: "default",
        from: "3D Byte Tech <staging-no-reply@3dbytetech.com.au>",
      }),
      expect.objectContaining({
        key: "order",
        from: "3D Byte Tech Orders <staging-order@3dbytetech.com.au>",
      }),
      expect.objectContaining({
        key: "stock",
        from: "3D Byte Tech Stock Alerts <staging-stock@3dbytetech.com.au>",
      }),
    ]);
  });

  it("builds production sender profiles without staging prefixes", () => {
    const profiles = buildDefaultSenderProfiles({ APP_ENV: "production" });

    expect(profiles).toEqual([
      expect.objectContaining({
        key: "default",
        from: "3D Byte Tech <no-reply@3dbytetech.com.au>",
      }),
      expect.objectContaining({
        key: "order",
        from: "3D Byte Tech Orders <order@3dbytetech.com.au>",
      }),
      expect.objectContaining({
        key: "stock",
        from: "3D Byte Tech Stock Alerts <stock@3dbytetech.com.au>",
      }),
    ]);
  });

  it("rejects non-3dbytetech sender domains", () => {
    expect(() =>
      validateSenderProfile(
        {
          from: "Bad Sender <orders@example.com>",
          reply_to: "support@3dbytetech.com.au",
        },
        { APP_ENV: "production" },
      ),
    ).toThrow("Sender email must use @3dbytetech.com.au");
  });

  it("requires staging sender addresses to use staging prefixes", () => {
    expect(() =>
      validateSenderProfile(
        {
          from: "3D Byte Tech Orders <order@3dbytetech.com.au>",
          reply_to: "support@3dbytetech.com.au",
        },
        { APP_ENV: "staging" },
      ),
    ).toThrow("Staging sender email must start with staging-");
  });

  it("rejects staging sender addresses in production", () => {
    expect(() =>
      validateSenderProfile(
        {
          from: "3D Byte Tech Orders <staging-order@3dbytetech.com.au>",
          reply_to: "support@3dbytetech.com.au",
        },
        { APP_ENV: "production" },
      ),
    ).toThrow("Production sender email must not start with staging-");
  });
});
