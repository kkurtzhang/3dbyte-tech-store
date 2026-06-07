import {
  buildGuestConsolidationSnapshot,
  getGuestConsolidationIdempotencyKey,
} from "../guest-consolidation-snapshot";

const buildKey = ({
  guestPhone = "0412345678",
  orderCustomerId = "cus_guest",
}: {
  guestPhone?: string | null;
  orderCustomerId?: string | null;
} = {}) =>
  getGuestConsolidationIdempotencyKey({
    customerId: "cus_registered",
    email: "ava@example.com",
    mode: "live",
    snapshot: buildGuestConsolidationSnapshot({
      canonicalCustomer: {
        id: "cus_registered",
        email: "ava@example.com",
        has_account: true,
      },
      guestCustomers: [
        {
          id: "cus_guest",
          email: "ava@example.com",
          has_account: false,
          phone: guestPhone,
        },
      ],
      orders: [
        {
          id: "order_123",
          email: "ava@example.com",
          customer_id: orderCustomerId,
          status: "completed",
          metadata: {},
        },
      ],
      carts: [],
      tickets: [],
      pendingOrderIds: new Set(),
    }),
  });

describe("guest consolidation snapshots", () => {
  it("is stable when the relevant state is unchanged", () => {
    expect(buildKey()).toBe(buildKey());
  });

  it("changes when profile data changes without changing record ids", () => {
    expect(buildKey({ guestPhone: "0412345678" })).not.toBe(
      buildKey({ guestPhone: "0499999999" }),
    );
  });

  it("changes when ownership changes without changing record ids", () => {
    expect(buildKey({ orderCustomerId: "cus_guest" })).not.toBe(
      buildKey({ orderCustomerId: "cus_registered" }),
    );
  });
});
