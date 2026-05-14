import type { ResendProviderConfig } from "./types";

type ResendEnv = Partial<Record<string, string>>;

const readString = (value: string | undefined): string | undefined => {
  const trimmed = value?.trim();

  return trimmed ? trimmed : undefined;
};

const readBoolean = (value: string | undefined): boolean =>
  value?.toLowerCase() === "true";

export const getResendNotificationProvider = (
  env: ResendEnv = process.env,
): ResendProviderConfig | undefined => {
  const apiKey = readString(env.RESEND_API_KEY);
  const from = readString(env.RESEND_FROM) || readString(env.RESEND_FROM_EMAIL);
  const enabled =
    env.RESEND_ENABLED === undefined
      ? Boolean(apiKey && from)
      : readBoolean(env.RESEND_ENABLED);

  if (!enabled || !apiKey || !from) {
    return undefined;
  }

  const apiUrl = readString(env.RESEND_API_URL);

  return {
    resolve: "./src/modules/resend-notification",
    id: "resend",
    options: {
      apiKey,
      ...(apiUrl ? { apiUrl } : {}),
      channels: ["email"],
      from,
    },
  };
};
