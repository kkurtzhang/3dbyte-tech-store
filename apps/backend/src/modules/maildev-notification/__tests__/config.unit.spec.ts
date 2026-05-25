import { getMaildevNotificationProvider } from "../config";

describe("getMaildevNotificationProvider", () => {
  it("enables MailDev by default in development with the shared dev host", () => {
    const provider = getMaildevNotificationProvider({
      NODE_ENV: "development",
    });

    expect(provider).toEqual({
      resolve: "./src/modules/maildev-notification",
      id: "maildev",
      options: {
        channels: ["email"],
        from: "no-reply@3dbyte-tech.local",
        host: "192.168.0.45",
        port: 1025,
        secure: false,
        rejectUnauthorized: false,
        webUrl: "http://192.168.0.45:1080",
      },
    });
  });

  it("stays disabled outside development unless explicitly enabled", () => {
    expect(
      getMaildevNotificationProvider({
        NODE_ENV: "production",
      }),
    ).toBeUndefined();
  });

  it("can be explicitly enabled with SMTP overrides", () => {
    const provider = getMaildevNotificationProvider({
      NODE_ENV: "production",
      MAILDEV_ENABLED: "true",
      MAILDEV_SMTP_HOST: "maildev.internal",
      MAILDEV_SMTP_PORT: "2525",
      MAILDEV_SMTP_SECURE: "true",
      MAILDEV_SMTP_REJECT_UNAUTHORIZED: "true",
      MAILDEV_FROM: "orders@example.com",
      MAILDEV_WEB_URL: "http://maildev.internal:8080",
      MAILDEV_SMTP_USER: "dev-user",
      MAILDEV_SMTP_PASS: "dev-pass",
    });

    expect(provider).toEqual({
      resolve: "./src/modules/maildev-notification",
      id: "maildev",
      options: {
        auth: {
          pass: "dev-pass",
          user: "dev-user",
        },
        channels: ["email"],
        from: "orders@example.com",
        host: "maildev.internal",
        port: 2525,
        rejectUnauthorized: true,
        secure: true,
        webUrl: "http://maildev.internal:8080",
      },
    });
  });

  it("can be explicitly disabled in development", () => {
    expect(
      getMaildevNotificationProvider({
        NODE_ENV: "development",
        MAILDEV_ENABLED: "false",
      }),
    ).toBeUndefined();
  });
});
