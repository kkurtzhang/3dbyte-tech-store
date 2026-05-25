import type { MedusaContainer } from "@medusajs/framework/types";

export const EMAIL_SENDER_ALLOWED_DOMAIN = "3dbytetech.com.au";
export const EMAIL_SETTINGS_MODULE = "emailSettings";

export const EMAIL_SENDER_PROFILE_KEYS = ["default", "order", "stock"] as const;

export type EmailSenderProfileKey = (typeof EMAIL_SENDER_PROFILE_KEYS)[number];

export type EmailRuntimeEnvironment = "development" | "production" | "staging";

export type EmailSenderProfile = {
  description: string;
  from: string;
  key: EmailSenderProfileKey;
  label: string;
  reply_to: string;
};

export type EmailSenderProfileInput = {
  from: string;
  reply_to: string;
};

type Env = Partial<Record<string, string | undefined>>;

const DISPLAY_NAMES: Record<EmailSenderProfileKey, string> = {
  default: "3D Byte Tech",
  order: "3D Byte Tech Orders",
  stock: "3D Byte Tech Stock Alerts",
};

const LABELS: Record<EmailSenderProfileKey, string> = {
  default: "Default Sender",
  order: "Order Confirmations",
  stock: "Stock Alerts",
};

const DESCRIPTIONS: Record<EmailSenderProfileKey, string> = {
  default: "Fallback sender for transactional email.",
  order: "Used for order confirmation and receipt emails.",
  stock: "Used for waitlist and back-in-stock notifications.",
};

const STAGING_LOCAL_PARTS: Record<EmailSenderProfileKey, string> = {
  default: "staging-no-reply",
  order: "staging-order",
  stock: "staging-stock",
};

const PRODUCTION_LOCAL_PARTS: Record<EmailSenderProfileKey, string> = {
  default: "no-reply",
  order: "order",
  stock: "stock",
};

export const resolveEmailRuntimeEnvironment = (
  env: Env = process.env,
): EmailRuntimeEnvironment => {
  const value = (env.APP_ENV || env.NODE_ENV || "development").toLowerCase();

  if (value === "production") {
    return "production";
  }

  if (value === "staging") {
    return "staging";
  }

  return "development";
};

const formatSender = (displayName: string, localPart: string): string =>
  `${displayName} <${localPart}@${EMAIL_SENDER_ALLOWED_DOMAIN}>`;

const getDefaultLocalParts = (
  environment: EmailRuntimeEnvironment,
): Record<EmailSenderProfileKey, string> =>
  environment === "staging" ? STAGING_LOCAL_PARTS : PRODUCTION_LOCAL_PARTS;

export const buildDefaultSenderProfiles = (
  env: Env = process.env,
): EmailSenderProfile[] => {
  const environment = resolveEmailRuntimeEnvironment(env);
  const localParts = getDefaultLocalParts(environment);

  return EMAIL_SENDER_PROFILE_KEYS.map((key) => ({
    key,
    label: LABELS[key],
    description: DESCRIPTIONS[key],
    from: formatSender(DISPLAY_NAMES[key], localParts[key]),
    reply_to: `support@${EMAIL_SENDER_ALLOWED_DOMAIN}`,
  }));
};

const parseEmailAddress = (value: string): string => {
  const trimmed = value.trim();
  const bracketMatch = trimmed.match(/<([^<>@\s]+@[^<>@\s]+)>$/);

  if (bracketMatch?.[1]) {
    return bracketMatch[1].toLowerCase();
  }

  if (/^[^@\s<>]+@[^@\s<>]+$/.test(trimmed)) {
    return trimmed.toLowerCase();
  }

  throw new Error("Sender email must be a valid email address");
};

const validateDomainPolicy = ({
  address,
  environment,
  field,
}: {
  address: string;
  environment: EmailRuntimeEnvironment;
  field: "Reply-to" | "Sender";
}) => {
  const [localPart, domain] = address.split("@");

  if (domain !== EMAIL_SENDER_ALLOWED_DOMAIN) {
    throw new Error(`${field} email must use @${EMAIL_SENDER_ALLOWED_DOMAIN}`);
  }

  if (field === "Sender" && environment === "staging") {
    if (!localPart.startsWith("staging-")) {
      throw new Error("Staging sender email must start with staging-");
    }
  }

  if (field === "Sender" && environment === "production") {
    if (localPart.startsWith("staging-")) {
      throw new Error("Production sender email must not start with staging-");
    }
  }
};

export const validateSenderProfile = (
  input: EmailSenderProfileInput,
  env: Env = process.env,
): EmailSenderProfileInput => {
  const from = input.from.trim();
  const replyTo = input.reply_to.trim();

  if (!from) {
    throw new Error("Sender email is required");
  }

  if (!replyTo) {
    throw new Error("Reply-to email is required");
  }

  const environment = resolveEmailRuntimeEnvironment(env);
  validateDomainPolicy({
    address: parseEmailAddress(from),
    environment,
    field: "Sender",
  });
  validateDomainPolicy({
    address: parseEmailAddress(replyTo),
    environment,
    field: "Reply-to",
  });

  return {
    from,
    reply_to: replyTo,
  };
};

export const isEmailSenderProfileKey = (
  key: string,
): key is EmailSenderProfileKey =>
  EMAIL_SENDER_PROFILE_KEYS.includes(key as EmailSenderProfileKey);

const getDefaultProfile = (
  key: EmailSenderProfileKey,
  env: Env = process.env,
): EmailSenderProfile =>
  buildDefaultSenderProfiles(env).find((profile) => profile.key === key)!;

export const resolveSenderProfileFromContainer = async (
  container: MedusaContainer,
  key: EmailSenderProfileKey,
  env: Env = process.env,
): Promise<EmailSenderProfile> => {
  try {
    const service = container.resolve<{
      getResolvedSenderProfile: (
        profileKey: EmailSenderProfileKey,
        profileEnv?: Env,
      ) => Promise<EmailSenderProfile>;
    }>(EMAIL_SETTINGS_MODULE);

    return await service.getResolvedSenderProfile(key, env);
  } catch {
    return getDefaultProfile(key, env);
  }
};
