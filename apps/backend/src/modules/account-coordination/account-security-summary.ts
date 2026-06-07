import type { MedusaContainer } from "@medusajs/framework/types";
import { Modules } from "@medusajs/framework/utils";

import { ACCOUNT_COORDINATION_MODULE } from "./index";
import {
  deriveAccountSecurityWarnings,
  normalizeCustomerEmail,
} from "./security";

type CustomerRecord = {
  id: string;
  email?: string | null;
  has_account?: boolean | null;
  metadata?: Record<string, unknown> | null;
};

type ProviderIdentityRecord = {
  provider?: string | null;
  created_at?: Date | string | null;
};

type AuthIdentityRecord = {
  app_metadata?: Record<string, unknown> | null;
  provider_identities?: ProviderIdentityRecord[] | null;
};

type ConsolidationRunRecord = {
  status?: string | null;
  transferred_order_ids?: unknown;
  completed_at?: Date | string | null;
};

type SecurityEventRecord = {
  event_type: string;
  provider?: string | null;
  severity?: string | null;
  created_at?: Date | string | null;
};

const asStringArray = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];

const getProviderName = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const provider = value.trim().toLowerCase();
  return provider || null;
};

const getVerificationStatus = (metadata: Record<string, unknown>): string => {
  if (
    metadata.email_verification_status === "verified" ||
    typeof metadata.email_verified_at === "string"
  ) {
    return "verified";
  }

  return typeof metadata.email_verification_status === "string"
    ? metadata.email_verification_status
    : "unknown";
};

export async function buildAccountSecuritySummary({
  container,
  customerId,
}: {
  container: MedusaContainer;
  customerId: string;
}) {
  const customerModule = container.resolve<{
    retrieveCustomer: (id: string) => Promise<CustomerRecord>;
  }>(Modules.CUSTOMER);
  const authModule = container.resolve<{
    listAuthIdentities: (
      filters: Record<string, unknown>,
      config?: Record<string, unknown>,
    ) => Promise<AuthIdentityRecord[]>;
  }>(Modules.AUTH);
  const coordinationModule = container.resolve<{
    listGuestConsolidationRuns: (
      filters: Record<string, unknown>,
      config?: Record<string, unknown>,
    ) => Promise<ConsolidationRunRecord[]>;
    listIdentityConflicts: (
      filters: Record<string, unknown>,
      config?: Record<string, unknown>,
    ) => Promise<unknown[]>;
    listAccountSecurityEvents: (
      filters: Record<string, unknown>,
      config?: Record<string, unknown>,
    ) => Promise<SecurityEventRecord[]>;
  }>(ACCOUNT_COORDINATION_MODULE);
  const [customer, identities, runs, conflicts, events] = await Promise.all([
    customerModule.retrieveCustomer(customerId),
    authModule.listAuthIdentities(
      { app_metadata: { customer_id: customerId } },
      { relations: ["provider_identities"], take: 50 },
    ),
    coordinationModule.listGuestConsolidationRuns(
      { canonical_customer_id: customerId },
      { order: { created_at: "DESC" }, take: 1 },
    ),
    coordinationModule.listIdentityConflicts(
      { customer_id: customerId, status: "open" },
      { take: 1 },
    ),
    coordinationModule.listAccountSecurityEvents(
      { customer_id: customerId },
      { order: { created_at: "DESC" }, take: 10 },
    ),
  ]);
  const linkedAtByProvider = new Map<string, string | null>();

  for (const identity of identities) {
    for (const providerIdentity of identity.provider_identities || []) {
      const provider = getProviderName(providerIdentity.provider);
      if (!provider) continue;

      const linkedAt = providerIdentity.created_at
        ? new Date(providerIdentity.created_at).toISOString()
        : null;
      const existing = linkedAtByProvider.get(provider);

      if (!existing || (linkedAt && linkedAt < existing)) {
        linkedAtByProvider.set(provider, linkedAt);
      }
    }
  }

  const providers = [...linkedAtByProvider.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([provider, linkedAt]) => ({
      provider,
      linked: true,
      linked_at: linkedAt,
    }));
  const metadata =
    customer.metadata && typeof customer.metadata === "object"
      ? customer.metadata
      : {};
  const consolidation = runs[0];
  const consolidationStatus = consolidation?.status || "not_run";
  const recentEvents = events.map((event) => ({
    event_type: event.event_type,
    provider: event.provider || null,
    severity: event.severity || "info",
    created_at: event.created_at
      ? new Date(event.created_at).toISOString()
      : null,
  }));

  return {
    customer_id: customer.id,
    account_type: customer.has_account === true ? "registered" : "guest",
    email: {
      value: customer.email ? normalizeCustomerEmail(customer.email) : null,
      verification_status: getVerificationStatus(metadata),
      verified_at:
        typeof metadata.email_verified_at === "string"
          ? metadata.email_verified_at
          : null,
    },
    providers,
    consolidation: {
      status: consolidationStatus,
      transferred_order_count: asStringArray(
        consolidation?.transferred_order_ids,
      ).length,
      completed_at: consolidation?.completed_at
        ? new Date(consolidation.completed_at).toISOString()
        : null,
    },
    last_security_event: recentEvents[0] || null,
    recent_security_events: recentEvents,
    warnings: deriveAccountSecurityWarnings({
      hasAccount: customer.has_account === true,
      providers: providers.map((provider) => provider.provider),
      hasIdentityConflict: conflicts.length > 0,
      consolidationStatus,
    }),
  };
}
