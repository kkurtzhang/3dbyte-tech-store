import { getResendNotificationProvider } from "../config";

describe("getResendNotificationProvider", () => {
  it("stays disabled when Resend credentials are incomplete", () => {
    expect(
      getResendNotificationProvider({
        NODE_ENV: "production",
      }),
    ).toBeUndefined();
  });

  it("enables Resend when the API key and sender are configured", () => {
    const provider = getResendNotificationProvider({
      RESEND_API_KEY: "re_test",
      RESEND_FROM_EMAIL: "3D Byte Tech <orders@example.com.au>",
    });

    expect(provider).toEqual({
      resolve: "./src/modules/resend-notification",
      id: "resend",
      options: {
        apiKey: "re_test",
        apiUrl: "https://api.resend.com",
        channels: ["email"],
        from: "3D Byte Tech <orders@example.com.au>",
      },
    });
  });

  it("can target a custom Resend-compatible API URL", () => {
    const provider = getResendNotificationProvider({
      RESEND_API_KEY: "re_test",
      RESEND_API_URL: "https://resend-proxy.internal",
      RESEND_FROM_EMAIL: "orders@example.com.au",
    });

    expect(provider?.options.apiUrl).toBe("https://resend-proxy.internal");
  });
});
