import { createHmac, timingSafeEqual } from "node:crypto";

type CreateCustomerEmailVerificationTokenInput = {
  customerId: string;
  email: string;
  expiresInSeconds: number;
  issuedAt?: Date;
  secret: string;
};

type VerifyCustomerEmailVerificationTokenInput = {
  now?: Date;
  secret: string;
};

type CustomerEmailVerificationPayload = {
  customer_id: string;
  email: string;
  exp: number;
  iat: number;
};

type VerificationFailureReason =
  | "expired"
  | "invalid-format"
  | "invalid-payload"
  | "invalid-signature";

type VerificationResult =
  | {
      valid: true;
      payload: CustomerEmailVerificationPayload;
    }
  | {
      valid: false;
      reason: VerificationFailureReason;
    };

const normalizeEmail = (email: string): string => email.trim().toLowerCase();

const base64UrlEncode = (value: string): string =>
  Buffer.from(value, "utf8").toString("base64url");

const sign = (payload: string, secret: string): string =>
  createHmac("sha256", secret).update(payload).digest("base64url");

const safeCompare = (left: string, right: string): boolean => {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  return (
    leftBuffer.length === rightBuffer.length &&
    timingSafeEqual(leftBuffer, rightBuffer)
  );
};

const isPayload = (value: unknown): value is CustomerEmailVerificationPayload => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const payload = value as Record<string, unknown>;

  return (
    typeof payload.customer_id === "string" &&
    typeof payload.email === "string" &&
    typeof payload.exp === "number" &&
    typeof payload.iat === "number"
  );
};

export function createCustomerEmailVerificationToken({
  customerId,
  email,
  expiresInSeconds,
  issuedAt = new Date(),
  secret,
}: CreateCustomerEmailVerificationTokenInput): string {
  const issuedAtSeconds = Math.floor(issuedAt.getTime() / 1000);
  const payload: CustomerEmailVerificationPayload = {
    customer_id: customerId,
    email: normalizeEmail(email),
    exp: issuedAtSeconds + expiresInSeconds,
    iat: issuedAtSeconds,
  };
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));

  return `${encodedPayload}.${sign(encodedPayload, secret)}`;
}

export function verifyCustomerEmailVerificationToken(
  token: string,
  { now = new Date(), secret }: VerifyCustomerEmailVerificationTokenInput,
): VerificationResult {
  const [encodedPayload, signature, extra] = token.split(".");

  if (!encodedPayload || !signature || extra !== undefined) {
    return { valid: false, reason: "invalid-format" };
  }

  if (!safeCompare(signature, sign(encodedPayload, secret))) {
    return { valid: false, reason: "invalid-signature" };
  }

  try {
    const payload = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8"),
    ) as unknown;

    if (!isPayload(payload)) {
      return { valid: false, reason: "invalid-payload" };
    }

    if (payload.exp < Math.floor(now.getTime() / 1000)) {
      return { valid: false, reason: "expired" };
    }

    return { valid: true, payload };
  } catch {
    return { valid: false, reason: "invalid-payload" };
  }
}
