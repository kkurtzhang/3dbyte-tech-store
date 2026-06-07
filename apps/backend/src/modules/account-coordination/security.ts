import { createHmac, timingSafeEqual } from "node:crypto";

export type CustomerAccountConsolidationMode = "off" | "dry_run" | "live";

export type OAuthLinkIntentState = {
  customer_id: string;
  expected_email: string;
  nonce_hash: string;
  status: string;
  expires_at: Date | string;
};

export type OAuthLinkIntentEvaluation =
  | { valid: true }
  | {
      valid: false;
      reason:
        | "not_pending"
        | "expired"
        | "customer_mismatch"
        | "email_mismatch"
        | "nonce_mismatch";
    };

export type AccountSecurityWarning =
  | "no_usable_login"
  | "identity_conflict"
  | "consolidation_failed";

type AccountReauthPayload = {
  customer_id: string;
  provider: string;
  iat: number;
  exp: number;
};

type AccountReauthVerification =
  | { valid: true }
  | {
      valid: false;
      reason:
        | "invalid_signature"
        | "invalid_payload"
        | "expired"
        | "customer_mismatch"
        | "provider_mismatch";
    };

export const normalizeCustomerEmail = (value: string): string =>
  value.trim().toLowerCase();

export const getCustomerAccountConsolidationMode = (
  value = process.env.CUSTOMER_ACCOUNT_CONSOLIDATION_MODE,
): CustomerAccountConsolidationMode =>
  value === "dry_run" || value === "live" ? value : "off";

export const isGoogleAutoLinkEnabled = (
  value = process.env.CUSTOMER_GOOGLE_AUTO_LINK_ENABLED,
): boolean => value?.trim().toLowerCase() === "true";

export const hashOpaqueValue = (value: string, secret: string): string =>
  createHmac("sha256", secret).update(value).digest("hex");

const signEncodedValue = (value: string, secret: string): string =>
  createHmac("sha256", secret).update(value).digest("base64url");

const hashesMatch = (left: string, right: string): boolean => {
  const leftBuffer = Buffer.from(left, "hex");
  const rightBuffer = Buffer.from(right, "hex");

  return (
    leftBuffer.length === rightBuffer.length &&
    timingSafeEqual(leftBuffer, rightBuffer)
  );
};

const signaturesMatch = (left: string, right: string): boolean => {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  return (
    leftBuffer.length === rightBuffer.length &&
    timingSafeEqual(leftBuffer, rightBuffer)
  );
};

const isAccountReauthPayload = (
  value: unknown,
): value is AccountReauthPayload => {
  if (!value || typeof value !== "object") return false;

  const payload = value as Record<string, unknown>;

  return (
    typeof payload.customer_id === "string" &&
    typeof payload.provider === "string" &&
    typeof payload.iat === "number" &&
    typeof payload.exp === "number"
  );
};

export const createAccountReauthToken = ({
  customerId,
  provider,
  secret,
  expiresInSeconds,
  issuedAt = new Date(),
}: {
  customerId: string;
  provider: string;
  secret: string;
  expiresInSeconds: number;
  issuedAt?: Date;
}): string => {
  const issuedAtSeconds = Math.floor(issuedAt.getTime() / 1000);
  const encodedPayload = Buffer.from(
    JSON.stringify({
      customer_id: customerId,
      provider: provider.trim().toLowerCase(),
      iat: issuedAtSeconds,
      exp: issuedAtSeconds + expiresInSeconds,
    } satisfies AccountReauthPayload),
  ).toString("base64url");

  return `${encodedPayload}.${signEncodedValue(encodedPayload, secret)}`;
};

export const verifyAccountReauthToken = (
  token: string,
  input: {
    customerId: string;
    provider: string;
    secret: string;
    now?: Date;
  },
): AccountReauthVerification => {
  const [encodedPayload, signature, extra] = token.split(".");

  if (
    !encodedPayload ||
    !signature ||
    extra !== undefined ||
    !signaturesMatch(signature, signEncodedValue(encodedPayload, input.secret))
  ) {
    return { valid: false, reason: "invalid_signature" };
  }

  try {
    const payload = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8"),
    ) as unknown;

    if (!isAccountReauthPayload(payload)) {
      return { valid: false, reason: "invalid_payload" };
    }

    if (payload.exp <= Math.floor((input.now || new Date()).getTime() / 1000)) {
      return { valid: false, reason: "expired" };
    }

    if (payload.customer_id !== input.customerId) {
      return { valid: false, reason: "customer_mismatch" };
    }

    if (payload.provider !== input.provider.trim().toLowerCase()) {
      return { valid: false, reason: "provider_mismatch" };
    }

    return { valid: true };
  } catch {
    return { valid: false, reason: "invalid_payload" };
  }
};

export const evaluateOAuthLinkIntent = (
  intent: OAuthLinkIntentState,
  input: {
    customerId: string;
    verifiedEmail: string;
    nonce: string;
    secret: string;
    now?: Date;
  },
): OAuthLinkIntentEvaluation => {
  if (intent.status !== "pending") {
    return { valid: false, reason: "not_pending" };
  }

  const now = input.now || new Date();
  if (new Date(intent.expires_at).getTime() <= now.getTime()) {
    return { valid: false, reason: "expired" };
  }

  if (intent.customer_id !== input.customerId) {
    return { valid: false, reason: "customer_mismatch" };
  }

  if (
    normalizeCustomerEmail(intent.expected_email) !==
    normalizeCustomerEmail(input.verifiedEmail)
  ) {
    return { valid: false, reason: "email_mismatch" };
  }

  const nonceHash = hashOpaqueValue(input.nonce, input.secret);
  if (!hashesMatch(intent.nonce_hash, nonceHash)) {
    return { valid: false, reason: "nonce_mismatch" };
  }

  return { valid: true };
};

export const deriveAccountSecurityWarnings = (input: {
  hasAccount: boolean;
  providers: string[];
  hasIdentityConflict: boolean;
  consolidationStatus?: string | null;
}): AccountSecurityWarning[] => [
  ...(input.hasAccount && input.providers.length === 0
    ? (["no_usable_login"] as const)
    : []),
  ...(input.hasIdentityConflict ? (["identity_conflict"] as const) : []),
  ...(input.consolidationStatus === "failed"
    ? (["consolidation_failed"] as const)
    : []),
];
