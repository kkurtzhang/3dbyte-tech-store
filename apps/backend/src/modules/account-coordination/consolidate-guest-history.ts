import type { MedusaContainer } from "@medusajs/framework/types";
import { Modules } from "@medusajs/framework/utils";
import {
  acceptOrderTransferWorkflow,
  requestOrderTransferWorkflow,
} from "@medusajs/medusa/core-flows";

import { renderGuestHistoryConsolidatedEmail } from "../../emails/renderers/guest-history-consolidated";
import { resolveSenderProfileFromContainer } from "../../lib/email-settings/sender-profiles";
import { SUPPORT_TICKET_MODULE } from "../support-ticket";
import {
  buildGuestConsolidationSnapshot,
  getGuestConsolidationIdempotencyKey,
  isOrderDisputed,
} from "./guest-consolidation-snapshot";
import { ACCOUNT_COORDINATION_MODULE } from "./index";
import {
  getCustomerAccountConsolidationMode,
  normalizeCustomerEmail,
} from "./security";

type CustomerRecord = {
  id: string;
  email?: string | null;
  has_account?: boolean | null;
  first_name?: string | null;
  last_name?: string | null;
  phone?: string | null;
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
  customer_email?: string | null;
  customer_id?: string | null;
  metadata?: Record<string, unknown> | null;
};

type OrderChangeRecord = {
  id: string;
  order_id?: string | null;
  status?: string | null;
  change_type?: string | null;
  actions?: Array<{
    details?: Record<string, unknown> | null;
  }> | null;
};

type ConsolidationRunRecord = {
  id: string;
  mode?: string;
  status?: string;
  transferred_order_ids?: unknown;
  attached_cart_ids?: unknown;
  attached_support_ticket_ids?: unknown;
  skipped_items?: unknown;
  profile_fields_filled?: unknown;
};

export type GuestConsolidationResult = {
  mode: "off" | "dry_run" | "live";
  status: "disabled" | "completed";
  run_id?: string;
  transferred_order_ids: string[];
  attached_cart_ids?: string[];
  attached_support_ticket_ids?: string[];
  skipped_items?: Array<{ id: string; reason: string }>;
  profile_fields_filled?: string[];
};

type QueryService = {
  graph: (input: Record<string, unknown>) => Promise<{ data: unknown[] }>;
};

type CustomerModule = {
  retrieveCustomer: (id: string) => Promise<CustomerRecord>;
  listCustomers: (
    filters: Record<string, unknown>,
  ) => Promise<CustomerRecord[]>;
  updateCustomers: (
    id: string,
    data: Partial<CustomerRecord>,
  ) => Promise<unknown>;
};

type CoordinationModule = {
  listGuestConsolidationRuns: (
    filters: Record<string, unknown>,
    config?: Record<string, unknown>,
  ) => Promise<ConsolidationRunRecord[]>;
  createGuestConsolidationRuns: (
    input: Record<string, unknown>,
  ) => Promise<ConsolidationRunRecord>;
  updateGuestConsolidationRuns: (
    input: Record<string, unknown>,
  ) => Promise<ConsolidationRunRecord>;
  createAccountSecurityEvents: (
    input: Record<string, unknown>,
  ) => Promise<unknown>;
};

const asStringArray = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];

const getMetadata = (value: {
  metadata?: Record<string, unknown> | null;
}): Record<string, unknown> =>
  value.metadata && typeof value.metadata === "object" ? value.metadata : {};

const getTransferToken = (changes: OrderChangeRecord[]): string | null => {
  for (const change of changes) {
    for (const action of change.actions || []) {
      const token = action.details?.token;
      if (typeof token === "string" && token.length > 0) {
        return token;
      }
    }
  }

  return null;
};

const toExistingResult = (
  run: ConsolidationRunRecord,
  mode: "dry_run" | "live",
): GuestConsolidationResult => ({
  mode,
  status: "completed",
  run_id: run.id,
  transferred_order_ids: asStringArray(run.transferred_order_ids),
  attached_cart_ids: asStringArray(run.attached_cart_ids),
  attached_support_ticket_ids: asStringArray(run.attached_support_ticket_ids),
  skipped_items: Array.isArray(run.skipped_items)
    ? (run.skipped_items as Array<{ id: string; reason: string }>)
    : [],
  profile_fields_filled: asStringArray(run.profile_fields_filled),
});

async function getTransferTokenForOrder(
  query: QueryService,
  orderId: string,
): Promise<string> {
  const { data } = await query.graph({
    entity: "order_change",
    fields: [
      "id",
      "order_id",
      "status",
      "change_type",
      "actions.action",
      "actions.details",
    ],
    filters: {
      order_id: orderId,
      status: ["requested"],
      change_type: "transfer",
    },
  });
  const token = getTransferToken(data as OrderChangeRecord[]);

  if (!token) {
    throw new Error(`Order transfer token was not created for ${orderId}`);
  }

  return token;
}

