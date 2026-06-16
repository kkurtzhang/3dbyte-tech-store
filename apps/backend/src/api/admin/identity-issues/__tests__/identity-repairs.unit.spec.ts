import { Modules } from "@medusajs/framework/utils";
import {
  acceptOrderTransferWorkflow,
  requestOrderTransferWorkflow,
  setAuthAppMetadataWorkflow,
} from "@medusajs/medusa/core-flows";

import { ACCOUNT_COORDINATION_MODULE } from "../../../../modules/account-coordination";
import { SUPPORT_TICKET_MODULE } from "../../../../modules/support-ticket";
import {
  assertAuthIdentityCanMoveToCustomer,
  deleteOrphanAuthIdentity,
  mergeDuplicateRegisteredCustomers,
} from "../identity-repairs";

jest.mock("@medusajs/medusa/core-flows", () => ({
  acceptOrderTransferWorkflow: jest.fn(),
  requestOrderTransferWorkflow: jest.fn(),
  setAuthAppMetadataWorkflow: jest.fn(),
}));

const mockRequestTransfer = requestOrderTransferWorkflow as jest.Mock;
const mockAcceptTransfer = acceptOrderTransferWorkflow as jest.Mock;
const mockSetAuthMetadata = setAuthAppMetadataWorkflow as jest.Mock;

