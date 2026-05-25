import type { MaildevProviderConfig } from "./types";

type MaildevEnv = Partial<Record<string, string>>;

const readBoolean = (
  value: string | undefined,
  defaultValue: boolean,
): boolean => {
  if (value === undefined) {
    return defaultValue;
  }

  return value.toLowerCase() === "true";
};

const readInteger = (
  value: string | undefined,
  defaultValue: number,
): number => {
  if (value === undefined) {
    return defaultValue;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? defaultValue : parsed;
};

export const getMaildevNotificationProvider = (
  env: MaildevEnv = process.env,
): MaildevProviderConfig | undefined => {
  const isDevelopment = (env.NODE_ENV || "development") === "development";
  const enabled = readBoolean(env.MAILDEV_ENABLED, isDevelopment);

  if (!enabled) {
    return undefined;
  }

  const user = env.MAILDEV_SMTP_USER;
  const pass = env.MAILDEV_SMTP_PASS;

  return {
    resolve: "./src/modules/maildev-notification",
    id: "maildev",
    options: {
      ...(user && pass
        ? {
            auth: {
              pass,
              user,
            },
          }
        : {}),
      channels: ["email"],
      from: env.MAILDEV_FROM || "no-reply@3dbyte-tech.local",
      host: env.MAILDEV_SMTP_HOST || "192.168.0.45",
      port: readInteger(env.MAILDEV_SMTP_PORT, 1025),
      rejectUnauthorized: readBoolean(
        env.MAILDEV_SMTP_REJECT_UNAUTHORIZED,
        false,
      ),
      secure: readBoolean(env.MAILDEV_SMTP_SECURE, false),
      webUrl: env.MAILDEV_WEB_URL || "http://192.168.0.45:1080",
    },
  };
};
