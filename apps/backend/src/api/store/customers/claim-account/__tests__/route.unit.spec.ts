import { Modules } from "@medusajs/framework/utils";
import { setAuthAppMetadataWorkflow } from "@medusajs/medusa/core-flows";

import { ACCOUNT_COORDINATION_MODULE } from "../../../../../modules/account-coordination";
import { hashOpaqueValue } from "../../../../../modules/account-coordination/security";
import { POST } from "../route";

jest.mock("@medusajs/medusa/core-flows", () => ({
  setAuthAppMetadataWorkflow: jest.fn(),
}));

const mockSetAuthAppMetadataWorkflow =
  setAuthAppMetadataWorkflow as jest.MockedFunction<
    typeof setAuthAppMetadataWorkflow
  >;

function createResponse() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  };
}

function createCoordinationModule() {
  return {
    retrieveOAuthLinkIntent: jest.fn(),
    updateOAuthLinkIntents: jest.fn(),
    createAccountSecurityEvents: jest.fn(),
    createIdentityConflicts: jest.fn(),
  };
}

function createRequest({
  body,
  customerModule,
  authIdentity,
  coordinationModule = createCoordinationModule(),
  actorId = "",
}: {
  body: Record<string, unknown>;
  customerModule: Record<string, jest.Mock>;
  authIdentity: Record<string, unknown>;
  coordinationModule?: ReturnType<typeof createCoordinationModule>;
  actorId?: string;
}) {
  const authModule = {
    retrieveAuthIdentity: jest.fn().mockResolvedValue(authIdentity),
  };

  return {
    auth_context: {
      auth_identity_id: String(authIdentity.id),
      actor_id: actorId,
      user_metadata: authIdentity.user_metadata,
    },
    validatedBody: body,
    scope: {
      resolve: jest.fn((key: string) => {
        if (key === Modules.CUSTOMER) return customerModule;
        if (key === Modules.AUTH) return authModule;
        if (key === ACCOUNT_COORDINATION_MODULE) return coordinationModule;
        throw new Error(`Unexpected module ${key}`);
      }),
    },
  };
}

