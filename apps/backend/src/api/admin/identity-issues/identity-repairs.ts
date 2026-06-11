import type { MedusaContainer } from "@medusajs/framework/types";
import { Modules } from "@medusajs/framework/utils";
import {
  acceptOrderTransferWorkflow,
  requestOrderTransferWorkflow,
  setAuthAppMetadataWorkflow,
} from "@medusajs/medusa/core-flows";

import { ACCOUNT_COORDINATION_MODULE } from "../../../modules/account-coordination";
import { isOrderDisputed } from "../../../modules/account-coordination/guest-consolidation-snapshot";
import {
  getCustomerAccountConsolidationMode,
  normalizeCustomerEmail,
} from "../../../modules/account-coordination/security";
import { SUPPORT_TICKET_MODULE } from "../../../modules/support-ticket";
import {
  selectCanonicalCustomer,
  type MergeCandidate,
} from "./identity-resolution";

type ProviderIdentityRecord = {
  id: string;
  provider?: string | null;
};

type AuthIdentityRecord = {
  id: string;
  app_metadata?: Record<string, unknown> | null;
  provider_identities?: ProviderIdentityRecord[] | null;
};

type CustomerRecord = {
  id: string;
  email?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  phone?: string | null;
  has_account?: boolean | null;
  created_at?: Date | string | null;
  metadata?: Record<string, unknown> | null;
};

type OrderRecord = {
  id: string;
  email?: string | null;
  customer_id?: string | null;
  status?: string | null;
  canceled_at?: Date | string | null;
  metadata?: Record<string, unknown> | null;
};

type CartRecord = {
  id: string;
  email?: string | null;
  customer_id?: string | null;
  completed_at?: Date | string | null;
};

type SupportTicketRecord = {
  id: string;
  customer_id?: string | null;
  metadata?: Record<string, unknown> | null;
};

type OrderChangeRecord = {
  order_id?: string | null;
  actions?: Array<{ details?: Record<string, unknown> | null }> | null;
};

type QueryService = {
  graph: (input: Record<string, unknown>) => Promise<{ data: unknown[] }>;
};

const getMetadata = (record: {
  metadata?: Record<string, unknown> | null;
}): Record<string, unknown> =>
  record.metadata && typeof record.metadata === "object" ? record.metadata : {};

const getIdentityCustomerId = (
  identity: AuthIdentityRecord,
): string | null => {
  const value = identity.app_metadata?.customer_id;
  return typeof value === "string" && value.trim() ? value : null;
};

const hasAnotherActor = (identity: AuthIdentityRecord): boolean =>
  Object.entries(identity.app_metadata || {}).some(
    ([key, value]) =>
      key !== "customer_id" &&
      key.endsWith("_id") &&
      typeof value === "string" &&
      Boolean(value.trim()),
  );

const countDistinctProviders = (identities: AuthIdentityRecord[]): number =>
  new Set(
    identities.flatMap((identity) =>
      (identity.provider_identities || [])
        .map((providerIdentity) => providerIdentity.provider?.trim())
        .filter((provider): provider is string => Boolean(provider)),
    ),
  ).size;

export const assertAuthIdentityCanMoveToCustomer = (
  identity: AuthIdentityRecord,
): void => {
  if (hasAnotherActor(identity)) {
    throw new Error("This auth identity belongs to another actor type");
  }
};

const createAuditEvent = async ({
  container,
  customerId,
  eventType,
  metadata,
}: {
  container: MedusaContainer;
  customerId: string | null;
  eventType: string;
  metadata: Record<string, unknown>;
}) => {
  const coordinationModule = container.resolve<{
    createAccountSecurityEvents: (
      input: Record<string, unknown>,
    ) => Promise<unknown>;
  }>(ACCOUNT_COORDINATION_MODULE);

  await coordinationModule.createAccountSecurityEvents({
    customer_id: customerId,
    event_type: eventType,
    severity: "info",
    metadata,
  });
};

