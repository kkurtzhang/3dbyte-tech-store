import type { MedusaContainer } from "@medusajs/framework/types";
import { Modules } from "@medusajs/framework/utils";

import { ACCOUNT_COORDINATION_MODULE } from "./index";
import { normalizeCustomerEmail } from "./security";
import { sendAccountSecurityNotification } from "./security-notification";

export type EmailChangeCustomer = {
  id: string;
  email?: string | null;
  has_account?: boolean | null;
  metadata?: Record<string, unknown> | null;
};

type ProviderIdentity = {
  id: string;
  provider?: string | null;
  entity_id?: string | null;
};

type AuthIdentity = {
  id: string;
  app_metadata?: Record<string, unknown> | null;
  provider_identities?: ProviderIdentity[] | null;
};

type AuthModule = {
  listAuthIdentities: (
    filters?: Record<string, unknown>,
    config?: Record<string, unknown>,
  ) => Promise<AuthIdentity[]>;
  listProviderIdentities: (
    filters?: Record<string, unknown>,
    config?: Record<string, unknown>,
  ) => Promise<Array<{ id: string }>>;
  updateProviderIdentities: (input: {
    id: string;
    entity_id: string;
  }) => Promise<unknown>;
};

const getMetadata = (customer: EmailChangeCustomer): Record<string, unknown> =>
  customer.metadata && typeof customer.metadata === "object"
    ? customer.metadata
    : {};

const getProviderName = (provider: ProviderIdentity): string =>
  typeof provider.provider === "string"
    ? provider.provider.trim().toLowerCase()
    : "";

const listCustomerIdentities = async (
  authModule: AuthModule,
  customerId: string,
) => {
  const config = { relations: ["provider_identities"], take: 50 };

  try {
    return await authModule.listAuthIdentities(
      { app_metadata: { customer_id: customerId } },
      config,
    );
  } catch {
    const identities = await authModule.listAuthIdentities({}, config);

    return identities.filter(
      (identity) => identity.app_metadata?.customer_id === customerId,
    );
  }
};

export const getPendingEmailChange = (
  customer: EmailChangeCustomer,
): { email: string } | null => {
  const pending = getMetadata(customer).pending_email_change;
  if (!pending || typeof pending !== "object") return null;

  const email = (pending as Record<string, unknown>).email;

  return typeof email === "string"
    ? { email: normalizeCustomerEmail(email) }
    : null;
};

const buildVerifiedMetadata = (
  customer: EmailChangeCustomer,
): Record<string, unknown> => {
  const { pending_email_change: _pending, ...metadata } = getMetadata(customer);

  return {
    ...metadata,
    email_verification_status: "verified",
    email_verified_at: new Date().toISOString(),
  };
};

const isAvailable = async ({
  authModule,
  customerId,
  customerModule,
  email,
  identities,
}: {
  authModule: AuthModule;
  customerId: string;
  customerModule: {
    listCustomers: (
      filters: Record<string, unknown>,
      config?: Record<string, unknown>,
    ) => Promise<EmailChangeCustomer[]>;
  };
  email: string;
  identities: AuthIdentity[];
}) => {
  const [customers, providers] = await Promise.all([
    customerModule.listCustomers({ email, has_account: true }, { take: 10 }),
    authModule.listProviderIdentities(
      { entity_id: email },
      { relations: ["auth_identity"], take: 20 },
    ),
  ]);
  const ownedProviderIds = new Set(
    identities.flatMap((identity) =>
      (identity.provider_identities || []).map((provider) => provider.id),
    ),
  );

  return (
    !customers.some((candidate) => candidate.id !== customerId) &&
    !providers.some((provider) => !ownedProviderIds.has(provider.id))
  );
};

export async function applyPendingEmailChange({
  container,
  customer,
  email,
}: {
  container: MedusaContainer;
  customer: EmailChangeCustomer;
  email: string;
}): Promise<boolean> {
  if (!customer.email) return false;

  const customerModule = container.resolve<{
    listCustomers: (
      filters: Record<string, unknown>,
      config?: Record<string, unknown>,
    ) => Promise<EmailChangeCustomer[]>;
    updateCustomers: (input: {
      id: string;
      email: string;
      metadata: Record<string, unknown>;
    }) => Promise<unknown>;
  }>(Modules.CUSTOMER);
  const authModule = container.resolve<AuthModule>(Modules.AUTH);
  const identities = await listCustomerIdentities(authModule, customer.id);
  const providers = identities.flatMap(
    (identity) => identity.provider_identities || [],
  );

  if (
    providers.some((provider) => getProviderName(provider) === "google") ||
    !(await isAvailable({
      authModule,
      customerId: customer.id,
      customerModule,
      email,
      identities,
    }))
  ) {
    return false;
  }

  const currentEmail = normalizeCustomerEmail(customer.email);
  const emailpassIdentity = providers.find(
    (provider) =>
      getProviderName(provider) === "emailpass" &&
      normalizeCustomerEmail(provider.entity_id || "") === currentEmail,
  );

  if (!emailpassIdentity) return false;

  await authModule.updateProviderIdentities({
    id: emailpassIdentity.id,
    entity_id: email,
  });

  try {
    await customerModule.updateCustomers({
      id: customer.id,
      email,
      metadata: buildVerifiedMetadata(customer),
    });
  } catch (error) {
    await authModule.updateProviderIdentities({
      id: emailpassIdentity.id,
      entity_id: currentEmail,
    });
    throw error;
  }

  const coordinationModule = container.resolve<{
    createAccountSecurityEvents: (
      input: Record<string, unknown>,
    ) => Promise<unknown>;
  }>(ACCOUNT_COORDINATION_MODULE);
  await coordinationModule.createAccountSecurityEvents({
    customer_id: customer.id,
    event_type: "customer.email_change.completed",
    provider: "emailpass",
  });
  await Promise.allSettled([
    sendAccountSecurityNotification({
      container,
      email: currentEmail,
      event: "customer-email-change-completed-old",
      subject: "Your account email was changed",
      message: `Your 3D Byte Tech account email was changed to ${email}.`,
    }),
    sendAccountSecurityNotification({
      container,
      email,
      event: "customer-email-change-completed-new",
      subject: "Your account email was changed",
      message: "This is now the email for your 3D Byte Tech account.",
    }),
  ]);

  return true;
}
