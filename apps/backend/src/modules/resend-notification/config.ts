import type { ResendProviderConfig } from "./types";

type ResendEnv = Partial<Record<string, string>>;

const readString = (value: string | undefined): string | undefined => {
  const trimmed = value?.trim();

  return trimmed ? trimmed : undefined;
};

export const getResendNotificationProvider = (
  env: ResendEnv = process.env,
): ResendProviderConfig | undefined => {
  const apiKey = readString(env.RESEND_API_KEY);
  const from = readString(env.RESEND_FROM_EMAIL);

  if (!apiKey || !from) {
    return undefined;
  }

  return {
    resolve: "./src/modules/resend-notification",
    id: "resend",
    options: {
      apiKey,
      apiUrl: readString(env.RESEND_API_URL) || "https://api.resend.com",
      channels: ["email"],
      from,
    },
  };
};
