import {
  acceptOrderTransferWorkflow,
  requestOrderTransferWorkflow,
} from "@medusajs/medusa/core-flows";
import { Modules } from "@medusajs/framework/utils";

import { SUPPORT_TICKET_MODULE } from "../../support-ticket";
import { ACCOUNT_COORDINATION_MODULE } from "../index";
import { consolidateGuestHistory } from "../consolidate-guest-history";

jest.mock("@medusajs/medusa/core-flows", () => ({
  acceptOrderTransferWorkflow: jest.fn(),
  requestOrderTransferWorkflow: jest.fn(),
}));
jest.mock("../../../emails/renderers/guest-history-consolidated", () => ({
  renderGuestHistoryConsolidatedEmail: jest.fn().mockResolvedValue({
    subject: "Your 3D Byte Tech account is ready",
    html: "<p>Account ready</p>",
    text: "Account ready",
  }),
}));

const mockRequestOrderTransferWorkflow =
  requestOrderTransferWorkflow as jest.MockedFunction<
    typeof requestOrderTransferWorkflow
  >;
const mockAcceptOrderTransferWorkflow =
  acceptOrderTransferWorkflow as jest.MockedFunction<
    typeof acceptOrderTransferWorkflow
  >;

function createDependencies() {
  const customerModule = {
    retrieveCustomer: jest.fn().mockResolvedValue({
      id: "cus_registered",
      email: " Ava@Example.com ",
      has_account: true,
      first_name: null,
      last_name: null,
      phone: null,
      metadata: {},
    }),
    listCustomers: jest.fn().mockResolvedValue([
      {
        id: "cus_registered",
        email: "ava@example.com",
        has_account: true,
      },
      {
        id: "cus_guest",
        email: "AVA@example.com",
        has_account: false,
        first_name: "Ava",
        last_name: "Guest",
        phone: "0412345678",
        metadata: { source: "checkout" },
      },
    ]),
    updateCustomers: jest.fn().mockResolvedValue({}),
  };
  const cartModule = {
    updateCarts: jest.fn().mockResolvedValue({}),
  };
  const supportTicketModule = {
    listSupportTickets: jest.fn().mockResolvedValue([
      {
        id: "spt_123",
        customer_email: "ava@example.com",
        customer_id: null,
        metadata: {},
      },
    ]),
    updateSupportTickets: jest.fn().mockResolvedValue({}),
  };
  const coordinationModule = {
    listGuestConsolidationRuns: jest.fn().mockResolvedValue([]),
    createGuestConsolidationRuns: jest.fn().mockResolvedValue({
      id: "gcr_123",
    }),
    updateGuestConsolidationRuns: jest.fn().mockResolvedValue({
      id: "gcr_123",
    }),
    createAccountSecurityEvents: jest.fn().mockResolvedValue({}),
  };
  let orders = [
    {
      id: "order_email_only",
      email: "ava@example.com",
      customer_id: null,
      status: "completed",
      metadata: {},
    },
    {
      id: "order_guest",
      email: "ava@example.com",
      customer_id: "cus_guest",
      status: "completed",
      metadata: {},
    },
    {
      id: "order_owned",
      email: "ava@example.com",
      customer_id: "cus_registered",
      status: "completed",
      metadata: {},
    },
  ];
  const query = {
    graph: jest.fn(async (input: Record<string, unknown>) => {
      if (input.entity === "order") {
        return { data: orders };
      }

      if (input.entity === "cart") {
        return {
          data: [
            {
              id: "cart_guest",
              email: "ava@example.com",
              customer_id: null,
              completed_at: null,
            },
          ],
        };
      }

      if (input.entity === "order_change") {
        const fields = input.fields as string[];
        if (!fields.includes("actions.details")) {
          return { data: [] };
        }

        const filters = input.filters as { order_id?: string };
        return {
          data: [
            {
              id: `oc_${filters.order_id}`,
              order_id: filters.order_id,
              status: "requested",
              change_type: "transfer",
              actions: [
                {
                  action: "TRANSFER_CUSTOMER",
                  details: { token: `token_${filters.order_id}` },
                },
              ],
            },
          ],
        };
      }

      throw new Error(`Unexpected entity ${String(input.entity)}`);
    }),
  };
  const notificationModule = {
    createNotifications: jest.fn().mockResolvedValue({}),
  };
  const container = {
    resolve: jest.fn((key: string) => {
      if (key === Modules.CUSTOMER) return customerModule;
      if (key === Modules.CART) return cartModule;
      if (key === ACCOUNT_COORDINATION_MODULE) return coordinationModule;
      if (key === SUPPORT_TICKET_MODULE) return supportTicketModule;
      if (key === "query") return query;
      if (key === "notification") return notificationModule;
      throw new Error(`Unexpected module ${key}`);
    }),
  };

  return {
    container,
    customerModule,
    cartModule,
    supportTicketModule,
    coordinationModule,
    query,
    notificationModule,
    setOrders: (nextOrders: typeof orders) => {
      orders = [...nextOrders];
    },
  };
}

