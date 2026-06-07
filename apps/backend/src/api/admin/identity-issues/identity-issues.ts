import { createHash } from "node:crypto";

import type { MedusaContainer } from "@medusajs/framework/types";
import { Modules } from "@medusajs/framework/utils";

import { ACCOUNT_COORDINATION_MODULE } from "../../../modules/account-coordination";

const SCAN_LIMIT = 2_000;

type CustomerRecord = {
  id: string;
  email: string;
  has_account: boolean;
  created_at?: Date | string | null;
};

type ProviderIdentityRecord = {
  provider?: string | null;
};

type AuthIdentityRecord = {
  app_metadata?: Record<string, unknown> | null;
  provider_identities?: ProviderIdentityRecord[] | null;
  created_at?: Date | string | null;
};

type IdentityConflictRecord = {
  id: string;
  customer_id?: string | null;
  normalized_email?: string | null;
  provider?: string | null;
  issue_type: string;
  status?: string | null;
  occurrence_count?: number | null;
  last_seen_at?: Date | string | null;
};

type ConsolidationRunRecord = {
  id: string;
  canonical_customer_id: string;
  normalized_email: string;
  status: string;
  started_at?: Date | string | null;
  completed_at?: Date | string | null;
};

type OAuthLinkIntentRecord = {
  id: string;
  customer_id: string;
  expected_email: string;
  status: string;
  expires_at: Date | string;
  failure_count?: number | null;
  created_at?: Date | string | null;
};

export type AdminIdentityIssue = {
  id: string;
  issue_type: string;
  status: string;
  provider: string | null;
  email: string | null;
  customer_id: string | null;
  occurred_at: string;
  summary: string;
};

export type AdminIdentityIssueFilters = {
  issue_type?: string;
  status?: string;
  provider?: string;
  email?: string;
  date_from?: string;
  date_to?: string;
  limit: number;
  offset: number;
};

type AccountCoordinationService = {
  listIdentityConflicts: (
    filters?: Record<string, unknown>,
    config?: Record<string, unknown>,
  ) => Promise<IdentityConflictRecord[]>;
  listGuestConsolidationRuns: (
    filters?: Record<string, unknown>,
    config?: Record<string, unknown>,
  ) => Promise<ConsolidationRunRecord[]>;
  listOAuthLinkIntents: (
    filters?: Record<string, unknown>,
    config?: Record<string, unknown>,
  ) => Promise<OAuthLinkIntentRecord[]>;
};

const normalizeText = (value?: string | null): string | null => {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  return normalized || null;
};

const toPublicIssueId = (kind: string, value: string): string =>
  `${kind}:${createHash("sha256").update(value).digest("hex").slice(0, 16)}`;

const toIso = (
  value: Date | string | null | undefined,
  fallback: Date,
): string => {
  if (!value) return fallback.toISOString();
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? fallback.toISOString()
    : date.toISOString();
};

const getCustomerId = (identity: AuthIdentityRecord): string | null => {
  const value = identity.app_metadata?.customer_id;
  return typeof value === "string" && value.trim() ? value : null;
};

const belongsToAnotherActor = (identity: AuthIdentityRecord): boolean =>
  Object.entries(identity.app_metadata || {}).some(
    ([key, value]) =>
      key !== "customer_id" &&
      key.endsWith("_id") &&
      typeof value === "string" &&
      Boolean(value.trim()),
  );

const getProviders = (identity: AuthIdentityRecord): string[] =>
  [
    ...new Set(
      (identity.provider_identities || [])
        .map((providerIdentity) => normalizeText(providerIdentity.provider))
        .filter((provider): provider is string => Boolean(provider)),
    ),
  ].sort();

const matchesFilters = (
  issue: AdminIdentityIssue,
  filters: AdminIdentityIssueFilters,
): boolean => {
  if (filters.issue_type && issue.issue_type !== filters.issue_type)
    return false;
  if (filters.status && issue.status !== filters.status) return false;
  if (filters.provider && issue.provider !== normalizeText(filters.provider)) {
    return false;
  }
  if (
    filters.email &&
    !issue.email?.includes(normalizeText(filters.email) || "")
  ) {
    return false;
  }

  const occurredAt = new Date(issue.occurred_at).getTime();
  if (filters.date_from && occurredAt < new Date(filters.date_from).getTime()) {
    return false;
  }
  if (filters.date_to && occurredAt > new Date(filters.date_to).getTime()) {
    return false;
  }

  return true;
};

