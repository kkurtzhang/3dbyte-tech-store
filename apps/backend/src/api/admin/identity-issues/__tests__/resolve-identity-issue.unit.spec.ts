import { Modules } from "@medusajs/framework/utils";

import { ACCOUNT_COORDINATION_MODULE } from "../../../../modules/account-coordination";
import { consolidateGuestHistory } from "../../../../modules/account-coordination/consolidate-guest-history";
import { toPublicIssueId } from "../identity-issues";
import { deleteOrphanAuthIdentity } from "../identity-repairs";
import { resolveAdminIdentityIssue } from "../resolve-identity-issue";

jest.mock("../../../../modules/account-coordination/consolidate-guest-history", () => ({
  consolidateGuestHistory: jest.fn(),
}));
jest.mock("../identity-repairs", () => ({
  deleteOrphanAuthIdentity: jest.fn(),
  mergeDuplicateRegisteredCustomers: jest.fn(),
}));

const mockConsolidate = consolidateGuestHistory as jest.MockedFunction<
  typeof consolidateGuestHistory
>;
const mockDeleteOrphan = deleteOrphanAuthIdentity as jest.MockedFunction<
  typeof deleteOrphanAuthIdentity
>;

describe("resolveAdminIdentityIssue", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.CUSTOMER_ACCOUNT_CONSOLIDATION_MODE;
  });

  it("re-resolves an orphan public ID before deleting it", async () => {
    const authModule = {
      listAuthIdentities: jest.fn().mockResolvedValue([
        {
          id: "auth_orphan",
          app_metadata: {},
          provider_identities: [{ id: "pi_1", provider: "emailpass" }],
        },
      ]),
    };
    const container = {
      resolve: jest.fn((key: string) => {
        if (key === Modules.AUTH) return authModule;
        throw new Error(`Unexpected dependency: ${key}`);
      }),
    };
    const issueId = toPublicIssueId("orphan_auth_identity", "auth_orphan");
    mockDeleteOrphan.mockResolvedValue({
      action: "delete_orphan_identity",
      removed_provider_count: 1,
    });

    await resolveAdminIdentityIssue({
      adminId: "user_admin",
      container: container as never,
      issueId,
    });

    expect(mockDeleteOrphan).toHaveBeenCalledWith({
      adminId: "user_admin",
      authIdentityId: "auth_orphan",
      container,
      publicIssueId: issueId,
    });
  });

  it("retries a failed consolidation and records the admin action", async () => {
    process.env.CUSTOMER_ACCOUNT_CONSOLIDATION_MODE = "live";
    const coordinationModule = {
      listGuestConsolidationRuns: jest.fn().mockResolvedValue([
        {
          id: "gcr_failed",
          canonical_customer_id: "cus_1",
          status: "failed",
        },
      ]),
      createAccountSecurityEvents: jest.fn().mockResolvedValue({}),
    };
    const container = {
      resolve: jest.fn((key: string) => {
        if (key === ACCOUNT_COORDINATION_MODULE) return coordinationModule;
        throw new Error(`Unexpected dependency: ${key}`);
      }),
    };
    mockConsolidate.mockResolvedValue({
      mode: "live",
      status: "completed",
      run_id: "gcr_failed",
      transferred_order_ids: ["order_1"],
    });
    const issueId = toPublicIssueId("consolidation", "gcr_failed");

    const result = await resolveAdminIdentityIssue({
      adminId: "user_admin",
      container: container as never,
      issueId,
    });

    expect(mockConsolidate).toHaveBeenCalledWith({
      container,
      customerId: "cus_1",
    });
    expect(result).toMatchObject({
      action: "retry_consolidation",
      transferred_order_count: 1,
    });
    expect(coordinationModule.createAccountSecurityEvents).toHaveBeenCalledWith(
      expect.objectContaining({
        customer_id: "cus_1",
        event_type: "admin.guest_history_consolidation.retried",
        metadata: {
          admin_id: "user_admin",
          issue_id: issueId,
          mode: "live",
          transferred_order_count: 1,
        },
      }),
    );
  });

  it("rejects consolidation retry when live mode is disabled", async () => {
    process.env.CUSTOMER_ACCOUNT_CONSOLIDATION_MODE = "dry_run";
    const coordinationModule = {
      listGuestConsolidationRuns: jest.fn(),
      createAccountSecurityEvents: jest.fn(),
    };
    const container = {
      resolve: jest.fn((key: string) => {
        if (key === ACCOUNT_COORDINATION_MODULE) return coordinationModule;
        throw new Error(`Unexpected dependency: ${key}`);
      }),
    };

    await expect(
      resolveAdminIdentityIssue({
        adminId: "user_admin",
        container: container as never,
        issueId: "consolidation:0123456789abcdef",
      }),
    ).rejects.toThrow("requires CUSTOMER_ACCOUNT_CONSOLIDATION_MODE=live");
    expect(mockConsolidate).not.toHaveBeenCalled();
    expect(coordinationModule.listGuestConsolidationRuns).not.toHaveBeenCalled();
  });

  it("rejects an issue ID that no longer maps to current data", async () => {
    const container = {
      resolve: jest.fn((key: string) => {
        if (key === Modules.AUTH) {
          return { listAuthIdentities: jest.fn().mockResolvedValue([]) };
        }
        throw new Error(`Unexpected dependency: ${key}`);
      }),
    };

    await expect(
      resolveAdminIdentityIssue({
        adminId: "user_admin",
        container: container as never,
        issueId: "orphan_auth_identity:0123456789abcdef",
      }),
    ).rejects.toThrow("Identity issue no longer exists");
    expect(mockDeleteOrphan).not.toHaveBeenCalled();
  });
});
