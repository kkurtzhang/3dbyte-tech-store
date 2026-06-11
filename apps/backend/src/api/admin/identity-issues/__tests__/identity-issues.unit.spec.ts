import { Modules } from "@medusajs/framework/utils";

import { ACCOUNT_COORDINATION_MODULE } from "../../../../modules/account-coordination";
import { listAdminIdentityIssues } from "../identity-issues";

const NOW = new Date("2026-06-07T04:00:00.000Z");

const customers = [
  {
    id: "cus_registered_1",
    email: "Owner@Example.com ",
    has_account: true,
    created_at: "2026-06-01T00:00:00.000Z",
  },
  {
    id: "cus_registered_2",
    email: "owner@example.com",
    has_account: true,
    created_at: "2026-06-02T00:00:00.000Z",
  },
  {
    id: "cus_no_login",
    email: "nologin@example.com",
    has_account: true,
    created_at: "2026-06-03T00:00:00.000Z",
  },
  {
    id: "cus_google",
    email: "google@example.com",
    has_account: true,
    first_name: "Grace",
    last_name: "Google",
    created_at: "2026-06-04T00:00:00.000Z",
  },
  {
    id: "cus_guest_orphan",
    email: "orphan@example.com",
    has_account: false,
    first_name: "Olivia",
    last_name: "Guest",
    created_at: "2026-06-05T00:00:00.000Z",
  },
];

const authIdentities = [
  {
    id: "auth_owner",
    app_metadata: { customer_id: "cus_registered_1" },
    provider_identities: [
      {
        provider: "emailpass",
        entity_id: "owner@example.com",
        provider_metadata: { password_hash: "must-not-leak" },
      },
    ],
  },
  {
    id: "auth_google",
    app_metadata: { customer_id: "cus_google" },
    provider_identities: [
      {
        provider: "google",
        entity_id: "google-subject-id",
        user_metadata: { access_token: "must-not-leak" },
      },
    ],
  },
  {
    id: "auth_owner_2",
    app_metadata: { customer_id: "cus_registered_2" },
    provider_identities: [
      {
        provider: "google",
        entity_id: "second-owner-google-subject",
      },
    ],
  },
  {
    id: "auth_orphan",
    app_metadata: { customer_id: "cus_missing" },
    provider_identities: [
      {
        provider: "google",
        entity_id: "orphan-google-subject",
        user_metadata: {
          email: "orphan@example.com",
          email_verified: true,
        },
      },
    ],
    created_at: "2026-06-06T00:00:00.000Z",
  },
  {
    id: "auth_admin_user",
    app_metadata: { user_id: "user_admin" },
    provider_identities: [
      {
        provider: "emailpass",
        entity_id: "admin@example.com",
      },
    ],
  },
];

function createContainer() {
  const customerModule = {
    listCustomers: jest.fn().mockResolvedValue(customers),
  };
  const authModule = {
    listAuthIdentities: jest.fn().mockResolvedValue(authIdentities),
  };
  const coordinationModule = {
    listIdentityConflicts: jest.fn().mockResolvedValue([
      {
        id: "icf_1",
        customer_id: "cus_google",
        normalized_email: "google@example.com",
        provider: "google",
        issue_type: "provider_identity_owned_by_other_customer",
        status: "open",
        occurrence_count: 2,
        last_seen_at: "2026-06-07T03:00:00.000Z",
        details: {
          provider_subject: "must-not-leak",
          token: "must-not-leak",
        },
      },
    ]),
    listGuestConsolidationRuns: jest.fn().mockResolvedValue([
      {
        id: "gcr_failed",
        canonical_customer_id: "cus_registered_1",
        normalized_email: "owner@example.com",
        status: "failed",
        started_at: "2026-06-07T01:00:00.000Z",
        completed_at: "2026-06-07T01:01:00.000Z",
        failure_reason: "database details must not leak",
      },
      {
        id: "gcr_partial",
        canonical_customer_id: "cus_google",
        normalized_email: "google@example.com",
        status: "partial",
        started_at: "2026-06-07T02:00:00.000Z",
        completed_at: "2026-06-07T02:01:00.000Z",
        skipped_items: [{ order_id: "order_secret" }],
      },
    ]),
    listOAuthLinkIntents: jest.fn().mockResolvedValue([
      {
        id: "oli_stale",
        customer_id: "cus_google",
        expected_email: "google@example.com",
        status: "pending",
        expires_at: "2026-06-07T03:30:00.000Z",
        failure_count: 0,
        nonce_hash: "must-not-leak",
        created_at: "2026-06-07T03:00:00.000Z",
      },
      {
        id: "oli_failed",
        customer_id: "cus_google",
        expected_email: "google@example.com",
        status: "pending",
        expires_at: "2026-06-07T05:00:00.000Z",
        failure_count: 3,
        last_failure_reason: "must-not-leak",
        created_at: "2026-06-07T03:15:00.000Z",
      },
    ]),
  };
  const query = {
    graph: jest.fn(async ({ entity }: { entity: string }) => {
      if (entity === "order") {
        return {
          data: [
            { id: "order_1", customer_id: "cus_registered_2" },
            { id: "order_2", customer_id: "cus_registered_2" },
          ],
        };
      }
      if (entity === "cart") return { data: [] };
      throw new Error(`Unexpected entity: ${entity}`);
    }),
  };
  const supportTicketModule = {
    listSupportTickets: jest.fn().mockResolvedValue([]),
  };

  return {
    coordinationModule,
    container: {
      resolve: jest.fn((key: string) => {
        if (key === Modules.CUSTOMER) return customerModule;
        if (key === Modules.AUTH) return authModule;
        if (key === ACCOUNT_COORDINATION_MODULE) return coordinationModule;
        if (key === "query") return query;
        if (key === "supportTicket") return supportTicketModule;
        throw new Error(`Unexpected dependency: ${key}`);
      }),
    },
  };
}

