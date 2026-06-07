import type { MedusaContainer } from "@medusajs/framework/types";
import { Modules } from "@medusajs/framework/utils";

import { verifyAccountReauthToken } from "../../../../../modules/account-coordination/security";
export { sendAccountSecurityNotification } from "../../../../../modules/account-coordination/security-notification";

export type ProviderIdentityRecord = {
  id: string;
  provider?: string | null;
  entity_id?: string | null;
};

export type AuthIdentityRecord = {
  id: string;
  app_metadata?: Record<string, unknown> | null;
  provider_identities?: ProviderIdentityRecord[] | null;
};

export type AuthModule = {
  listAuthIdentities: (
    filters?: Record<string, unknown>,
    config?: Record<string, unknown>,
  ) => Promise<AuthIdentityRecord[]>;
  register: (
    provider: string,
    input: { body: Record<string, string> },
  ) => Promise<{
    success: boolean;
    error?: string;
    authIdentity?: AuthIdentityRecord;
  }>;
  deleteProviderIdentities: (ids: string[]) => Promise<void>;
  deleteAuthIdentities: (ids: string[]) => Promise<void>;
};

export const getCoordinationSecret = (): string => {
  const secret =
    process.env.CUSTOMER_ACCOUNT_COORDINATION_SECRET ||
    process.env.JWT_SECRET ||
    process.env.COOKIE_SECRET;

  if (!secret) {
    throw new Error("CUSTOMER_ACCOUNT_COORDINATION_SECRET must be configured");
  }

  return secret;
};

export const getProviderName = (
  providerIdentity: ProviderIdentityRecord,
): string =>
  typeof providerIdentity.provider === "string"
    ? providerIdentity.provider.trim().toLowerCase()
    : "";

export const listCustomerAuthIdentities = async (
  authModule: AuthModule,
  customerId: string,
): Promise<AuthIdentityRecord[]> => {
  const config = {
    relations: ["provider_identities"],
    take: 50,
  };

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

export const hasProvider = (
  identities: AuthIdentityRecord[],
  provider: string,
): boolean =>
  identities.some((identity) =>
    (identity.provider_identities || []).some(
      (providerIdentity) => getProviderName(providerIdentity) === provider,
    ),
  );

export const hasValidGoogleReauth = (input: {
  token: string;
  customerId: string;
}): boolean =>
  verifyAccountReauthToken(input.token, {
    customerId: input.customerId,
    provider: "google",
    secret: getCoordinationSecret(),
  }).valid;

export const resolveAuthModule = (container: MedusaContainer): AuthModule =>
  container.resolve<AuthModule>(Modules.AUTH);