export async function consolidateGuestHistory({
  container,
  customerId,
}: {
  container: MedusaContainer;
  customerId: string;
}): Promise<GuestConsolidationResult> {
  const mode = getCustomerAccountConsolidationMode();

  if (mode === "off") {
    return {
      mode,
      status: "disabled",
      transferred_order_ids: [],
    };
  }

  const customerModule = container.resolve<CustomerModule>(Modules.CUSTOMER);
  const coordinationModule = container.resolve<CoordinationModule>(
    ACCOUNT_COORDINATION_MODULE,
  );
  const query = container.resolve<QueryService>("query");
  const customer = await customerModule.retrieveCustomer(customerId);

  if (!customer.email || customer.has_account === false) {
    throw new Error(
      "A registered customer email is required for consolidation",
    );
  }

  const email = normalizeCustomerEmail(customer.email);
  const matchingCustomers = await customerModule.listCustomers({ email });
  const guestCustomers = matchingCustomers.filter(
    (candidate) =>
      candidate.id !== customerId && candidate.has_account !== true,
  );
  const guestCustomerIds = new Set(
    guestCustomers.map((candidate) => candidate.id),
  );
  const { data: orderData } = await query.graph({
    entity: "order",
    fields: ["id", "email", "customer_id", "status", "canceled_at", "metadata"],
    filters: { email },
  });
  const orders = orderData as OrderRecord[];
  const { data: cartData } = await query.graph({
    entity: "cart",
    fields: ["id", "email", "customer_id", "completed_at"],
    filters: { email },
  });
  const carts = cartData as CartRecord[];
  const supportTicketModule = container.resolve<{
    listSupportTickets: (
      filters: Record<string, unknown>,
    ) => Promise<SupportTicketRecord[]>;
    updateSupportTickets: (input: Record<string, unknown>) => Promise<unknown>;
  }>(SUPPORT_TICKET_MODULE);
  const tickets = await supportTicketModule.listSupportTickets({
    customer_email: email,
  });
  const orderIds = orders.map((order) => order.id);
  const { data: pendingChangeData } = orderIds.length
    ? await query.graph({
        entity: "order_change",
        fields: ["id", "order_id", "status", "change_type"],
        filters: {
          order_id: orderIds,
          status: ["requested"],
          change_type: "transfer",
        },
      })
    : { data: [] };
  const pendingOrderIds = new Set(
    (pendingChangeData as OrderChangeRecord[])
      .map((change) => change.order_id)
      .filter((id): id is string => typeof id === "string"),
  );
  const skippedItems: Array<{ id: string; reason: string }> = [];
  const eligibleOrders = orders.filter((order) => {
    let reason: string | null = null;

    if (normalizeCustomerEmail(order.email || "") !== email) {
      reason = "email_mismatch";
    } else if (order.customer_id === customerId) {
      reason = "already_owned";
    } else if (order.customer_id && !guestCustomerIds.has(order.customer_id)) {
      reason = "owned_by_other_customer";
    } else if (order.canceled_at || order.status === "canceled") {
      reason = "cancelled";
    } else if (isOrderDisputed(order)) {
      reason = "disputed";
    } else if (pendingOrderIds.has(order.id)) {
      reason = "pending_transfer";
    }

    if (reason) {
      skippedItems.push({ id: order.id, reason });
      return false;
    }

    return true;
  });
  const eligibleCarts = carts.filter(
    (cart) =>
      !cart.completed_at &&
      !cart.customer_id &&
      normalizeCustomerEmail(cart.email || "") === email,
  );
  const eligibleTickets = tickets.filter(
    (ticket) =>
      !ticket.customer_id &&
      normalizeCustomerEmail(ticket.customer_email || "") === email,
  );
  const profileSource = guestCustomers.find(
    (guest) => guest.first_name || guest.last_name || guest.phone,
  );
  const profileUpdate = {
    ...(!customer.first_name && profileSource?.first_name
      ? { first_name: profileSource.first_name }
      : {}),
    ...(!customer.last_name && profileSource?.last_name
      ? { last_name: profileSource.last_name }
      : {}),
    ...(!customer.phone && profileSource?.phone
      ? { phone: profileSource.phone }
      : {}),
  };
  const profileFieldsFilled = Object.keys(profileUpdate);
  const guestCustomersToMark = guestCustomers.filter(
    (guest) => getMetadata(guest).consolidated_into_customer_id !== customerId,
  );
  const snapshot = buildGuestConsolidationSnapshot({
    canonicalCustomer: customer,
    guestCustomers,
    orders,
    carts,
    tickets,
    pendingOrderIds,
  });
  const idempotencyKey = getGuestConsolidationIdempotencyKey({
    customerId,
    email,
    mode,
    snapshot,
  });
  const existingRuns = await coordinationModule.listGuestConsolidationRuns({
    idempotency_key: idempotencyKey,
  });
  const existingRun = existingRuns[0];

  if (existingRun?.status === "completed") {
    return toExistingResult(existingRun, mode);
  }

  if (existingRun?.status === "running") {
    throw new Error("Guest-history consolidation is already running");
  }

  const hasActionableChanges =
    eligibleOrders.length > 0 ||
    eligibleCarts.length > 0 ||
    eligibleTickets.length > 0 ||
    profileFieldsFilled.length > 0 ||
    guestCustomersToMark.length > 0;

  if (!hasActionableChanges && !existingRun) {
    const previousCompletedRuns =
      await coordinationModule.listGuestConsolidationRuns(
        {
          canonical_customer_id: customerId,
          normalized_email: email,
          mode,
          status: "completed",
        },
        { order: { completed_at: "DESC" }, take: 1 },
      );
    const previousCompletedRun = previousCompletedRuns[0];

    if (previousCompletedRun) {
      return toExistingResult(previousCompletedRun, mode);
    }
  }

  const run = existingRun
    ? await coordinationModule.updateGuestConsolidationRuns({
        id: existingRun.id,
        status: "running",
        started_at: new Date(),
        completed_at: null,
        failure_reason: null,
      })
    : await coordinationModule.createGuestConsolidationRuns({
        canonical_customer_id: customerId,
        normalized_email: email,
        idempotency_key: idempotencyKey,
        mode,
        status: "running",
        started_at: new Date(),
      });

  try {
    if (mode === "live") {
      for (const order of eligibleOrders) {
        await requestOrderTransferWorkflow(container).run({
          input: {
            order_id: order.id,
            customer_id: customerId,
            logged_in_user: customerId,
            internal_note: "Verified guest-history consolidation",
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
      for (const cart of eligibleCarts) {
        await cartModule.updateCarts({
          id: cart.id,
          customer_id: customerId,
          email,
        });
      }
      for (const ticket of eligibleTickets) {
        await supportTicketModule.updateSupportTickets({
          id: ticket.id,
          customer_id: customerId,
          metadata: {
            ...getMetadata(ticket),
            guest_history_consolidated_at: new Date().toISOString(),
          },
        });
      }
      if (profileFieldsFilled.length) {
        await customerModule.updateCustomers(customerId, profileUpdate);
      }
      for (const guest of guestCustomersToMark) {
        await customerModule.updateCustomers(guest.id, {
          metadata: {
            ...getMetadata(guest),
            consolidated_into_customer_id: customerId,
            guest_history_consolidated_at: new Date().toISOString(),
          },
        });
      }

      if (hasActionableChanges) {
        const notificationModule = container.resolve<{
          createNotifications: (
            input: Record<string, unknown>,
          ) => Promise<unknown>;
        }>("notification");
        const senderProfile = await resolveSenderProfileFromContainer(
          container,
          "default",
        );
        const content = await renderGuestHistoryConsolidatedEmail({
          customerEmail: email,
          transferredOrderCount: eligibleOrders.length,
        });
        await notificationModule.createNotifications({
          to: email,
          channel: "email",
          template: "guest-history-consolidated",
          from: senderProfile.from,
          provider_data: { reply_to: senderProfile.reply_to },
          idempotency_key: `guest-history-consolidated/${idempotencyKey}`,
          content,
          data: {
            customer_id: customerId,
            transferred_order_count: eligibleOrders.length,
          },
        });
      }
    }

    const result: GuestConsolidationResult = {
      mode,
      status: "completed",
      run_id: run.id,
      transferred_order_ids: eligibleOrders.map((order) => order.id),
      attached_cart_ids: eligibleCarts.map((cart) => cart.id),
      attached_support_ticket_ids: eligibleTickets.map((ticket) => ticket.id),
      skipped_items: skippedItems,
      profile_fields_filled: profileFieldsFilled,
    };
    await coordinationModule.updateGuestConsolidationRuns({
      id: run.id,
      status: "completed",
      guest_customer_ids: [...guestCustomerIds],
      transferred_order_ids: result.transferred_order_ids,
      attached_cart_ids: result.attached_cart_ids,
      attached_support_ticket_ids: result.attached_support_ticket_ids,
      skipped_items: skippedItems,
      profile_fields_filled: profileFieldsFilled,
      summary: {
        transferred_order_count: result.transferred_order_ids.length,
        attached_cart_count: result.attached_cart_ids?.length || 0,
        attached_support_ticket_count:
          result.attached_support_ticket_ids?.length || 0,
      },
      completed_at: new Date(),
    });
    await coordinationModule.createAccountSecurityEvents({
      customer_id: customerId,
      event_type: "guest_history.consolidated",
      severity: "info",
      metadata: {
        run_id: run.id,
        mode,
        transferred_order_count: result.transferred_order_ids.length,
      },
    });

    return result;
  } catch (error) {
    await coordinationModule.updateGuestConsolidationRuns({
      id: run.id,
      status: "failed",
      failure_reason:
        error instanceof Error ? error.message : "Unknown consolidation error",
      completed_at: new Date(),
    });
    throw error;
  }
}