describe("listAdminIdentityIssues", () => {
  it("aggregates every supported operational issue without leaking identity secrets", async () => {
    const { container } = createContainer();

    const result = await listAdminIdentityIssues({
      container: container as never,
      filters: { limit: 50, offset: 0 },
      now: NOW,
    });

    expect(result.issues.map((issue) => issue.issue_type)).toEqual(
      expect.arrayContaining([
        "provider_identity_owned_by_other_customer",
        "consolidation_failed",
        "consolidation_partial",
        "oauth_intent_stale",
        "oauth_intent_repeated_failures",
        "duplicate_registered_customers",
        "orphan_auth_identity",
        "no_usable_login",
      ]),
    );
    expect(
      result.issues.filter(
        (issue) => issue.issue_type === "orphan_auth_identity",
      ),
    ).toHaveLength(1);
    expect(
      result.issues.find(
        (issue) => issue.issue_type === "orphan_auth_identity",
      ),
    ).toMatchObject({
      id: expect.stringMatching(/^orphan_auth_identity:[a-f0-9]{16}$/),
      provider: "google",
      email: "orphan@example.com",
      customer_id: "cus_guest_orphan",
      customer: {
        id: "cus_guest_orphan",
        email: "orphan@example.com",
        name: "Olivia Guest",
        account_type: "guest",
      },
      resolution: {
        action: "delete_orphan_identity",
        allowed: true,
      },
      summary:
        "Google login for orphan@example.com points to a missing customer. A matching guest customer exists, so the stale login identity can be removed safely.",
    });

    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain("google-subject-id");
    expect(serialized).not.toContain("second-owner-google-subject");
    expect(serialized).not.toContain("orphan-google-subject");
    expect(serialized).not.toContain("must-not-leak");
    expect(serialized).not.toContain("order_secret");
    expect(serialized).not.toContain("auth_orphan");
    expect(serialized).not.toContain("icf_1");
    expect(serialized).not.toContain("gcr_failed");
    expect(serialized).not.toContain("oli_stale");

    const duplicate = result.issues.find(
      (issue) => issue.issue_type === "duplicate_registered_customers",
    );
    expect(duplicate).toMatchObject({
      customer_id: "cus_registered_2",
      resolution: {
        action: "merge_duplicate_customers",
        canonical_customer_id: "cus_registered_2",
      },
      summary:
        "2 registered customer records share owner@example.com. Recommended canonical account: owner@example.com (1 login method, 2 linked records).",
    });

    const ownershipConflict = result.issues.find(
      (issue) =>
        issue.issue_type === "provider_identity_owned_by_other_customer",
    );
    expect(ownershipConflict?.resolution).toMatchObject({
      action: null,
      allowed: false,
    });
  });

  it("filters issues by type, status, provider, email, and date before paginating", async () => {
    const { container } = createContainer();

    const result = await listAdminIdentityIssues({
      container: container as never,
      filters: {
        issue_type: "provider_identity_owned_by_other_customer",
        status: "open",
        provider: "google",
        email: "GOOGLE@EXAMPLE.COM",
        date_from: "2026-06-07T02:30:00.000Z",
        date_to: "2026-06-07T03:30:00.000Z",
        limit: 1,
        offset: 0,
      },
      now: NOW,
    });

    expect(result).toMatchObject({
      count: 1,
      limit: 1,
      offset: 0,
      issues: [
        {
          issue_type: "provider_identity_owned_by_other_customer",
          status: "open",
          provider: "google",
          email: "google@example.com",
          customer_id: "cus_google",
        },
      ],
    });
  });
});
