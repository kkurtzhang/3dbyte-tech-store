import { getResendNotificationProvider } from "../config";

describe("getResendNotificationProvider", () => {
  it("stays disabled when Resend credentials are incomplete", () => {
    expect(
      getResendNotificationProvider({
        RESEND_ENABLED: "true",
      }),
    ).toBeUndefined();
  });

  it("stays disabled when explicitly turned off", () => {
    expect(
      getResendNotificationProvider({
        RESEND_API_KEY: "re_test",
        RESEND_ENABLED: "false",
        RESEND_FROM: "3D Byte Tech <orders@example.com.au>",
      }),
    ).toBeUndefined();
  });

  it("enables Resend from current waitlist env names", () => {
    const provider = getResendNotificationProvider({
      RESEND_API_KEY: "re_test",
      RESEND_ENABLED: "true",
      RESEND_FROM: "3D Byte Tech <orders@example.com.au>",
    });

    expect(provider).toEqual({
      resolve: "./src/modules/resend-notification",
      id: "resend",
      options: {
        apiKey: "re_test",
        channels: ["email"],
        from: "3D Byte Tech <orders@example.com.au>",
      },
    });
  });

  it("keeps deployment env compatibility for sender and custom API URL", () => {
    const provider = getResendNotificationProvider({
      RESEND_API_KEY: "re_test",
      RESEND_API_URL: "https://resend-proxy.internal",
      RESEND_FROM_EMAIL: "orders@example.com.au",
    });

    expect(provider).toEqual({
      resolve: "./src/modules/resend-notification",
      id: "resend",
      options: {
        apiKey: "re_test",
        apiUrl: "https://resend-proxy.internal",
        channels: ["email"],
        from: "orders@example.com.au",
      },
    });
  });
});
