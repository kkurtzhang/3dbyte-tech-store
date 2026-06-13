import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import type { MedusaContainer } from "@medusajs/framework/types";
import { Modules } from "@medusajs/framework/utils";

import { renderCustomerEmailVerificationEmail } from "../../../../emails/renderers/customer-email-verification";
import {
  createCustomerEmailVerificationToken,
  verifyCustomerEmailVerificationToken,
} from "../../../../lib/customer-verification/tokens";
import { resolveSenderProfileFromContainer } from "../../../../lib/email-settings/sender-profiles";
import { consolidateGuestHistory } from "../../../../modules/account-coordination/consolidate-guest-history";
import {
  applyPendingEmailChange,
  getPendingEmailChange,
  type EmailChangeCustomer,
} from "../../../../modules/account-coordination/email-change";

type CustomerRecord = EmailChangeCustomer;

const DEFAULT_TOKEN_EXPIRES_IN_SECONDS = 60 * 60 * 24;

const trimTrailingSlash = (value: string): string => value.replace(/\/$/, "");

const normalizeEmail = (value: string): string => value.trim().toLowerCase();

const getCustomerId = (req: MedusaRequest): string | undefined =>
  (req as { auth_context?: { actor_id?: string } }).auth_context?.actor_id;

const getVerificationSecret = (): string =>
  process.env.CUSTOMER_EMAIL_VERIFICATION_SECRET ||
  process.env.JWT_SECRET ||
  process.env.COOKIE_SECRET ||
  "customer-email-verification-dev-secret";

const getTokenExpiresInSeconds = (): number => {
  const parsed = Number(process.env.CUSTOMER_EMAIL_VERIFICATION_TTL_SECONDS);

  return Number.isFinite(parsed) && parsed > 0
    ? parsed
    : DEFAULT_TOKEN_EXPIRES_IN_SECONDS;
};

const getStorefrontUrl = (): string => {
  const rawValue =
    process.env.STOREFRONT_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SERVICE_URL_STOREFRONT ||
    process.env.SERVICE_FQDN_STOREFRONT ||
    "http://localhost:3001";
  const value = trimTrailingSlash(rawValue);

  return /^https?:\/\//.test(value) ? value : `https://${value}`;
};

const getVerificationUrl = (token: string): string =>
  `${getStorefrontUrl()}/verify-email?token=${encodeURIComponent(token)}`;

const wantsJsonResponse = (req: MedusaRequest): boolean =>
  (req.query as Record<string, unknown> | undefined)?.response === "json";

const respondVerificationResult = (
  req: MedusaRequest,
  res: MedusaResponse,
  {
    redirectTo,
    verified,
  }: {
    redirectTo: string;
    verified: boolean;
  },
): void => {
  if (wantsJsonResponse(req)) {
    res.json({
      verified,
      redirect_to: redirectTo,
    });
    return;
  }

  res.redirect(redirectTo);
};

const getMetadata = (customer: CustomerRecord): Record<string, unknown> =>
  customer.metadata && typeof customer.metadata === "object"
    ? customer.metadata
    : {};

const resolveSenderProfile = async (container: MedusaContainer) =>
  await resolveSenderProfileFromContainer(container, "default");

const buildPendingMetadata = (customer: CustomerRecord) => ({
  ...getMetadata(customer),
  email_verification_status: "pending",
  email_verification_sent_at: new Date().toISOString(),
});

const buildVerifiedMetadata = (customer: CustomerRecord, tokenIat: number) => ({
  ...getMetadata(customer),
  email_verification_status: "verified",
  email_verified_at: new Date().toISOString(),
  email_verification_token_iat: tokenIat,
});