describe("identity issue repairs", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.CUSTOMER_ACCOUNT_CONSOLIDATION_MODE;
  });

  it("deletes an orphan provider identity and its empty auth identity", async () => {
    const authModule = {
      deleteProviderIdentities: jest.fn().mockResolvedValue(undefined),
      deleteAuthIdentities: jest.fn().mockResolvedValue(undefined),
      retrieveAuthIdentity: jest.fn().mockResolvedValue({
        id: "auth_orphan",
        app_metadata: { customer_id: "cus_missing" },
        provider_identities: [
          { id: "pi_google", provider: "google" },
          { id: "pi_email", provider: "emailpass" },
        ],
      }),
    };
    const coordinationModule = {
      createAccountSecurityEvents: jest.fn().mockResolvedValue({}),
    };
    const container = {
      resolve: jest.fn((key: string) => {
        if (key === Modules.AUTH) return authModule;
        if (key === Modules.CUSTOMER) {
          return { listCustomers: jest.fn().mockResolvedValue([]) };
        }
        if (key === ACCOUNT_COORDINATION_MODULE) return coordinationModule;
        throw new Error(`Unexpected dependency: ${key}`);
      }),
    };

    const result = await deleteOrphanAuthIdentity({
      adminId: "user_admin",
      authIdentityId: "auth_orphan",
      container: container as never,
      publicIssueId: "orphan_auth_identity:public",
    });

    expect(authModule.deleteProviderIdentities).toHaveBeenCalledWith([
      "pi_google",
      "pi_email",
    ]);
    expect(authModule.deleteAuthIdentities).toHaveBeenCalledWith([
      "auth_orphan",
    ]);
    expect(coordinationModule.createAccountSecurityEvents).toHaveBeenCalledWith(
      expect.objectContaining({
        customer_id: null,
        event_type: "admin.identity_issue.resolved",
        metadata: {
          action: "delete_orphan_identity",
          admin_id: "user_admin",
          issue_id: "orphan_auth_identity:public",
          provider_count: 2,
        },
      }),
    );
    expect(JSON.stringify(result)).not.toContain("auth_orphan");
    expect(JSON.stringify(result)).not.toContain("pi_google");
  });

  it("never deletes an auth identity that still belongs to a current customer", async () => {
    const authModule = {
      deleteProviderIdentities: jest.fn(),
      deleteAuthIdentities: jest.fn(),
      retrieveAuthIdentity: jest.fn().mockResolvedValue({
        id: "auth_owned",
        app_metadata: { customer_id: "cus_active" },
        provider_identities: [{ id: "pi_email", provider: "emailpass" }],
      }),
    };
    const container = {
      resolve: jest.fn((key: string) => {
        if (key === Modules.AUTH) return authModule;
        if (key === Modules.CUSTOMER) {
          return {
            listCustomers: jest
              .fn()
              .mockResolvedValue([{ id: "cus_active", has_account: true }]),
          };
        }
        throw new Error(`Unexpected dependency: ${key}`);
      }),
    };

    await expect(
      deleteOrphanAuthIdentity({
        adminId: "user_admin",
        authIdentityId: "auth_owned",
        container: container as never,
        publicIssueId: "orphan_auth_identity:public",
      }),
    ).rejects.toThrow("owned by an active customer");
    expect(authModule.deleteProviderIdentities).not.toHaveBeenCalled();
    expect(authModule.deleteAuthIdentities).not.toHaveBeenCalled();
  });

  it("aborts orphan cleanup when customer ownership cannot be checked", async () => {
    const authModule = {
      deleteProviderIdentities: jest.fn(),
      deleteAuthIdentities: jest.fn(),
      retrieveAuthIdentity: jest.fn().mockResolvedValue({
        id: "auth_uncertain",
        app_metadata: { customer_id: "cus_uncertain" },
        provider_identities: [{ id: "pi_email", provider: "emailpass" }],
      }),
    };
    const lookupError = new Error("customer database unavailable");
    const container = {
      resolve: jest.fn((key: string) => {
        if (key === Modules.AUTH) return authModule;
        if (key === Modules.CUSTOMER) {
          return { listCustomers: jest.fn().mockRejectedValue(lookupError) };
        }
        throw new Error(`Unexpected dependency: ${key}`);
      }),
    };

    await expect(
      deleteOrphanAuthIdentity({
        adminId: "user_admin",
        authIdentityId: "auth_uncertain",
        container: container as never,
        publicIssueId: "orphan_auth_identity:public",
      }),
    ).rejects.toBe(lookupError);
    expect(authModule.deleteProviderIdentities).not.toHaveBeenCalled();
    expect(authModule.deleteAuthIdentities).not.toHaveBeenCalled();
  });

  it("rejects moving an auth identity that belongs to another actor type", () => {
    expect(() =>
      assertAuthIdentityCanMoveToCustomer({
        id: "auth_admin",
        app_metadata: {
          customer_id: "cus_duplicate",
          user_id: "user_admin",
        },
      }),
    ).toThrow("belongs to another actor type");
  });

  it("merges duplicate registered customers into the safest canonical account", async () => {
    process.env.CUSTOMER_ACCOUNT_CONSOLIDATION_MODE = "live";
    const customers = [
      {
        id: "cus_old",
        email: "owner@example.com",
        first_name: null,
        last_name: null,
        has_account: true,
        created_at: "2026-06-01T00:00:00.000Z",
        metadata: {},
      },
      {
        id: "cus_login",
        email: "owner@example.com",
        first_name: "Primary",
        last_name: "Owner",
        has_account: true,
        created_at: "2026-06-02T00:00:00.000Z",
        metadata: {},
      },
    ];
    const customerModule = {
      listCustomers: jest.fn().mockResolvedValue(customers),
      updateCustomers: jest.fn().mockResolvedValue({}),
    };
    const authModule = {
      listAuthIdentities: jest.fn().mockResolvedValue([
        {
          id: "auth_old",
          app_metadata: { customer_id: "cus_old" },
          provider_identities: [{ id: "pi_email", provider: "emailpass" }],
        },
        {
          id: "auth_login",
          app_metadata: { customer_id: "cus_login" },
          provider_identities: [
            { id: "pi_google", provider: "google" },
            { id: "pi_email", provider: "emailpass" },
          ],
        },
      ]),
    };
    const supportTicketModule = {
      listSupportTickets: jest
        .fn()
        .mockResolvedValue([
          { id: "ticket_1", customer_id: "cus_old", metadata: {} },
        ]),
      updateSupportTickets: jest.fn().mockResolvedValue({}),
    };
    const cartModule = {
      updateCarts: jest.fn().mockResolvedValue({}),
    };
    const coordinationModule = {
      createAccountSecurityEvents: jest.fn().mockResolvedValue({}),
      listIdentityConflicts: jest.fn().mockResolvedValue([]),
      updateIdentityConflicts: jest.fn().mockResolvedValue({}),
    };
    const query = {
      graph: jest.fn(async ({ entity, fields }: Record<string, unknown>) => {
        if (entity === "order" && Array.isArray(fields)) {
          return {
            data: [
              {
                id: "order_1",
                customer_id: "cus_old",
                email: "owner@example.com",
                status: "completed",
              },
            ],
          };
        }
        if (entity === "cart") {
          return {
            data: [
              {
                id: "cart_1",
                customer_id: "cus_old",
                email: "owner@example.com",
                completed_at: null,
              },
            ],
          };
        }
        if (entity === "order_change") {
          const isTokenLookup =
            Array.isArray(fields) && fields.includes("actions.details");
          return {
            data: isTokenLookup
              ? [{ actions: [{ details: { token: "transfer-token" } }] }]
              : [],
          };
        }
        throw new Error(`Unexpected graph entity: ${String(entity)}`);
      }),
    };
    const container = {
      resolve: jest.fn((key: string) => {
        if (key === Modules.CUSTOMER) return customerModule;
        if (key === Modules.AUTH) return authModule;
        if (key === Modules.CART) return cartModule;
        if (key === ACCOUNT_COORDINATION_MODULE) return coordinationModule;
        if (key === SUPPORT_TICKET_MODULE) return supportTicketModule;
        if (key === "query") return query;
        throw new Error(`Unexpected dependency: ${key}`);
      }),
    };
    const requestRun = jest.fn().mockResolvedValue({});
    const acceptRun = jest.fn().mockResolvedValue({});
    const setMetadataRun = jest.fn().mockResolvedValue({});
    mockRequestTransfer.mockReturnValue({ run: requestRun });
    mockAcceptTransfer.mockReturnValue({ run: acceptRun });
    mockSetAuthMetadata.mockReturnValue({ run: setMetadataRun });

    const result = await mergeDuplicateRegisteredCustomers({
      adminId: "user_admin",
      container: container as never,
      email: "owner@example.com",
      publicIssueId: "duplicate_registered_customers:public",
    });

    expect(result).toMatchObject({
      action: "merge_duplicate_customers",
      canonical_customer_id: "cus_login",
      affected_customer_count: 2,
      transferred_order_count: 1,
      moved_auth_identity_count: 1,
    });
    expect(requestRun).toHaveBeenCalledWith({
      input: expect.objectContaining({
        order_id: "order_1",
        customer_id: "cus_login",
      }),
    });
    expect(acceptRun).toHaveBeenCalledWith({
      input: { order_id: "order_1", token: "transfer-token" },
    });
    expect(setMetadataRun).toHaveBeenNthCalledWith(1, {
      input: {
        authIdentityId: "auth_old",
        actorType: "customer",
        value: null,
      },
    });
    expect(setMetadataRun).toHaveBeenNthCalledWith(2, {
      input: {
        authIdentityId: "auth_old",
        actorType: "customer",
        value: "cus_login",
      },
    });
    expect(customerModule.updateCustomers).toHaveBeenCalledWith(
      "cus_old",
      expect.objectContaining({
        has_account: false,
        metadata: expect.objectContaining({
          merged_into_customer_id: "cus_login",
        }),
      }),
    );
    expect(coordinationModule.createAccountSecurityEvents).toHaveBeenCalledWith(
      expect.objectContaining({
        customer_id: "cus_login",
        event_type: "admin.customer_accounts.merged",
        metadata: expect.not.objectContaining({
          transfer_token: expect.anything(),
        }),
      }),
    );
  });

  it("selects the same canonical customer when duplicate provider identities exist", async () => {
    process.env.CUSTOMER_ACCOUNT_CONSOLIDATION_MODE = "live";
    const customerModule = {
      listCustomers: jest.fn().mockResolvedValue([
        {
          id: "cus_old",
          email: "owner@example.com",
          has_account: true,
          created_at: "2026-06-01T00:00:00.000Z",
          metadata: {},
        },
        {
          id: "cus_duplicate_google",
          email: "owner@example.com",
          has_account: true,
          created_at: "2026-06-02T00:00:00.000Z",
          metadata: {},
        },
      ]),
      updateCustomers: jest.fn().mockResolvedValue({}),
    };
    const authModule = {
      listAuthIdentities: jest.fn().mockResolvedValue([
        {
          id: "auth_old",
          app_metadata: { customer_id: "cus_old" },
          provider_identities: [{ id: "pi_email", provider: "emailpass" }],
        },
        {
          id: "auth_duplicate_google",
          app_metadata: { customer_id: "cus_duplicate_google" },
          provider_identities: [
            { id: "pi_google_1", provider: "google" },
            { id: "pi_google_2", provider: "google" },
          ],
        },
      ]),
    };
    const supportTicketModule = {
      listSupportTickets: jest.fn().mockResolvedValue([]),
      updateSupportTickets: jest.fn(),
    };
    const cartModule = { updateCarts: jest.fn() };
    const coordinationModule = {
      createAccountSecurityEvents: jest.fn().mockResolvedValue({}),
      listIdentityConflicts: jest.fn().mockResolvedValue([]),
      updateIdentityConflicts: jest.fn(),
    };
    const query = {
      graph: jest.fn(async ({ entity, fields }: Record<string, unknown>) => {
        if (entity === "order" && Array.isArray(fields)) {
          return {
            data: [
              {
                id: "order_1",
                customer_id: "cus_duplicate_google",
                email: "owner@example.com",
                status: "completed",
              },
            ],
          };
        }
        if (entity === "cart") return { data: [] };
        if (entity === "order_change") {
          const isTokenLookup =
            Array.isArray(fields) && fields.includes("actions.details");
          return {
            data: isTokenLookup
              ? [{ actions: [{ details: { token: "transfer-token" } }] }]
              : [],
          };
        }
        throw new Error(`Unexpected graph entity: ${String(entity)}`);
      }),
    };
    const container = {
      resolve: jest.fn((key: string) => {
        if (key === Modules.CUSTOMER) return customerModule;
        if (key === Modules.AUTH) return authModule;
        if (key === Modules.CART) return cartModule;
        if (key === ACCOUNT_COORDINATION_MODULE) return coordinationModule;
        if (key === SUPPORT_TICKET_MODULE) return supportTicketModule;
        if (key === "query") return query;
        throw new Error(`Unexpected dependency: ${key}`);
      }),
    };
    mockRequestTransfer.mockReturnValue({ run: jest.fn().mockResolvedValue({}) });
    mockAcceptTransfer.mockReturnValue({ run: jest.fn().mockResolvedValue({}) });
    mockSetAuthMetadata.mockReturnValue({ run: jest.fn().mockResolvedValue({}) });

    const result = await mergeDuplicateRegisteredCustomers({
      adminId: "user_admin",
      container: container as never,
      email: "owner@example.com",
      publicIssueId: "duplicate_registered_customers:public",
    });

    expect(result.canonical_customer_id).toBe("cus_duplicate_google");
  });

  it("aborts duplicate merge before mutations when a source auth identity has another actor", async () => {
    process.env.CUSTOMER_ACCOUNT_CONSOLIDATION_MODE = "live";
    const customers = [
      {
        id: "cus_old",
        email: "owner@example.com",
        has_account: true,
        created_at: "2026-06-01T00:00:00.000Z",
        metadata: {},
      },
      {
        id: "cus_login",
        email: "owner@example.com",
        has_account: true,
        created_at: "2026-06-02T00:00:00.000Z",
        metadata: {},
      },
    ];
    const customerModule = {
      listCustomers: jest.fn().mockResolvedValue(customers),
      updateCustomers: jest.fn(),
    };
    const authModule = {
      listAuthIdentities: jest.fn().mockResolvedValue([
        {
          id: "auth_old",
          app_metadata: { customer_id: "cus_old", user_id: "user_admin" },
          provider_identities: [{ id: "pi_email", provider: "emailpass" }],
        },
        {
          id: "auth_login",
          app_metadata: { customer_id: "cus_login" },
          provider_identities: [
            { id: "pi_google", provider: "google" },
            { id: "pi_password", provider: "emailpass" },
          ],
        },
      ]),
    };
    const supportTicketModule = {
      listSupportTickets: jest
        .fn()
        .mockResolvedValue([
          { id: "ticket_1", customer_id: "cus_old", metadata: {} },
        ]),
      updateSupportTickets: jest.fn(),
    };
    const cartModule = { updateCarts: jest.fn() };
    const coordinationModule = {
      createAccountSecurityEvents: jest.fn(),
      listIdentityConflicts: jest.fn(),
      updateIdentityConflicts: jest.fn(),
    };
    const query = {
      graph: jest.fn(async ({ entity }: Record<string, unknown>) => {
        if (entity === "order") {
          return {
            data: [
              {
                id: "order_1",
                customer_id: "cus_old",
                email: "owner@example.com",
                status: "completed",
              },
            ],
          };
        }
        if (entity === "cart") {
          return {
            data: [
              {
                id: "cart_1",
                customer_id: "cus_old",
                email: "owner@example.com",
                completed_at: null,
              },
            ],
          };
        }
        if (entity === "order_change") return { data: [] };
        throw new Error(`Unexpected graph entity: ${String(entity)}`);
      }),
    };
    const container = {
      resolve: jest.fn((key: string) => {
        if (key === Modules.CUSTOMER) return customerModule;
        if (key === Modules.AUTH) return authModule;
        if (key === Modules.CART) return cartModule;
        if (key === ACCOUNT_COORDINATION_MODULE) return coordinationModule;
        if (key === SUPPORT_TICKET_MODULE) return supportTicketModule;
        if (key === "query") return query;
        throw new Error(`Unexpected dependency: ${key}`);
      }),
    };
    const requestRun = jest.fn();
    const acceptRun = jest.fn();
    const setMetadataRun = jest.fn();
    mockRequestTransfer.mockReturnValue({ run: requestRun });
    mockAcceptTransfer.mockReturnValue({ run: acceptRun });
    mockSetAuthMetadata.mockReturnValue({ run: setMetadataRun });

    await expect(
      mergeDuplicateRegisteredCustomers({
        adminId: "user_admin",
        container: container as never,
        email: "owner@example.com",
        publicIssueId: "duplicate_registered_customers:public",
      }),
    ).rejects.toThrow("belongs to another actor type");

    expect(requestRun).not.toHaveBeenCalled();
    expect(acceptRun).not.toHaveBeenCalled();
    expect(cartModule.updateCarts).not.toHaveBeenCalled();
    expect(supportTicketModule.updateSupportTickets).not.toHaveBeenCalled();
    expect(setMetadataRun).not.toHaveBeenCalled();
    expect(customerModule.updateCustomers).not.toHaveBeenCalled();
    expect(coordinationModule.createAccountSecurityEvents).not.toHaveBeenCalled();
  });
});
