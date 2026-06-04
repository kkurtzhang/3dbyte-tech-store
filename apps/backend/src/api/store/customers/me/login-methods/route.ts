import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { Modules } from "@medusajs/framework/utils";

type ProviderIdentityRecord = {
  provider?: string | null;
  provider_id?: string | null;
};

type AuthIdentityRecord = {
  id: string;
  app_metadata?: Record<string, unknown> | null;
  provider_identities?: ProviderIdentityRecord[] | null;
};

type AuthModule = {
  listAuthIdentities: (
    filters?: Record<string, unknown>,
    config?: Record<string, unknown>,
  ) => Promise<AuthIdentityRecord[]>;
};

type RequestWithAuthContext = MedusaRequest & {
  auth_context?: {
    actor_id?: string;
  };
};

const getCustomerId = (req: MedusaRequest): string | undefined =>
  (req as RequestWithAuthContext).auth_context?.actor_id;

const normalizeProvider = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }

  const provider = value.trim().toLowerCase();

  return provider || null;
};

const getProviderName = (
  providerIdentity: ProviderIdentityRecord,
): string | null =>
  normalizeProvider(providerIdentity.provider) ||
  normalizeProvider(providerIdentity.provider_id);

const getProviders = (identities: AuthIdentityRecord[]): string[] => {
  const providers = new Set<string>();

  for (const identity of identities) {
    for (const providerIdentity of identity.provider_identities || []) {
      const provider = getProviderName(providerIdentity);

      if (provider) {
        providers.add(provider);
      }
    }
  }

  return [...providers].sort();
};

const listCustomerAuthIdentities = async (
  authModule: AuthModule,
  customerId: string,
): Promise<AuthIdentityRecord[]> => {
  const config = {
    relations: ["provider_identities"],
    take: 20,
  };

  try {
    return await authModule.listAuthIdentities(
      {
        app_metadata: { customer_id: customerId },
      },
      config,
    );
  } catch {
    const identities = await authModule.listAuthIdentities({}, config);

    return identities.filter(
      (identity) => identity.app_metadata?.customer_id === customerId,
    );
  }
};

export async function GET(
  req: MedusaRequest,
  res: MedusaResponse,
): Promise<void> {
  const customerId = getCustomerId(req);

  if (!customerId) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  const authModule = req.scope.resolve<AuthModule>(Modules.AUTH);
  const identities = await listCustomerAuthIdentities(authModule, customerId);
  const providers = getProviders(identities);

  res.json({
    login_methods: {
      emailpass: providers.includes("emailpass"),
      google: providers.includes("google"),
      providers,
    },
  });
}
