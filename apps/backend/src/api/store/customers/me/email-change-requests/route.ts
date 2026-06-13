import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { Modules } from "@medusajs/framework/utils";
import { z } from "@medusajs/framework/zod";

import { renderCustomerEmailVerificationEmail } from "../../../../../emails/renderers/customer-email-verification";
import { createCustomerEmailVerificationToken } from "../../../../../lib/customer-verification/tokens";
import { resolveSenderProfileFromContainer } from "../../../../../lib/email-settings/sender-profiles";
import { ACCOUNT_COORDINATION_MODULE } from "../../../../../modules/account-coordination";
import { checkAccountSecurityRateLimit } from "../../../../../modules/account-coordination/rate-limit";
import { normalizeCustomerEmail } from "../../../../../modules/account-coordination/security";
import {
  getProviderName,
  hasProvider,
  listCustomerAuthIdentities,
} from "../login-methods/_lib";

export const PostStoreCustomerEmailChangeSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  current_password: z.string().min(1).max(256),
});

type Input = z.infer<typeof PostStoreCustomerEmailChangeSchema>;

type CustomerRecord = {
  id: string;
  email?: string | null;
  has_account?: boolean | null;
  metadata?: Record<string, unknown> | null;
};

type AuthModule = Parameters<typeof listCustomerAuthIdentities>[0] & {
  authenticate: (
    provider: string,
    input: Record<string, unknown>,
  ) => Promise<{
    success: boolean;
    authIdentity?: {
      id: string;
      app_metadata?: Record<string, unknown> | null;
    } | null;
  }>;
  listProviderIdentities: (
    filters?: Record<string, unknown>,
    config?: Record<string, unknown>,
  ) => Promise<Array<{ id: string; provider: string; entity_id: string }>>;
};

const DEFAULT_TOKEN_EXPIRES_IN_SECONDS = 60 * 60;

const getCustomerId = (req: MedusaRequest): string | undefined =>
  (req as MedusaRequest & { auth_context?: { actor_id?: string } }).auth_context
    ?.actor_id;

const getVerificationSecret = (): string =>
  process.env.CUSTOMER_EMAIL_VERIFICATION_SECRET ||
  process.env.JWT_SECRET ||
  process.env.COOKIE_SECRET ||
  "customer-email-verification-dev-secret";

const getStorefrontUrl = (): string => {
  const raw =
    process.env.STOREFRONT_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SERVICE_URL_STOREFRONT ||
    "http://localhost:3001";
  const value = raw.replace(/\/$/, "");

  return /^https?:\/\//.test(value) ? value : `https://${value}`;
};

const getVerificationUrl = (token: string): string =>
  `${getStorefrontUrl()}/verify-email?token=${encodeURIComponent(token)}`;

const getMetadata = (customer: CustomerRecord): Record<string, unknown> =>
  customer.metadata && typeof customer.metadata === "object"
    ? customer.metadata
    : {};

const hasRegisteredCustomerCollision = async ({
  customerId,
  customerModule,
  email,
}: {
  customerId: string;
  customerModule: {
    listCustomers: (
      filters: Record<string, unknown>,
      config?: Record<string, unknown>,
    ) => Promise<CustomerRecord[]>;
  };
  email: string;
}) => {
  const customers = await customerModule.listCustomers(
    { email, has_account: true },
    { take: 10 },
  );

  return customers.some((customer) => customer.id !== customerId);
};

const hasProviderCollision = async ({
  authModule,
  customerId,
  email,
}: {
  authModule: AuthModule;
  customerId: string;
  email: string;
}) => {
  const providerIdentities = await authModule.listProviderIdentities(
    { entity_id: email },
    { relations: ["auth_identity"], take: 20 },
  );

  if (!providerIdentities.length) return false;

  const customerIdentities = await listCustomerAuthIdentities(
    authModule,
    customerId,
  );
  const ownedProviderIds = new Set(
    customerIdentities.flatMap((identity) =>
      (identity.provider_identities || []).map((provider) => provider.id),
    ),
  );

  return providerIdentities.some(
    (providerIdentity) => !ownedProviderIds.has(providerIdentity.id),
  );
};

