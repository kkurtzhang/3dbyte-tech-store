import type { MedusaContainer } from "@medusajs/framework/types";
import { Modules } from "@medusajs/framework/utils";

import { ACCOUNT_COORDINATION_MODULE } from "../../../modules/account-coordination";
import { consolidateGuestHistory } from "../../../modules/account-coordination/consolidate-guest-history";
import { normalizeCustomerEmail } from "../../../modules/account-coordination/security";
import { toPublicIssueId } from "./identity-issues";
import {
  deleteOrphanAuthIdentity,
  mergeDuplicateRegisteredCustomers,
} from "./identity-repairs";

type AuthIdentityRecord = {
  id: string;
  app_metadata?: Record<string, unknown> | null;
};

type CustomerRecord = {
  id: string;
  email?: string | null;
  has_account?: boolean | null;
};

type ConsolidationRunRecord = {
  id: string;
  canonical_customer_id: string;
  status: string;
};

type OAuthLinkIntentRecord = {
  id: string;
  customer_id: string;
  status: string;
};

type CoordinationModule = {
  listGuestConsolidationRuns: (
    filters?: Record<string, unknown>,
    config?: Record<string, unknown>,
  ) => Promise<ConsolidationRunRecord[]>;
  listOAuthLinkIntents: (
    filters?: Record<string, unknown>,
    config?: Record<string, unknown>,
  ) => Promise<OAuthLinkIntentRecord[]>;
  updateOAuthLinkIntents: (
    input: Record<string, unknown>,
  ) => Promise<unknown>;
  createAccountSecurityEvents: (
    input: Record<string, unknown>,
  ) => Promise<unknown>;
};

const issueKind = (issueId: string): string => issueId.split(":", 1)[0];

const notFound = (): never => {
  throw new Error("Identity issue no longer exists");
};

const recordAdminResolution = async ({
  action,
  adminId,
  container,
  customerId,
  issueId,
  metadata = {},
}: {
  action: string;
  adminId: string;
  container: MedusaContainer;
  customerId: string | null;
  issueId: string;
  metadata?: Record<string, unknown>;
}) => {
  const coordinationModule =
    container.resolve<CoordinationModule>(ACCOUNT_COORDINATION_MODULE);
  await coordinationModule.createAccountSecurityEvents({
    customer_id: customerId,
    event_type: `admin.${action}`,
    severity: "info",
    metadata: {
      admin_id: adminId,
      issue_id: issueId,
      ...metadata,
    },
  });
};

const resolveOrphan = async ({
  adminId,
  container,
  issueId,
}: {
  adminId: string;
  container: MedusaContainer;
  issueId: string;
}) => {
  const authModule = container.resolve<{
    listAuthIdentities: (
      filters?: Record<string, unknown>,
      config?: Record<string, unknown>,
    ) => Promise<AuthIdentityRecord[]>;
  }>(Modules.AUTH);
  const identities = await authModule.listAuthIdentities(
    {},
    { relations: ["provider_identities"], take: 2_000 },
  );
  const identity = identities.find(
    (candidate) =>
      toPublicIssueId("orphan_auth_identity", candidate.id) === issueId,
  );
  if (!identity) return notFound();

  return deleteOrphanAuthIdentity({
    adminId,
    authIdentityId: identity.id,
    container,
    publicIssueId: issueId,
  });
};

const resolveDuplicateCustomers = async ({
  adminId,
  container,
  issueId,
}: {
  adminId: string;
  container: MedusaContainer;
  issueId: string;
}) => {
  const customerModule = container.resolve<{
    listCustomers: (
      filters?: Record<string, unknown>,
      config?: Record<string, unknown>,
    ) => Promise<CustomerRecord[]>;
  }>(Modules.CUSTOMER);
  const customers = await customerModule.listCustomers(
    {},
    { take: 2_000 },
  );
  const registeredByEmail = new Map<string, CustomerRecord[]>();
  for (const customer of customers) {
    if (!customer.has_account || !customer.email) continue;
    const email = normalizeCustomerEmail(customer.email);
    registeredByEmail.set(email, [
      ...(registeredByEmail.get(email) || []),
      customer,
    ]);
  }
  const match = [...registeredByEmail.entries()].find(
    ([email, matches]) =>
      matches.length > 1 &&
      toPublicIssueId("duplicate_registered_customers", email) === issueId,
  );
  if (!match) return notFound();

  return mergeDuplicateRegisteredCustomers({
    adminId,
    container,
    email: match[0],
    publicIssueId: issueId,
  });
};

const retryConsolidation = async ({
  adminId,
  container,
  issueId,
}: {
  adminId: string;
  container: MedusaContainer;
  issueId: string;
}) => {
  const coordinationModule =
    container.resolve<CoordinationModule>(ACCOUNT_COORDINATION_MODULE);
  const runs = await coordinationModule.listGuestConsolidationRuns(
    { status: ["failed", "partial"] },
    { take: 2_000 },
  );
  const run = runs.find(
    (candidate) =>
      toPublicIssueId("consolidation", candidate.id) === issueId,
  );
  if (!run) return notFound();

  const result = await consolidateGuestHistory({
    container,
    customerId: run.canonical_customer_id,
  });
  await recordAdminResolution({
    action: "guest_history_consolidation.retried",
    adminId,
    container,
    customerId: run.canonical_customer_id,
    issueId,
    metadata: {
      mode: result.mode,
      transferred_order_count: result.transferred_order_ids.length,
    },
  });

  return {
    action: "retry_consolidation" as const,
    canonical_customer_id: run.canonical_customer_id,
    mode: result.mode,
    transferred_order_count: result.transferred_order_ids.length,
  };
};

const closeOAuthIntent = async ({
  adminId,
  container,
  issueId,
}: {
  adminId: string;
  container: MedusaContainer;
  issueId: string;
}) => {
  const coordinationModule =
    container.resolve<CoordinationModule>(ACCOUNT_COORDINATION_MODULE);
  const intents = await coordinationModule.listOAuthLinkIntents(
    {},
    { take: 2_000 },
  );
  const intent = intents.find(
    (candidate) =>
      toPublicIssueId("oauth_intent_stale", candidate.id) === issueId ||
      toPublicIssueId("oauth_intent_failures", candidate.id) === issueId,
  );
  if (!intent) return notFound();

  await coordinationModule.updateOAuthLinkIntents({
    id: intent.id,
    status: "cancelled",
    used_at: new Date(),
    last_failure_reason: "Closed by administrator",
  });
  await recordAdminResolution({
    action: "oauth_link_intent.closed",
    adminId,
    container,
    customerId: intent.customer_id,
    issueId,
  });

  return {
    action: "close_oauth_intent" as const,
    customer_id: intent.customer_id,
  };
};

export async function resolveAdminIdentityIssue({
  adminId,
  container,
  issueId,
}: {
  adminId: string;
  container: MedusaContainer;
  issueId: string;
}) {
  switch (issueKind(issueId)) {
    case "orphan_auth_identity":
      return resolveOrphan({ adminId, container, issueId });
    case "duplicate_registered_customers":
      return resolveDuplicateCustomers({ adminId, container, issueId });
    case "consolidation":
      return retryConsolidation({ adminId, container, issueId });
    case "oauth_intent_stale":
    case "oauth_intent_failures":
      return closeOAuthIntent({ adminId, container, issueId });
    default:
      return notFound();
  }
}