export async function listAdminIdentityIssues({
  container,
  filters,
  now = new Date(),
}: {
  container: MedusaContainer;
  filters: AdminIdentityIssueFilters;
  now?: Date;
}) {
  const customerModule = container.resolve<{
    listCustomers: (
      filters?: Record<string, unknown>,
      config?: Record<string, unknown>,
    ) => Promise<CustomerRecord[]>;
  }>(Modules.CUSTOMER);
  const authModule = container.resolve<{
    listAuthIdentities: (
      filters?: Record<string, unknown>,
      config?: Record<string, unknown>,
    ) => Promise<AuthIdentityRecord[]>;
  }>(Modules.AUTH);
  const coordinationModule = container.resolve<AccountCoordinationService>(
    ACCOUNT_COORDINATION_MODULE,
  );

  const [customers, authIdentities, conflicts, runs, intents] =
    await Promise.all([
      customerModule.listCustomers({}, { take: SCAN_LIMIT }),
      authModule.listAuthIdentities(
        {},
        { relations: ["provider_identities"], take: SCAN_LIMIT },
      ),
      coordinationModule.listIdentityConflicts(
        {},
        { order: { last_seen_at: "DESC" }, take: SCAN_LIMIT },
      ),
      coordinationModule.listGuestConsolidationRuns(
        {},
        { order: { started_at: "DESC" }, take: SCAN_LIMIT },
      ),
      coordinationModule.listOAuthLinkIntents(
        {},
        { order: { created_at: "DESC" }, take: SCAN_LIMIT },
      ),
    ]);

  const customerById = new Map(
    customers.map((customer) => [customer.id, customer]),
  );
  const providersByCustomer = new Map<string, Set<string>>();
  const issues: AdminIdentityIssue[] = [];

  for (const identity of authIdentities) {
    const customerId = getCustomerId(identity);
    const providers = getProviders(identity);

    if (customerId && customerById.has(customerId)) {
      const existing = providersByCustomer.get(customerId) || new Set<string>();
      providers.forEach((provider) => existing.add(provider));
      providersByCustomer.set(customerId, existing);
      continue;
    }

    if (!customerId && belongsToAnotherActor(identity)) {
      continue;
    }

    issues.push({
      id: `orphan_auth_identity:${issues.length + 1}`,
      issue_type: "orphan_auth_identity",
      status: "open",
      provider: providers[0] || null,
      email: null,
      customer_id: null,
      occurred_at: toIso(identity.created_at, now),
      summary: providers.length
        ? `An unowned ${providers.join(" and ")} login identity needs review.`
        : "An unowned login identity needs review.",
    });
  }

  for (const conflict of conflicts) {
    issues.push({
      id: toPublicIssueId("identity_conflict", conflict.id),
      issue_type: conflict.issue_type,
      status: conflict.status || "open",
      provider: normalizeText(conflict.provider),
      email: normalizeText(conflict.normalized_email),
      customer_id: conflict.customer_id || null,
      occurred_at: toIso(conflict.last_seen_at, now),
      summary:
        (conflict.occurrence_count || 1) > 1
          ? `Identity conflict detected ${conflict.occurrence_count} times.`
          : "Identity conflict needs review.",
    });
  }

  for (const run of runs) {
    if (run.status !== "failed" && run.status !== "partial") continue;

    issues.push({
      id: toPublicIssueId("consolidation", run.id),
      issue_type:
        run.status === "failed"
          ? "consolidation_failed"
          : "consolidation_partial",
      status: run.status,
      provider: null,
      email: normalizeText(run.normalized_email),
      customer_id: run.canonical_customer_id,
      occurred_at: toIso(run.completed_at || run.started_at, now),
      summary:
        run.status === "failed"
          ? "Guest-history consolidation failed and needs review."
          : "Guest-history consolidation completed only partially.",
    });
  }

  for (const intent of intents) {
    const occurredAt = toIso(intent.created_at, now);
    const common = {
      provider: "google",
      email: normalizeText(intent.expected_email),
      customer_id: intent.customer_id,
      occurred_at: occurredAt,
    };

    if (
      intent.status === "pending" &&
      new Date(intent.expires_at).getTime() < now.getTime()
    ) {
      issues.push({
        id: toPublicIssueId("oauth_intent_stale", intent.id),
        issue_type: "oauth_intent_stale",
        status: "stale",
        ...common,
        summary: "A Google account link attempt expired before completion.",
      });
    }

    if ((intent.failure_count || 0) >= 3) {
      issues.push({
        id: toPublicIssueId("oauth_intent_failures", intent.id),
        issue_type: "oauth_intent_repeated_failures",
        status: "open",
        ...common,
        summary: "A Google account link attempt failed repeatedly.",
      });
    }
  }

  const registeredByEmail = new Map<string, CustomerRecord[]>();
  for (const customer of customers) {
    if (!customer.has_account) continue;
    const email = normalizeText(customer.email);
    if (!email) continue;
    const matches = registeredByEmail.get(email) || [];
    registeredByEmail.set(email, [...matches, customer]);

    if ((providersByCustomer.get(customer.id)?.size || 0) === 0) {
      issues.push({
        id: `no_usable_login:${customer.id}`,
        issue_type: "no_usable_login",
        status: "open",
        provider: null,
        email,
        customer_id: customer.id,
        occurred_at: toIso(customer.created_at, now),
        summary: "Registered customer has no usable login method.",
      });
    }
  }

  for (const [email, matches] of registeredByEmail.entries()) {
    if (matches.length < 2) continue;
    const first = [...matches].sort((left, right) =>
      left.id.localeCompare(right.id),
    )[0];
    const duplicateDates = matches
      .map((customer) => toIso(customer.created_at, now))
      .sort();

    issues.push({
      id: `duplicate_registered_customers:${email}`,
      issue_type: "duplicate_registered_customers",
      status: "open",
      provider: null,
      email,
      customer_id: first.id,
      occurred_at: duplicateDates[duplicateDates.length - 1],
      summary: `${matches.length} registered customer records share this email.`,
    });
  }

  const filtered = issues
    .filter((issue) => matchesFilters(issue, filters))
    .sort((left, right) => right.occurred_at.localeCompare(left.occurred_at));

  return {
    issues: filtered.slice(filters.offset, filters.offset + filters.limit),
    count: filtered.length,
    limit: filters.limit,
    offset: filters.offset,
  };
}
