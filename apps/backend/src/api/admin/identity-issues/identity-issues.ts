import { createHash } from "node:crypto";

import type { MedusaContainer } from "@medusajs/framework/types";
import { Modules } from "@medusajs/framework/utils";

import { ACCOUNT_COORDINATION_MODULE } from "../../../modules/account-coordination";
import { getCustomerAccountConsolidationMode } from "../../../modules/account-coordination/security";
import { SUPPORT_TICKET_MODULE } from "../../../modules/support-ticket";
import { selectCanonicalCustomer } from "./identity-resolution";

const SCAN_LIMIT = 2_000;

type CustomerRecord = {
  id: string;
  email: string;
  has_account: boolean;
  first_name?: string | null;
  last_name?: string | null;
  phone?: string | null;
  created_at?: Date | string | null;
};

type ProviderIdentityRecord = {
  provider?: string | null;
  entity_id?: string | null;
  user_metadata?: Record<string, unknown> | null;
  provider_metadata?: Record<string, unknown> | null;
};

type AuthIdentityRecord = {
  id: string;
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

type CustomerActivityRecord = {
  id: string;
  customer_id?: string | null;
};

export type AdminIdentityIssue = {
  id: string;
  issue_type: string;
  status: string;
  provider: string | null;
  email: string | null;
  customer_id: string | null;
  customer: AdminIdentityIssueCustomer | null;
  related_customers: AdminIdentityIssueCustomer[];
  occurred_at: string;
  summary: string;
  resolution: AdminIdentityIssueResolution;
};

export type AdminIdentityIssueCustomer = {
  id: string;
  email: string;
  name: string | null;
  account_type: "guest" | "registered";
  providers: string[];
  created_at: string | null;
};

export type AdminIdentityIssueResolution = {
  action:
    | "delete_orphan_identity"
    | "merge_duplicate_customers"
    | "retry_consolidation"
    | "close_oauth_intent"
    | null;
  allowed: boolean;
  label: string;
  description: string;
  canonical_customer_id?: string;
  affected_customer_ids?: string[];
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

export const toPublicIssueId = (kind: string, value: string): string =>
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

const getMetadataEmail = (
  metadata?: Record<string, unknown> | null,
): string | null => {
  const value = metadata?.email;
  return typeof value === "string" && value.includes("@")
    ? normalizeText(value)
    : null;
};

const getAssertedEmail = (identity: AuthIdentityRecord): string | null => {
  for (const providerIdentity of identity.provider_identities || []) {
    const provider = normalizeText(providerIdentity.provider);
    const metadataEmail =
      getMetadataEmail(providerIdentity.user_metadata) ||
      getMetadataEmail(providerIdentity.provider_metadata);

    if (metadataEmail) return metadataEmail;
    if (provider === "emailpass" && providerIdentity.entity_id?.includes("@")) {
      return normalizeText(providerIdentity.entity_id);
    }
  }

  return null;
};

const getCustomerName = (customer: CustomerRecord): string | null => {
  const name = [customer.first_name, customer.last_name]
    .filter((value): value is string => Boolean(value?.trim()))
    .join(" ")
    .trim();
  return name || null;
};

const toCustomerSummary = (
  customer: CustomerRecord,
  providersByCustomer: Map<string, Set<string>>,
): AdminIdentityIssueCustomer => ({
  id: customer.id,
  email: normalizeText(customer.email) || customer.email,
  name: getCustomerName(customer),
  account_type: customer.has_account ? "registered" : "guest",
  providers: [...(providersByCustomer.get(customer.id) || [])].sort(),
  created_at: customer.created_at
    ? toIso(customer.created_at, new Date(0))
    : null,
});

const noResolution = (
  description: string,
): AdminIdentityIssueResolution => ({
  action: null,
  allowed: false,
  label: "Review required",
  description,
});

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
  const query = container.resolve<{
    graph: (input: Record<string, unknown>) => Promise<{ data: unknown[] }>;
  }>("query");
  const supportTicketModule = container.resolve<{
    listSupportTickets: (
      filters?: Record<string, unknown>,
      config?: Record<string, unknown>,
    ) => Promise<CustomerActivityRecord[]>;
  }>(SUPPORT_TICKET_MODULE);

  const [
    customers,
    authIdentities,
    conflicts,
    runs,
    intents,
    orderResult,
    cartResult,
    tickets,
  ] =
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
      query.graph({
        entity: "order",
        fields: ["id", "customer_id"],
        pagination: { take: SCAN_LIMIT },
      }),
      query.graph({
        entity: "cart",
        fields: ["id", "customer_id"],
        pagination: { take: SCAN_LIMIT },
      }),
      supportTicketModule.listSupportTickets({}, { take: SCAN_LIMIT }),
    ]);

  const customerById = new Map(
    customers.map((customer) => [customer.id, customer]),
  );
  const liveConsolidation =
    getCustomerAccountConsolidationMode() === "live";
  const customersByEmail = new Map<string, CustomerRecord[]>();
  for (const customer of customers) {
    const email = normalizeText(customer.email);
    if (!email) continue;
    customersByEmail.set(email, [
      ...(customersByEmail.get(email) || []),
      customer,
    ]);
  }
  const providersByCustomer = new Map<string, Set<string>>();
  const activityByCustomer = new Map<string, number>();
  const activityRecords = [
    ...(orderResult.data as CustomerActivityRecord[]),
    ...(cartResult.data as CustomerActivityRecord[]),
    ...tickets,
  ];
  for (const record of activityRecords) {
    if (!record.customer_id) continue;
    activityByCustomer.set(
      record.customer_id,
      (activityByCustomer.get(record.customer_id) || 0) + 1,
    );
  }
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

    if (belongsToAnotherActor(identity)) {
      continue;
    }

    const email = getAssertedEmail(identity);
    const matchingCustomers = email ? customersByEmail.get(email) || [] : [];
    const displayCustomer =
      matchingCustomers.find((customer) => !customer.has_account) ||
      matchingCustomers[0] ||
      null;
    const providerLabel =
      providers.length > 0
        ? providers
            .map((provider) =>
              provider === "emailpass" ? "Email/password" : "Google",
            )
            .join(" and ")
        : "Login";
    const ownershipReason = customerId
      ? "points to a missing customer"
      : "is not linked to a customer";
    const matchReason = displayCustomer
      ? ` A matching ${displayCustomer.has_account ? "registered" : "guest"} customer exists, so the stale login identity can be removed safely.`
      : " No matching customer was found, so the unused login identity can be removed safely.";

    issues.push({
      id: toPublicIssueId("orphan_auth_identity", identity.id),
      issue_type: "orphan_auth_identity",
      status: "open",
      provider: providers[0] || null,
      email,
      customer_id: displayCustomer?.id || null,
      customer: displayCustomer
        ? toCustomerSummary(displayCustomer, providersByCustomer)
        : null,
      related_customers: matchingCustomers.map((customer) =>
        toCustomerSummary(customer, providersByCustomer),
      ),
      occurred_at: toIso(identity.created_at, now),
      summary: `${providerLabel} login${email ? ` for ${email}` : ""} ${ownershipReason}.${matchReason}`,
      resolution: {
        action: "delete_orphan_identity",
        allowed: true,
        label: "Remove stale login",
        description:
          "Deletes the orphan provider login and its empty auth identity. Customer and order records are not deleted.",
      },
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
      customer: conflict.customer_id
        ? toCustomerSummary(
            customerById.get(conflict.customer_id) || {
              id: conflict.customer_id,
              email: conflict.normalized_email || "",
              has_account: true,
            },
            providersByCustomer,
          )
        : null,
      related_customers: [],
      occurred_at: toIso(conflict.last_seen_at, now),
      summary:
        (conflict.occurrence_count || 1) > 1
          ? `Identity conflict detected ${conflict.occurrence_count} times.`
          : "Identity conflict needs review.",
      resolution:
        conflict.issue_type === "duplicate_registered_customers"
          ? noResolution(
              "Use the duplicate-customer issue row to preview and merge the matching records.",
            )
          : noResolution(
              "Repair the underlying provider ownership before closing this conflict.",
            ),
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
      customer: customerById.has(run.canonical_customer_id)
        ? toCustomerSummary(
            customerById.get(run.canonical_customer_id)!,
            providersByCustomer,
          )
        : null,
      related_customers: [],
      occurred_at: toIso(run.completed_at || run.started_at, now),
      summary:
        run.status === "failed"
          ? "Guest-history consolidation failed and needs review."
          : "Guest-history consolidation completed only partially.",
      resolution: {
        action: "retry_consolidation",
        allowed:
          liveConsolidation && customerById.has(run.canonical_customer_id),
        label: "Retry consolidation",
        description: liveConsolidation
          ? "Recalculates current eligibility and reruns the idempotent guest-history consolidation workflow."
          : "Set CUSTOMER_ACCOUNT_CONSOLIDATION_MODE=live to rerun this consolidation after reviewing the failed result.",
        canonical_customer_id: run.canonical_customer_id,
      },
    });
  }

  for (const intent of intents) {
    const occurredAt = toIso(intent.created_at, now);
    const common = {
      provider: "google",
      email: normalizeText(intent.expected_email),
      customer_id: intent.customer_id,
      customer: customerById.has(intent.customer_id)
        ? toCustomerSummary(
            customerById.get(intent.customer_id)!,
            providersByCustomer,
          )
        : null,
      related_customers: [],
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
        resolution: {
          action: "close_oauth_intent",
          allowed: true,
          label: "Close expired attempt",
          description:
            "Marks the expired one-time Google link attempt as closed.",
        },
      });
    }

    if (intent.status === "pending" && (intent.failure_count || 0) >= 3) {
      issues.push({
        id: toPublicIssueId("oauth_intent_failures", intent.id),
        issue_type: "oauth_intent_repeated_failures",
        status: "open",
        ...common,
        summary: "A Google account link attempt failed repeatedly.",
        resolution: {
          action: "close_oauth_intent",
          allowed: true,
          label: "Close failed attempt",
          description:
            "Closes this repeatedly failed one-time Google link attempt.",
        },
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
        customer: toCustomerSummary(customer, providersByCustomer),
        related_customers: [],
        occurred_at: toIso(customer.created_at, now),
        summary: "Registered customer has no usable login method.",
        resolution: noResolution(
          "A customer must recover or connect a verified login method; the Admin cannot create credentials on their behalf.",
        ),
      });
    }
  }

  for (const [email, matches] of registeredByEmail.entries()) {
    if (matches.length < 2) continue;
    const canonical = selectCanonicalCustomer(
      matches.map((customer) => ({
        id: customer.id,
        email,
        first_name: customer.first_name,
        last_name: customer.last_name,
        phone: customer.phone,
        created_at: customer.created_at,
        provider_count: providersByCustomer.get(customer.id)?.size || 0,
        activity_count: activityByCustomer.get(customer.id) || 0,
      })),
    );
    const canonicalRecord = matches.find(
      (customer) => customer.id === canonical.id,
    )!;
    const duplicateDates = matches
      .map((customer) => toIso(customer.created_at, now))
      .sort();
    const sortedMatches = [
      canonicalRecord,
      ...matches
        .filter((customer) => customer.id !== canonical.id)
        .sort((left, right) => left.id.localeCompare(right.id)),
    ];
    const loginMethodLabel = `${canonical.provider_count} login ${
      canonical.provider_count === 1 ? "method" : "methods"
    }`;
    const activityLabel = `${canonical.activity_count} linked ${
      canonical.activity_count === 1 ? "record" : "records"
    }`;
    const canonicalLabel =
      getCustomerName(canonicalRecord) || canonicalRecord.email;
    const liveMode = getCustomerAccountConsolidationMode() === "live";
    issues.push({
      id: toPublicIssueId("duplicate_registered_customers", email),
      issue_type: "duplicate_registered_customers",
      status: "open",
      provider: null,
      email,
      customer_id: canonical.id,
      customer: toCustomerSummary(canonicalRecord, providersByCustomer),
      related_customers: sortedMatches.map((customer) =>
        toCustomerSummary(customer, providersByCustomer),
      ),
      occurred_at: duplicateDates[duplicateDates.length - 1],
      summary: `${matches.length} registered customer records share ${email}. Recommended canonical account: ${canonicalLabel} (${loginMethodLabel}, ${activityLabel}).`,
      resolution: {
        action: "merge_duplicate_customers",
        allowed: liveMode,
        label: "Merge duplicate customers",
        description: liveMode
          ? `Keeps ${canonicalLabel} as the canonical account, transfers eligible history, moves login identities, and retains the other records as non-account history.`
          : "Set CUSTOMER_ACCOUNT_CONSOLIDATION_MODE=live to enable this repair after reviewing the recommended canonical account.",
        canonical_customer_id: canonical.id,
        affected_customer_ids: sortedMatches.map((customer) => customer.id),
      },
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
