import { Modules } from "@medusajs/framework/utils";

import { ACCOUNT_COORDINATION_MODULE } from "../index";
import { buildAccountSecuritySummary } from "../account-security-summary";

describe("buildAccountSecuritySummary", () => {
  it("returns provider and consolidation state without exposing provider identifiers", async () => {
    const container = {
      resolve: jest.fn((key: string) => {
        if (key === Modules.CUSTOMER) {
          return {
            retrieveCustomer: jest.fn().mockResolvedValue({
              id: "cus_123",
              email: "ava@example.com",
              has_account: true,
              metadata: {
                email_verification_status: "verified",
                email_verified_at: "2026-06-07T10:00:00.000Z",
              },
            }),
          };
        }

        if (key === Modules.AUTH) {
          return {
            listAuthIdentities: jest.fn().mockResolvedValue([
              {
                id: "auth_secret",
                app_metadata: { customer_id: "cus_123" },
                provider_identities: [
                  {
                    id: "provider_secret",
                    provider: "google",
                    entity_id: "google-subject-secret",
                    created_at: "2026-06-07T09:00:00.000Z",
                  },
                  {
                    id: "provider_emailpass",
                    provider: "emailpass",
                    entity_id: "ava@example.com",
                    created_at: "2026-06-07T09:30:00.000Z",
                  },
                ],
              },
            ]),
          };
        }

        if (key === ACCOUNT_COORDINATION_MODULE) {
          return {
            listGuestConsolidationRuns: jest.fn().mockResolvedValue([
              {
                id: "gcr_123",
                status: "completed",
                transferred_order_ids: ["order_1", "order_2"],
                completed_at: "2026-06-07T10:10:00.000Z",
              },
            ]),
            listIdentityConflicts: jest.fn().mockResolvedValue([]),
            listAccountSecurityEvents: jest.fn().mockResolvedValue([
              {
                id: "ase_123",
                event_type: "login_method.google.linked",
                provider: "google",
                severity: "info",
                created_at: "2026-06-07T10:05:00.000Z",
                metadata: { provider_subject: "must-not-leak" },
              },
            ]),
          };
        }

        throw new Error(`Unexpected module ${key}`);
      }),
    };

    const summary = await buildAccountSecuritySummary({
      container: container as never,
      customerId: "cus_123",
    });
    const serialized = JSON.stringify(summary);

    expect(summary).toMatchObject({
      customer_id: "cus_123",
      account_type: "registered",
      email: {
        value: "ava@example.com",
        verification_status: "verified",
      },
      providers: [
        { provider: "emailpass", linked: true },
        { provider: "google", linked: true },
      ],
      consolidation: {
        status: "completed",
        transferred_order_count: 2,
      },
      warnings: [],
    });
    expect(serialized).not.toContain("auth_secret");
    expect(serialized).not.toContain("provider_secret");
    expect(serialized).not.toContain("google-subject-secret");
    expect(serialized).not.toContain("must-not-leak");
  });
});
