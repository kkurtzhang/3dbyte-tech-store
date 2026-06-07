import { createHash } from "node:crypto";

type CustomerSnapshotRecord = {
  id: string;
  email?: string | null;
  has_account?: boolean | null;
  first_name?: string | null;
  last_name?: string | null;
  phone?: string | null;
  metadata?: Record<string, unknown> | null;
};

type OrderSnapshotRecord = {
  id: string;
  email?: string | null;
  customer_id?: string | null;
  status?: string | null;
  canceled_at?: Date | string | null;
  metadata?: Record<string, unknown> | null;
};

type CartSnapshotRecord = {
  id: string;
  email?: string | null;
  customer_id?: string | null;
  completed_at?: Date | string | null;
};

type TicketSnapshotRecord = {
  id: string;
  customer_email?: string | null;
  customer_id?: string | null;
  metadata?: Record<string, unknown> | null;
};

const getMetadata = (value: {
  metadata?: Record<string, unknown> | null;
}): Record<string, unknown> =>
  value.metadata && typeof value.metadata === "object" ? value.metadata : {};

const toDateState = (
  value: Date | string | null | undefined,
): string | null => {
  if (!value) return null;

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toISOString();
};

export const getOrderDisputeState = (
  order: OrderSnapshotRecord,
): string | boolean | null => {
  const metadata = getMetadata(order);

  if (metadata.has_dispute === true) return true;
  return typeof metadata.dispute_status === "string"
    ? metadata.dispute_status.trim().toLowerCase()
    : null;
};

export const isOrderDisputed = (order: OrderSnapshotRecord): boolean => {
  const state = getOrderDisputeState(order);
  return (
    state === true ||
    (typeof state === "string" &&
      !["", "closed", "resolved", "won"].includes(state))
  );
};

export const buildGuestConsolidationSnapshot = (input: {
  canonicalCustomer: CustomerSnapshotRecord;
  guestCustomers: CustomerSnapshotRecord[];
  orders: OrderSnapshotRecord[];
  carts: CartSnapshotRecord[];
  tickets: TicketSnapshotRecord[];
  pendingOrderIds: Set<string>;
}): string[] => {
  const canonicalMetadata = getMetadata(input.canonicalCustomer);
  const parts = [
    JSON.stringify([
      "canonical_customer",
      input.canonicalCustomer.id,
      input.canonicalCustomer.email || null,
      input.canonicalCustomer.has_account === true,
      input.canonicalCustomer.first_name || null,
      input.canonicalCustomer.last_name || null,
      input.canonicalCustomer.phone || null,
      canonicalMetadata.email_verified_at || null,
    ]),
    ...input.guestCustomers.map((customer) => {
      const metadata = getMetadata(customer);
      return JSON.stringify([
        "guest_customer",
        customer.id,
        customer.email || null,
        customer.has_account === true,
        customer.first_name || null,
        customer.last_name || null,
        customer.phone || null,
        metadata.consolidated_into_customer_id || null,
      ]);
    }),
    ...input.orders.map((order) =>
      JSON.stringify([
        "order",
        order.id,
        order.email || null,
        order.customer_id || null,
        order.status || null,
        toDateState(order.canceled_at),
        getOrderDisputeState(order),
        input.pendingOrderIds.has(order.id),
      ]),
    ),
    ...input.carts.map((cart) =>
      JSON.stringify([
        "cart",
        cart.id,
        cart.email || null,
        cart.customer_id || null,
        toDateState(cart.completed_at),
      ]),
    ),
    ...input.tickets.map((ticket) => {
      const metadata = getMetadata(ticket);
      return JSON.stringify([
        "ticket",
        ticket.id,
        ticket.customer_email || null,
        ticket.customer_id || null,
        metadata.guest_history_consolidated_at || null,
      ]);
    }),
  ];

  return parts.sort();
};

export const getGuestConsolidationIdempotencyKey = (input: {
  customerId: string;
  email: string;
  mode: "dry_run" | "live";
  snapshot: string[];
}): string =>
  createHash("sha256")
    .update(
      JSON.stringify({
        version: 3,
        mode: input.mode,
        customer_id: input.customerId,
        email: input.email,
        snapshot: input.snapshot,
      }),
    )
    .digest("hex");