export async function POST(
  req: MedusaRequest,
  res: MedusaResponse,
): Promise<void> {
  const customerId = getCustomerId(req);

  if (!customerId) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  const customerModule = req.scope.resolve<{
    retrieveCustomer: (id: string) => Promise<CustomerRecord>;
    listCustomers: (
      filters: Record<string, unknown>,
      config?: Record<string, unknown>,
    ) => Promise<CustomerRecord[]>;
    updateCustomers: (input: {
      id: string;
      email?: string;
      metadata: Record<string, unknown>;
    }) => Promise<unknown>;
  }>(Modules.CUSTOMER);
  const customer = await customerModule.retrieveCustomer(customerId);

  if (!customer?.email) {
    res.status(400).json({ message: "Customer email is required" });
    return;
  }

  const metadata = getMetadata(customer);
  if (
    metadata.email_verification_status === "verified" ||
    typeof metadata.email_verified_at === "string"
  ) {
    res.json({ sent: false, already_verified: true });
    return;
  }

  const normalizedEmail = normalizeEmail(customer.email);
  const token = createCustomerEmailVerificationToken({
    customerId: customer.id,
    email: normalizedEmail,
    expiresInSeconds: getTokenExpiresInSeconds(),
    secret: getVerificationSecret(),
  });
  const verificationUrl = getVerificationUrl(token);
  const content = await renderCustomerEmailVerificationEmail({
    customerEmail: normalizedEmail,
    verificationUrl,
  });
  const notificationModule = req.scope.resolve<{
    createNotifications: (payload: Record<string, unknown>) => Promise<unknown>;
  }>("notification");
  const senderProfile = await resolveSenderProfile(req.scope);

  await customerModule.updateCustomers({
    id: customer.id,
    metadata: buildPendingMetadata(customer),
  });

  await notificationModule.createNotifications({
    to: normalizedEmail,
    channel: "email",
    template: "customer-email-verification",
    from: senderProfile.from,
    provider_data: {
      reply_to: senderProfile.reply_to,
    },
    idempotency_key: `customer-email-verification/${customer.id}/${Date.now()}`,
    content,
    data: {
      customer_id: customer.id,
      email_metadata: {
        entity_id: customer.id,
        event: "customer.email_verification.requested",
      },
    },
  });

  res.json({ sent: true });
}

export async function GET(
  req: MedusaRequest,
  res: MedusaResponse,
): Promise<void> {
  const token = (req.query as Record<string, unknown> | undefined)?.token;

  if (typeof token !== "string" || token.length === 0) {
    respondVerificationResult(req, res, {
      redirectTo: `${getStorefrontUrl()}/sign-in?verified=0`,
      verified: false,
    });
    return;
  }

  const verification = verifyCustomerEmailVerificationToken(token, {
    secret: getVerificationSecret(),
  });

  if (!verification.valid) {
    respondVerificationResult(req, res, {
      redirectTo: `${getStorefrontUrl()}/sign-in?verified=0`,
      verified: false,
    });
    return;
  }

  const customerModule = req.scope.resolve<{
    retrieveCustomer: (id: string) => Promise<CustomerRecord>;
    updateCustomers: (input: {
      id: string;
      metadata: Record<string, unknown>;
    }) => Promise<unknown>;
  }>(Modules.CUSTOMER);
  const customer = await customerModule.retrieveCustomer(
    verification.payload.customer_id,
  );
  const normalizedCurrentEmail = customer?.email
    ? normalizeEmail(customer.email)
    : null;
  const pendingEmailChange = customer ? getPendingEmailChange(customer) : null;

  if (
    !customer ||
    !customer.email ||
    customer.id !== verification.payload.customer_id
  ) {
    respondVerificationResult(req, res, {
      redirectTo: `${getStorefrontUrl()}/sign-in?verified=0`,
      verified: false,
    });
    return;
  }

  if (
    normalizedCurrentEmail !== verification.payload.email &&
    pendingEmailChange?.email === verification.payload.email
  ) {
    const applied = await applyPendingEmailChange({
      container: req.scope,
      customer,
      email: verification.payload.email,
    });

    respondVerificationResult(req, res, {
      redirectTo: applied
        ? `${getStorefrontUrl()}/account/settings?email=changed`
        : `${getStorefrontUrl()}/account/settings?email=change_failed`,
      verified: applied,
    });
    return;
  }

  if (normalizedCurrentEmail !== verification.payload.email) {
    respondVerificationResult(req, res, {
      redirectTo: `${getStorefrontUrl()}/sign-in?verified=0`,
      verified: false,
    });
    return;
  }

  const existingMetadata = getMetadata(customer);
  const lastTokenIat = existingMetadata.email_verification_token_iat;
  if (
    typeof lastTokenIat === "number" &&
    verification.payload.iat <= lastTokenIat
  ) {
    if (existingMetadata.email_verification_status === "verified") {
      respondVerificationResult(req, res, {
        redirectTo: `${getStorefrontUrl()}/sign-in?verified=1`,
        verified: true,
      });
    } else {
      respondVerificationResult(req, res, {
        redirectTo: `${getStorefrontUrl()}/sign-in?verified=0`,
        verified: false,
      });
    }
    return;
  }

  await customerModule.updateCustomers({
    id: customer.id,
    metadata: buildVerifiedMetadata(customer, verification.payload.iat),
  });

  try {
    await consolidateGuestHistory({
      container: req.scope,
      customerId: customer.id,
    });
  } catch (error) {
    console.error("Guest-history consolidation after verification failed:", {
      customer_id: customer.id,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }

  respondVerificationResult(req, res, {
    redirectTo: `${getStorefrontUrl()}/sign-in?verified=1`,
    verified: true,
  });
}