export async function POST(
  req: MedusaRequest,
  res: MedusaResponse,
): Promise<void> {
  const customerId = getCustomerId(req);

  if (!customerId) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  const rate = checkAccountSecurityRateLimit(customerId, "email_change");
  if (!rate.allowed) {
    res.setHeader(
      "Retry-After",
      Math.ceil(rate.retryAfterMs / 1000).toString(),
    );
    res.status(429).json({
      message: "Too many email change attempts. Please try again later.",
      code: "rate_limited",
    });
    return;
  }

  const input =
    (req as MedusaRequest & { validatedBody?: Input }).validatedBody ||
    (req.body as Input);
  const nextEmail = normalizeCustomerEmail(input.email);
  const customerModule = req.scope.resolve<{
    retrieveCustomer: (id: string) => Promise<CustomerRecord>;
    listCustomers: (
      filters: Record<string, unknown>,
      config?: Record<string, unknown>,
    ) => Promise<CustomerRecord[]>;
    updateCustomers: (
      id: string,
      data: {
        metadata: Record<string, unknown>;
      },
    ) => Promise<unknown>;
  }>(Modules.CUSTOMER);
  const customer = await customerModule.retrieveCustomer(customerId);
  const currentEmail = customer.email
    ? normalizeCustomerEmail(customer.email)
    : "";

  if (!currentEmail || currentEmail === nextEmail) {
    res.status(400).json({
      message: "Enter a different email address",
      code: "email_unchanged",
    });
    return;
  }

  const authModule = req.scope.resolve<AuthModule>(Modules.AUTH);
  const identities = await listCustomerAuthIdentities(authModule, customerId);

  if (hasProvider(identities, "google")) {
    res.status(409).json({
      message:
        "Disconnect Google before changing the account email, then reconnect it with the new email.",
      code: "google_disconnect_required",
    });
    return;
  }

  if (!hasProvider(identities, "emailpass")) {
    res.status(409).json({
      message: "Password login is required before changing the account email.",
      code: "emailpass_required",
    });
    return;
  }

  if (
    await hasRegisteredCustomerCollision({
      customerId,
      customerModule,
      email: nextEmail,
    })
  ) {
    res.status(409).json({
      message: "That email address is unavailable.",
      code: "email_unavailable",
    });
    return;
  }

  if (
    await hasProviderCollision({
      authModule,
      customerId,
      email: nextEmail,
    })
  ) {
    res.status(409).json({
      message: "That email address is unavailable.",
      code: "email_unavailable",
    });
    return;
  }

  const authentication = await authModule.authenticate("emailpass", {
    url: req.url,
    headers: req.headers,
    query: req.query,
    protocol: req.protocol,
    authScope: "customer",
    body: {
      email: currentEmail,
      password: input.current_password,
    },
  });

  if (
    !authentication.success ||
    authentication.authIdentity?.app_metadata?.customer_id !== customerId
  ) {
    res.status(403).json({
      message: "Current password is incorrect.",
      code: "reauth_failed",
    });
    return;
  }

  const token = createCustomerEmailVerificationToken({
    customerId,
    email: nextEmail,
    expiresInSeconds: DEFAULT_TOKEN_EXPIRES_IN_SECONDS,
    secret: getVerificationSecret(),
  });
  const content = await renderCustomerEmailVerificationEmail({
    customerEmail: nextEmail,
    verificationUrl: getVerificationUrl(token),
    purpose: "email_change",
  });
  const senderProfile = await resolveSenderProfileFromContainer(
    req.scope,
    "default",
  );
  const notificationModule = req.scope.resolve<{
    createNotifications: (input: Record<string, unknown>) => Promise<unknown>;
  }>("notification");

  await customerModule.updateCustomers(customerId, {
    metadata: {
      ...getMetadata(customer),
      pending_email_change: {
        email: nextEmail,
        requested_at: new Date().toISOString(),
      },
    },
  });
  await notificationModule.createNotifications({
    to: nextEmail,
    channel: "email",
    template: "customer-email-change",
    from: senderProfile.from,
    provider_data: { reply_to: senderProfile.reply_to },
    idempotency_key: `customer-email-change/${customerId}/${Date.now()}`,
    content,
    data: {
      customer_id: customerId,
      email_metadata: {
        entity_id: customerId,
        event: "customer.email_change.requested",
      },
    },
  });
  const coordinationModule = req.scope.resolve<{
    createAccountSecurityEvents: (
      input: Record<string, unknown>,
    ) => Promise<unknown>;
  }>(ACCOUNT_COORDINATION_MODULE);
  await coordinationModule.createAccountSecurityEvents({
    customer_id: customerId,
    event_type: "customer.email_change.requested",
    provider: "emailpass",
  });

  res.json({ sent: true, email: nextEmail });
}