describe("consolidateGuestHistory", () => {
  const originalEnv = process.env;
  const requestRun = jest.fn().mockResolvedValue({ result: {} });
  const acceptRun = jest.fn().mockResolvedValue({ result: {} });

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = {
      ...originalEnv,
      CUSTOMER_ACCOUNT_CONSOLIDATION_MODE: "off",
    };
    mockRequestOrderTransferWorkflow.mockReturnValue({
      run: requestRun,
    } as never);
    mockAcceptOrderTransferWorkflow.mockReturnValue({
      run: acceptRun,
    } as never);
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("does not inspect or mutate customer history when consolidation is off", async () => {
    const dependencies = createDependencies();

    const result = await consolidateGuestHistory({
      container: dependencies.container as never,
      customerId: "cus_registered",
    });

    expect(result).toEqual({
      mode: "off",
      status: "disabled",
      transferred_order_ids: [],
    });
    expect(dependencies.customerModule.retrieveCustomer).not.toHaveBeenCalled();
    expect(requestRun).not.toHaveBeenCalled();
  });

  it("records a dry-run summary without mutating commerce data", async () => {
    process.env.CUSTOMER_ACCOUNT_CONSOLIDATION_MODE = "dry_run";
    const dependencies = createDependencies();

    const result = await consolidateGuestHistory({
      container: dependencies.container as never,
      customerId: "cus_registered",
    });

    expect(result).toMatchObject({
      mode: "dry_run",
      status: "completed",
      transferred_order_ids: ["order_email_only", "order_guest"],
      attached_cart_ids: ["cart_guest"],
      attached_support_ticket_ids: ["spt_123"],
    });
    expect(requestRun).not.toHaveBeenCalled();
    expect(dependencies.customerModule.updateCustomers).not.toHaveBeenCalled();
    expect(
      dependencies.coordinationModule.updateGuestConsolidationRuns,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "gcr_123",
        status: "completed",
        transferred_order_ids: ["order_email_only", "order_guest"],
      }),
    );
  });

  it("transfers eligible orders and attaches unowned customer context in live mode", async () => {
    process.env.CUSTOMER_ACCOUNT_CONSOLIDATION_MODE = "live";
    const dependencies = createDependencies();

    const result = await consolidateGuestHistory({
      container: dependencies.container as never,
      customerId: "cus_registered",
    });

    expect(requestRun).toHaveBeenCalledTimes(2);
    expect(requestRun).toHaveBeenNthCalledWith(1, {
      input: expect.objectContaining({
        order_id: "order_email_only",
        customer_id: "cus_registered",
        logged_in_user: "cus_registered",
      }),
    });
    expect(acceptRun).toHaveBeenNthCalledWith(1, {
      input: {
        order_id: "order_email_only",
        token: "token_order_email_only",
      },
    });
    expect(dependencies.cartModule.updateCarts).toHaveBeenCalledWith({
      id: "cart_guest",
      customer_id: "cus_registered",
      email: "ava@example.com",
    });
    expect(
      dependencies.supportTicketModule.updateSupportTickets,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "spt_123",
        customer_id: "cus_registered",
      }),
    );
    expect(dependencies.customerModule.updateCustomers).toHaveBeenCalledWith(
      "cus_registered",
      expect.objectContaining({
        first_name: "Ava",
        last_name: "Guest",
        phone: "0412345678",
      }),
    );
    expect(dependencies.customerModule.updateCustomers).toHaveBeenCalledWith(
      "cus_guest",
      expect.objectContaining({
        metadata: expect.objectContaining({
          consolidated_into_customer_id: "cus_registered",
        }),
      }),
    );
    expect(
      dependencies.customerModule.updateCustomers,
    ).not.toHaveBeenCalledWith(
      "cus_registered",
      expect.objectContaining({
        metadata: expect.objectContaining({
          consolidated_into_customer_id: "cus_registered",
        }),
      }),
    );
    expect(
      dependencies.notificationModule.createNotifications,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "ava@example.com",
        template: "guest-history-consolidated",
        idempotency_key: expect.stringContaining("guest-history-consolidated/"),
      }),
    );
    expect(result.status).toBe("completed");
  });

  it("returns a completed run without repeating mutations", async () => {
    process.env.CUSTOMER_ACCOUNT_CONSOLIDATION_MODE = "live";
    const dependencies = createDependencies();
    dependencies.coordinationModule.listGuestConsolidationRuns.mockResolvedValue(
      [
        {
          id: "gcr_existing",
          mode: "live",
          status: "completed",
          transferred_order_ids: ["order_previous"],
          attached_cart_ids: [],
          attached_support_ticket_ids: [],
          skipped_items: [],
          profile_fields_filled: [],
        },
      ],
    );

    const result = await consolidateGuestHistory({
      container: dependencies.container as never,
      customerId: "cus_registered",
    });

    expect(result).toMatchObject({
      mode: "live",
      status: "completed",
      transferred_order_ids: ["order_previous"],
    });
    expect(
      dependencies.coordinationModule.createGuestConsolidationRuns,
    ).not.toHaveBeenCalled();
    expect(requestRun).not.toHaveBeenCalled();
  });

  it("reuses a failed snapshot run when retrying the same guest history", async () => {
    process.env.CUSTOMER_ACCOUNT_CONSOLIDATION_MODE = "live";
    const dependencies = createDependencies();
    dependencies.coordinationModule.listGuestConsolidationRuns.mockResolvedValue(
      [
        {
          id: "gcr_failed",
          mode: "live",
          status: "failed",
        },
      ],
    );
    dependencies.coordinationModule.updateGuestConsolidationRuns.mockImplementation(
      async (input: Record<string, unknown>) => ({
        id: String(input.id),
        ...input,
      }),
    );

    await consolidateGuestHistory({
      container: dependencies.container as never,
      customerId: "cus_registered",
    });

    expect(
      dependencies.coordinationModule.createGuestConsolidationRuns,
    ).not.toHaveBeenCalled();
    expect(
      dependencies.coordinationModule.updateGuestConsolidationRuns,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "gcr_failed",
        status: "running",
        completed_at: null,
        failure_reason: null,
      }),
    );
    expect(
      dependencies.coordinationModule.updateGuestConsolidationRuns,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "gcr_failed",
        status: "completed",
      }),
    );
    expect(requestRun).toHaveBeenCalledTimes(2);
  });

  it("reuses the latest completed result after live mutations leave no work", async () => {
    process.env.CUSTOMER_ACCOUNT_CONSOLIDATION_MODE = "live";
    const dependencies = createDependencies();
    dependencies.customerModule.retrieveCustomer.mockResolvedValue({
      id: "cus_registered",
      email: "ava@example.com",
      has_account: true,
      first_name: "Ava",
      last_name: "Guest",
      phone: "0412345678",
      metadata: {},
    });
    dependencies.customerModule.listCustomers.mockResolvedValue([
      {
        id: "cus_registered",
        email: "ava@example.com",
        has_account: true,
      },
      {
        id: "cus_guest",
        email: "ava@example.com",
        has_account: false,
        metadata: {
          consolidated_into_customer_id: "cus_registered",
        },
      },
    ]);
    dependencies.supportTicketModule.listSupportTickets.mockResolvedValue([
      {
        id: "spt_123",
        customer_email: "ava@example.com",
        customer_id: "cus_registered",
        metadata: {
          guest_history_consolidated_at: "2026-06-07T00:00:00.000Z",
        },
      },
    ]);
    dependencies.query.graph.mockImplementation(
      async (input: Record<string, unknown>) => {
        if (input.entity === "order") {
          return {
            data: [
              {
                id: "order_owned",
                email: "ava@example.com",
                customer_id: "cus_registered",
                status: "completed",
                metadata: {},
              },
            ],
          };
        }
        if (input.entity === "cart") {
          return {
            data: [
              {
                id: "cart_owned",
                email: "ava@example.com",
                customer_id: "cus_registered",
                completed_at: null,
              },
            ],
          };
        }
        if (input.entity === "order_change") {
          return { data: [] };
        }
        throw new Error(`Unexpected entity ${String(input.entity)}`);
      },
    );
    dependencies.coordinationModule.listGuestConsolidationRuns.mockImplementation(
      async (filters: Record<string, unknown>) =>
        filters.status === "completed"
          ? [
              {
                id: "gcr_previous",
                mode: "live",
                status: "completed",
                transferred_order_ids: ["order_previous"],
                attached_cart_ids: ["cart_previous"],
                attached_support_ticket_ids: [],
                profile_fields_filled: ["first_name"],
              },
            ]
          : [],
    );

    const result = await consolidateGuestHistory({
      container: dependencies.container as never,
      customerId: "cus_registered",
    });

    expect(result).toMatchObject({
      run_id: "gcr_previous",
      transferred_order_ids: ["order_previous"],
      attached_cart_ids: ["cart_previous"],
    });
    expect(
      dependencies.coordinationModule.createGuestConsolidationRuns,
    ).not.toHaveBeenCalled();
    expect(
      dependencies.notificationModule.createNotifications,
    ).not.toHaveBeenCalled();
  });

  it("starts a new idempotent run when later guest activity changes the snapshot", async () => {
    process.env.CUSTOMER_ACCOUNT_CONSOLIDATION_MODE = "live";
    const dependencies = createDependencies();

    await consolidateGuestHistory({
      container: dependencies.container as never,
      customerId: "cus_registered",
    });

    const firstRunInput =
      dependencies.coordinationModule.createGuestConsolidationRuns.mock
        .calls[0][0];
    dependencies.coordinationModule.listGuestConsolidationRuns.mockImplementation(
      async (filters: Record<string, unknown>) =>
        filters.idempotency_key === firstRunInput.idempotency_key
          ? [
              {
                id: "gcr_existing",
                mode: "live",
                status: "completed",
                transferred_order_ids: ["order_email_only", "order_guest"],
              },
            ]
          : [],
    );
    dependencies.coordinationModule.createGuestConsolidationRuns.mockResolvedValue(
      { id: "gcr_later" },
    );
    dependencies.setOrders([
      {
        id: "order_email_only",
        email: "ava@example.com",
        customer_id: "cus_registered",
        status: "completed",
        metadata: {},
      },
      {
        id: "order_guest",
        email: "ava@example.com",
        customer_id: "cus_registered",
        status: "completed",
        metadata: {},
      },
      {
        id: "order_owned",
        email: "ava@example.com",
        customer_id: "cus_registered",
        status: "completed",
        metadata: {},
      },
      {
        id: "order_later_guest",
        email: "ava@example.com",
        customer_id: "cus_guest",
        status: "completed",
        metadata: {},
      },
    ]);

    const result = await consolidateGuestHistory({
      container: dependencies.container as never,
      customerId: "cus_registered",
    });

    const secondRunInput =
      dependencies.coordinationModule.createGuestConsolidationRuns.mock
        .calls[1][0];
    expect(secondRunInput.idempotency_key).not.toBe(
      firstRunInput.idempotency_key,
    );
    expect(requestRun).toHaveBeenCalledTimes(3);
    expect(requestRun).toHaveBeenLastCalledWith({
      input: expect.objectContaining({
        order_id: "order_later_guest",
        customer_id: "cus_registered",
      }),
    });
    expect(result.transferred_order_ids).toEqual(["order_later_guest"]);
  });
});