describe("POST /store/customers/claim-account", () => {
  const originalEnv = process.env;
  const nonce = "gS9OZL6f9aEFdH9qbtgV-qYziGC0d6Lu_Vo93JOEMkI";

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = {
      ...originalEnv,
      CUSTOMER_ACCOUNT_COORDINATION_SECRET: "coordination-secret",
      CUSTOMER_GOOGLE_AUTO_LINK_ENABLED: "false",
    };
    mockSetAuthAppMetadataWorkflow.mockReturnValue({
      run: jest.fn().mockResolvedValue({ result: { id: "auth_123" } }),
    } as never);
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("keeps same-email guest customers historical instead of promoting them", async () => {
    const guestCustomer = {
      id: "cus_guest",
      email: "Guest@Example.COM",
      has_account: false,
    };
    const customerModule = {
      listCustomers: jest.fn().mockResolvedValue([guestCustomer]),
      updateCustomers: jest.fn(),
      retrieveCustomer: jest.fn(),
    };
    const req = createRequest({
      body: {
        email: "guest@example.com",
        source: "emailpass",
      },
      customerModule,
      authIdentity: {
        id: "auth_emailpass",
        app_metadata: {},
        user_metadata: { email: "guest@example.com" },
        provider_identities: [
          {
            provider: "emailpass",
            entity_id: "guest@example.com",
          },
        ],
      },
    });
    const res = createResponse();

    await POST(req as never, res as never);

    expect(customerModule.updateCustomers).not.toHaveBeenCalled();
    expect(mockSetAuthAppMetadataWorkflow).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      message: "No registered customer is available to link",
      guest_available: true,
    });
  });

  it("auto-links verified Google auth to an existing registered customer only when enabled", async () => {
    process.env.CUSTOMER_GOOGLE_AUTO_LINK_ENABLED = "true";
    const registeredCustomer = {
      id: "cus_registered",
      email: "ava@example.com",
      has_account: true,
      metadata: { email_verification_status: "pending" },
    };
    const verifiedCustomer = {
      ...registeredCustomer,
      metadata: {
        email_verification_status: "verified",
        email_verification_source: "google",
      },
    };
    const customerModule = {
      listCustomers: jest.fn().mockResolvedValue([registeredCustomer]),
      updateCustomers: jest.fn().mockResolvedValue(verifiedCustomer),
      retrieveCustomer: jest.fn(),
    };
    const coordinationModule = createCoordinationModule();
    const req = createRequest({
      body: { email: "ava@example.com", source: "google" },
      customerModule,
      coordinationModule,
      authIdentity: {
        id: "auth_google",
        app_metadata: {},
        user_metadata: {
          email: "ava@example.com",
          email_verified: true,
        },
        provider_identities: [
          {
            provider: "google",
            entity_id: "ava@example.com",
            user_metadata: {
              email: "ava@example.com",
              email_verified: true,
            },
          },
        ],
      },
    });
    const res = createResponse();

    await POST(req as never, res as never);

    expect(
      (
        mockSetAuthAppMetadataWorkflow.mock.results[0]?.value as {
          run: jest.Mock;
        }
      ).run,
    ).toHaveBeenCalledWith({
      input: {
        authIdentityId: "auth_google",
        actorType: "customer",
        value: "cus_registered",
      },
    });
    expect(coordinationModule.createAccountSecurityEvents).toHaveBeenCalledWith(
      expect.objectContaining({
        customer_id: "cus_registered",
        event_type: "login_method.google.auto_linked",
        provider: "google",
      }),
    );
    expect(res.json).toHaveBeenCalledWith({
      claimed: false,
      linked: true,
      already_registered: true,
      customer: verifiedCustomer,
    });
  });

  it("rejects implicit Google linking when the rollout flag is disabled", async () => {
    const customerModule = {
      listCustomers: jest.fn().mockResolvedValue([
        {
          id: "cus_registered",
          email: "ava@example.com",
          has_account: true,
        },
      ]),
      updateCustomers: jest.fn(),
      retrieveCustomer: jest.fn(),
    };
    const req = createRequest({
      body: { email: "ava@example.com", source: "google" },
      customerModule,
      authIdentity: {
        id: "auth_google",
        app_metadata: {},
        user_metadata: {
          email: "ava@example.com",
          email_verified: true,
        },
        provider_identities: [
          {
            provider: "google",
            entity_id: "ava@example.com",
            user_metadata: { email_verified: true },
          },
        ],
      },
    });
    const res = createResponse();

    await POST(req as never, res as never);

    expect(mockSetAuthAppMetadataWorkflow).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({
      message: "Google sign-in is not linked to this customer account",
      code: "google_link_required",
    });
  });

  it("consumes a valid customer-bound intent for explicit Google linking", async () => {
    const customer = {
      id: "cus_registered",
      email: "ava@example.com",
      has_account: true,
      metadata: {},
    };
    const customerModule = {
      listCustomers: jest.fn(),
      updateCustomers: jest.fn().mockResolvedValue(customer),
      retrieveCustomer: jest.fn().mockResolvedValue(customer),
    };
    const coordinationModule = createCoordinationModule();
    coordinationModule.retrieveOAuthLinkIntent.mockResolvedValue({
      id: "oli_123",
      customer_id: customer.id,
      expected_email: customer.email,
      nonce_hash: hashOpaqueValue(nonce, "coordination-secret"),
      status: "pending",
      expires_at: new Date(Date.now() + 60_000),
    });
    const req = createRequest({
      body: {
        email: "ava@example.com",
        source: "google",
        link_intent_id: "oli_123",
        link_nonce: nonce,
      },
      customerModule,
      coordinationModule,
      authIdentity: {
        id: "auth_google",
        app_metadata: {},
        user_metadata: {
          email: "ava@example.com",
          email_verified: true,
        },
        provider_identities: [
          {
            provider: "google",
            entity_id: "ava@example.com",
            user_metadata: {
              email: "ava@example.com",
              email_verified: true,
            },
          },
        ],
      },
    });
    const res = createResponse();

    await POST(req as never, res as never);

    expect(coordinationModule.updateOAuthLinkIntents).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "oli_123",
        status: "used",
        used_at: expect.any(Date),
      }),
    );
    expect(
      (
        mockSetAuthAppMetadataWorkflow.mock.results[0]?.value as {
          run: jest.Mock;
        }
      ).run,
    ).toHaveBeenCalledWith({
      input: {
        authIdentityId: "auth_google",
        actorType: "customer",
        value: "cus_registered",
      },
    });
    expect(res.json).toHaveBeenCalledWith({
      claimed: false,
      linked: true,
      already_registered: true,
      customer,
      reauth_token: expect.any(String),
    });
  });

  it("rejects an unknown explicit Google link intent without a server error", async () => {
    const customerModule = {
      listCustomers: jest.fn(),
      updateCustomers: jest.fn(),
      retrieveCustomer: jest.fn(),
    };
    const coordinationModule = createCoordinationModule();
    coordinationModule.retrieveOAuthLinkIntent.mockRejectedValue(
      new Error("OAuth link intent not found"),
    );
    const req = createRequest({
      body: {
        email: "owner@example.com",
        source: "google",
        link_intent_id: "oli_missing",
        link_nonce: "secure-link-nonce-value-with-32-chars",
      },
      customerModule,
      coordinationModule,
      authIdentity: {
        id: "auth_google",
        app_metadata: {},
        user_metadata: {
          email: "owner@example.com",
          email_verified: true,
        },
        provider_identities: [
          {
            provider: "google",
            entity_id: "google-subject-opaque-123",
            user_metadata: {
              email: "owner@example.com",
              email_verified: true,
            },
          },
        ],
      },
    });
    const res = createResponse();

    await POST(req as never, res as never);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({
      message: "Google account connection could not be verified",
      code: "google_link_intent_not_found",
    });
  });

  it("records a conflict when the auth identity belongs to another customer", async () => {
    const customerModule = {
      listCustomers: jest.fn(),
      updateCustomers: jest.fn(),
      retrieveCustomer: jest.fn(),
    };
    const coordinationModule = createCoordinationModule();
    const req = createRequest({
      body: {
        email: "ava@example.com",
        source: "google",
      },
      customerModule,
      coordinationModule,
      authIdentity: {
        id: "auth_google",
        app_metadata: { customer_id: "cus_other" },
        user_metadata: {
          email: "ava@example.com",
          email_verified: true,
        },
        provider_identities: [],
      },
    });
    const res = createResponse();

    await POST(req as never, res as never);

    expect(coordinationModule.createIdentityConflicts).toHaveBeenCalledWith(
      expect.objectContaining({
        customer_id: "cus_other",
        normalized_email: "ava@example.com",
        provider: "google",
        issue_type: "provider_identity_owned_by_other_customer",
        status: "open",
      }),
    );
    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({
      message: "This login method is already connected to another account",
      code: "identity_conflict",
    });
  });
});