export async function deleteOrphanAuthIdentity({
  adminId,
  authIdentityId,
  container,
  publicIssueId,
}: {
  adminId: string;
  authIdentityId: string;
  container: MedusaContainer;
  publicIssueId: string;
}) {
  const authModule = container.resolve<{
    retrieveAuthIdentity: (
      id: string,
      config?: Record<string, unknown>,
    ) => Promise<AuthIdentityRecord>;
    deleteProviderIdentities: (ids: string[]) => Promise<void>;
    deleteAuthIdentities: (ids: string[]) => Promise<void>;
  }>(Modules.AUTH);
  const identity = await authModule.retrieveAuthIdentity(authIdentityId, {
    relations: ["provider_identities"],
  });

  assertAuthIdentityCanMoveToCustomer(identity);

  const customerId = getIdentityCustomerId(identity);
  if (customerId) {
    const customerModule = container.resolve<{
      listCustomers: (
        filters?: Record<string, unknown>,
        config?: Record<string, unknown>,
      ) => Promise<CustomerRecord[]>;
    }>(Modules.CUSTOMER);
    const owners = await customerModule.listCustomers({ id: customerId });
    if (owners.length) {
      throw new Error("This auth identity is owned by an active customer");
    }
  }

  const providerIds = (identity.provider_identities || []).map(
    (providerIdentity) => providerIdentity.id,
  );
  if (providerIds.length) {
    await authModule.deleteProviderIdentities(providerIds);
  }
  await authModule.deleteAuthIdentities([identity.id]);
  await createAuditEvent({
    container,
    customerId: null,
    eventType: "admin.identity_issue.resolved",
    metadata: {
      action: "delete_orphan_identity",
      admin_id: adminId,
      issue_id: publicIssueId,
      provider_count: providerIds.length,
    },
  });

  return {
    action: "delete_orphan_identity" as const,
    removed_provider_count: providerIds.length,
  };
}

const getTransferToken = (changes: OrderChangeRecord[]): string | null => {
  for (const change of changes) {
    for (const action of change.actions || []) {
      const token = action.details?.token;
      if (typeof token === "string" && token) return token;
    }
  }
  return null;
};

const getTransferTokenForOrder = async (
  query: QueryService,
  orderId: string,
): Promise<string> => {
  const { data } = await query.graph({
    entity: "order_change",
    fields: ["actions.details"],
    filters: {
      order_id: orderId,
      status: ["requested"],
      change_type: "transfer",
    },
  });
  const token = getTransferToken(data as OrderChangeRecord[]);
  if (!token) throw new Error(`Order transfer token missing for ${orderId}`);
  return token;
};

const buildCandidates = ({
  authIdentities,
  carts,
  customers,
  orders,
  tickets,
}: {
  authIdentities: AuthIdentityRecord[];
  carts: CartRecord[];
  customers: CustomerRecord[];
  orders: OrderRecord[];
  tickets: SupportTicketRecord[];
}): MergeCandidate[] =>
  customers.map((customer) => ({
    id: customer.id,
    email: normalizeCustomerEmail(customer.email || ""),
    first_name: customer.first_name,
    last_name: customer.last_name,
    phone: customer.phone,
    created_at: customer.created_at,
    provider_count: countDistinctProviders(
      authIdentities.filter(
        (identity) => getIdentityCustomerId(identity) === customer.id,
      ),
    ),
    activity_count:
      orders.filter((order) => order.customer_id === customer.id).length +
      carts.filter((cart) => cart.customer_id === customer.id).length +
      tickets.filter((ticket) => ticket.customer_id === customer.id).length,
  }));

export async function mergeDuplicateRegisteredCustomers({
  adminId,
  container,
  email,
  publicIssueId,
}: {
  adminId: string;
  container: MedusaContainer;
  email: string;
  publicIssueId: string;
}) {
  if (getCustomerAccountConsolidationMode() !== "live") {
    throw new Error(
      "Duplicate-customer repair requires CUSTOMER_ACCOUNT_CONSOLIDATION_MODE=live",
    );
  }

  const normalizedEmail = normalizeCustomerEmail(email);
  const customerModule = container.resolve<{
    listCustomers: (
      filters: Record<string, unknown>,
    ) => Promise<CustomerRecord[]>;
    updateCustomers: (input: Record<string, unknown>) => Promise<unknown>;
  }>(Modules.CUSTOMER);
  const authModule = container.resolve<{
    listAuthIdentities: (
      filters?: Record<string, unknown>,
      config?: Record<string, unknown>,
    ) => Promise<AuthIdentityRecord[]>;
  }>(Modules.AUTH);
  const query = container.resolve<QueryService>("query");
  const supportTicketModule = container.resolve<{
    listSupportTickets: (
      filters: Record<string, unknown>,
    ) => Promise<SupportTicketRecord[]>;
    updateSupportTickets: (input: Record<string, unknown>) => Promise<unknown>;
  }>(SUPPORT_TICKET_MODULE);
  const [matchingCustomers, authIdentities, orderResult, cartResult, tickets] =
    await Promise.all([
      customerModule.listCustomers({ email: normalizedEmail }),
      authModule.listAuthIdentities(
        {},
        { relations: ["provider_identities"], take: 2_000 },
      ),
      query.graph({
        entity: "order",
        fields: [
          "id",
          "email",
          "customer_id",
          "status",
          "canceled_at",
          "metadata",
        ],
        filters: { email: normalizedEmail },
      }),
      query.graph({
        entity: "cart",
        fields: ["id", "email", "customer_id", "completed_at"],
        filters: { email: normalizedEmail },
      }),
      supportTicketModule.listSupportTickets({
        customer_email: normalizedEmail,
      }),
    ]);
  const registeredCustomers = matchingCustomers.filter(
    (customer) => customer.has_account === true,
  );
  if (registeredCustomers.length < 2) {
    throw new Error("Duplicate registered customers no longer exist");
  }

  const orders = orderResult.data as OrderRecord[];
  const carts = cartResult.data as CartRecord[];
  const canonical = selectCanonicalCustomer(
    buildCandidates({
      authIdentities,
      carts,
      customers: registeredCustomers,
      orders,
      tickets,
    }),
  );
  const sourceCustomers = registeredCustomers.filter(
    (customer) => customer.id !== canonical.id,
  );
  const sourceIds = new Set(sourceCustomers.map((customer) => customer.id));
  const movedIdentities = authIdentities.filter((identity) => {
    const customerId = getIdentityCustomerId(identity);
    return Boolean(customerId && sourceIds.has(customerId));
  });
  for (const identity of movedIdentities) {
    assertAuthIdentityCanMoveToCustomer(identity);
  }

  const sourceOrderIds = orders
    .filter((order) => order.customer_id && sourceIds.has(order.customer_id))
    .map((order) => order.id);
  const { data: pendingTransferData } = sourceOrderIds.length
    ? await query.graph({
        entity: "order_change",
        fields: ["order_id"],
        filters: {
          order_id: sourceOrderIds,
          status: ["requested"],
          change_type: "transfer",
        },
      })
    : { data: [] };
  const pendingOrderIds = new Set(
    (pendingTransferData as OrderChangeRecord[])
      .map((change) => change.order_id)
      .filter((id): id is string => Boolean(id)),
  );
  const eligibleOrders = orders.filter(
    (order) =>
      Boolean(order.customer_id && sourceIds.has(order.customer_id)) &&
      !order.canceled_at &&
      order.status !== "canceled" &&
      !isOrderDisputed(order) &&
      !pendingOrderIds.has(order.id),
  );

  for (const order of eligibleOrders) {
    await requestOrderTransferWorkflow(container).run({
      input: {
        order_id: order.id,
        customer_id: canonical.id,
        logged_in_user: canonical.id,
        internal_note: `Admin duplicate-account merge (${publicIssueId})`,
      },
    });
    const token = await getTransferTokenForOrder(query, order.id);
    await acceptOrderTransferWorkflow(container).run({
      input: { order_id: order.id, token },
    });
  }

  const cartModule = container.resolve<{
    updateCarts: (input: Record<string, unknown>) => Promise<unknown>;
  }>(Modules.CART);
  const eligibleCarts = carts.filter(
    (cart) =>
      Boolean(cart.customer_id && sourceIds.has(cart.customer_id)) &&
      !cart.completed_at,
  );
  for (const cart of eligibleCarts) {
    await cartModule.updateCarts({
      id: cart.id,
      customer_id: canonical.id,
      email: normalizedEmail,
    });
  }

  const eligibleTickets = tickets.filter(
    (ticket) => Boolean(ticket.customer_id && sourceIds.has(ticket.customer_id)),
  );
  for (const ticket of eligibleTickets) {
    await supportTicketModule.updateSupportTickets({
      id: ticket.id,
      customer_id: canonical.id,
      metadata: {
        ...getMetadata(ticket),
        duplicate_customer_merged_at: new Date().toISOString(),
      },
    });
  }

  for (const identity of movedIdentities) {
    await setAuthAppMetadataWorkflow(container).run({
      input: {
        authIdentityId: identity.id,
        actorType: "customer",
        value: null,
      },
    });
    await setAuthAppMetadataWorkflow(container).run({
      input: {
        authIdentityId: identity.id,
        actorType: "customer",
        value: canonical.id,
      },
    });
  }

  const canonicalRecord = registeredCustomers.find(
    (customer) => customer.id === canonical.id,
  )!;
  const profileSource = sourceCustomers.find(
    (customer) => customer.first_name || customer.last_name || customer.phone,
  );
  const profileUpdate = {
    ...(!canonicalRecord.first_name && profileSource?.first_name
      ? { first_name: profileSource.first_name }
      : {}),
    ...(!canonicalRecord.last_name && profileSource?.last_name
      ? { last_name: profileSource.last_name }
      : {}),
    ...(!canonicalRecord.phone && profileSource?.phone
      ? { phone: profileSource.phone }
      : {}),
  };
  if (Object.keys(profileUpdate).length) {
    await customerModule.updateCustomers({
      id: canonical.id,
      ...profileUpdate,
    });
  }
  for (const source of sourceCustomers) {
    await customerModule.updateCustomers({
      id: source.id,
      has_account: false,
      metadata: {
        ...getMetadata(source),
        merged_into_customer_id: canonical.id,
        registered_customer_merged_at: new Date().toISOString(),
      },
    });
  }

  const coordinationModule = container.resolve<{
    listIdentityConflicts: (
      filters: Record<string, unknown>,
    ) => Promise<Array<{ id: string }>>;
    updateIdentityConflicts: (
      input: Record<string, unknown>,
    ) => Promise<unknown>;
  }>(ACCOUNT_COORDINATION_MODULE);
  const conflicts = await coordinationModule.listIdentityConflicts({
    normalized_email: normalizedEmail,
    issue_type: "duplicate_registered_customers",
    status: "open",
  });
  for (const conflict of conflicts) {
    await coordinationModule.updateIdentityConflicts({
      id: conflict.id,
      status: "resolved",
      resolved_at: new Date(),
    });
  }

  await createAuditEvent({
    container,
    customerId: canonical.id,
    eventType: "admin.customer_accounts.merged",
    metadata: {
      action: "merge_duplicate_customers",
      admin_id: adminId,
      issue_id: publicIssueId,
      source_customer_count: sourceCustomers.length,
      transferred_order_count: eligibleOrders.length,
      attached_cart_count: eligibleCarts.length,
      attached_support_ticket_count: eligibleTickets.length,
      moved_auth_identity_count: movedIdentities.length,
    },
  });

  return {
    action: "merge_duplicate_customers" as const,
    canonical_customer_id: canonical.id,
    affected_customer_count: registeredCustomers.length,
    transferred_order_count: eligibleOrders.length,
    attached_cart_count: eligibleCarts.length,
    attached_support_ticket_count: eligibleTickets.length,
    moved_auth_identity_count: movedIdentities.length,
  };
}
