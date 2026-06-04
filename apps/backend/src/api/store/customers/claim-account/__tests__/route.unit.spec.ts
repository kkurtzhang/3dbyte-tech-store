import { Modules } from "@medusajs/framework/utils";
import { setAuthAppMetadataWorkflow } from "@medusajs/medusa/core-flows";

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

describe("POST /store/customers/claim-account", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSetAuthAppMetadataWorkflow.mockReturnValue({
      run: jest.fn().mockResolvedValue({ result: { id: "auth_123" } }),
    } as never);
  });

  it("upgrades a same-email guest customer and binds the auth identity", async () => {
    const guestCustomer = {
      id: "cus_guest",
      email: "Guest@Example.COM",
      first_name: null,
      last_name: null,
      has_account: false,
      metadata: { source: "guest_checkout" },
    };
    const updatedCustomer = {
      ...guestCustomer,
      first_name: "Guest",
      last_name: "Customer",
      has_account: true,
    };
    const customerModule = {
      listCustomers: jest.fn().mockResolvedValue([guestCustomer]),
      updateCustomers: jest.fn().mockResolvedValue(updatedCustomer),
      retrieveCustomer: jest.fn(),
    };
    const authModule = {
      retrieveAuthIdentity: jest.fn().mockResolvedValue({
        id: "auth_123",
        provider_identities: [
          {
            provider: "emailpass",
            entity_id: "guest@example.com",
          },
        ],
      }),
    };
    const req = {
      auth_context: {
        auth_identity_id: "auth_123",
        actor_id: "",
        user_metadata: { email: "guest@example.com" },
      },
      validatedBody: {
        email: "guest@example.com",
        first_name: "Guest",
        last_name: "Customer",
        source: "emailpass",
      },
      scope: {
        resolve: jest.fn((key: string) => {
          if (key === Modules.CUSTOMER) return customerModule;
          if (key === Modules.AUTH) return authModule;
          throw new Error(`Unexpected module ${key}`);
        }),
      },
    };
    const res = createResponse();

    await POST(req as never, res as never);

    expect(customerModule.listCustomers).toHaveBeenCalledWith({
      email: "guest@example.com",
    });
    expect(customerModule.updateCustomers).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "cus_guest",
        first_name: "Guest",
        last_name: "Customer",
        has_account: true,
        metadata: expect.objectContaining({
          source: "guest_checkout",
          account_claim_source: "emailpass",
        }),
      }),
    );
    expect(mockSetAuthAppMetadataWorkflow).toHaveBeenCalledWith(req.scope);
    expect(
      (mockSetAuthAppMetadataWorkflow.mock.results[0]?.value as {
        run: jest.Mock;
      }).run,
    ).toHaveBeenCalledWith({
      input: {
        authIdentityId: "auth_123",
        actorType: "customer",
        value: "cus_guest",
      },
    });
    expect(res.json).toHaveBeenCalledWith({
      claimed: true,
      linked: true,
      already_registered: false,
      customer: updatedCustomer,
    });
  });

  it("links Google auth to an existing same-email registered customer and marks the email verified", async () => {
    const registeredCustomer = {
      id: "cus_registered",
      email: "ava@example.com",
      first_name: "Ava",
      last_name: null,
      has_account: true,
      metadata: { email_verification_status: "pending" },
    };
    const verifiedCustomer = {
      ...registeredCustomer,
      metadata: {
        email_verification_status: "verified",
        email_verification_source: "google",
        email_verified_at: "2026-06-04T00:00:00.000Z",
      },
    };
    const customerModule = {
      listCustomers: jest.fn().mockResolvedValue([registeredCustomer]),
      updateCustomers: jest.fn().mockResolvedValue(verifiedCustomer),
      retrieveCustomer: jest.fn(),
    };
    const authModule = {
      retrieveAuthIdentity: jest.fn().mockResolvedValue({
        id: "auth_google",
        provider_identities: [
          {
            provider: "google",
            entity_id: "ava@example.com",
          },
        ],
      }),
    };
    const req = {
      auth_context: {
        auth_identity_id: "auth_google",
        actor_id: "",
        user_metadata: { email: "ava@example.com" },
      },
      validatedBody: {
        email: "ava@example.com",
        source: "google",
      },
      scope: {
        resolve: jest.fn((key: string) => {
          if (key === Modules.CUSTOMER) return customerModule;
          if (key === Modules.AUTH) return authModule;
          throw new Error(`Unexpected module ${key}`);
        }),
      },
    };
    const res = createResponse();

    await POST(req as never, res as never);

    expect(customerModule.updateCustomers).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "cus_registered",
        metadata: expect.objectContaining({
          email_verification_status: "verified",
          email_verification_source: "google",
          email_verified_at: expect.any(String),
        }),
      }),
    );
    expect(
      (mockSetAuthAppMetadataWorkflow.mock.results[0]?.value as {
        run: jest.Mock;
      }).run,
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
      customer: verifiedCustomer,
    });
  });

  it("rejects attempts to claim an email that does not match the auth identity", async () => {
    const customerModule = {
      listCustomers: jest.fn(),
      updateCustomers: jest.fn(),
      retrieveCustomer: jest.fn(),
    };
    const authModule = {
      retrieveAuthIdentity: jest.fn().mockResolvedValue({
        id: "auth_123",
        provider_identities: [
          {
            provider: "emailpass",
            entity_id: "owner@example.com",
          },
        ],
      }),
    };
    const req = {
      auth_context: {
        auth_identity_id: "auth_123",
        actor_id: "",
        user_metadata: { email: "owner@example.com" },
      },
      validatedBody: {
        email: "other@example.com",
        source: "emailpass",
      },
      scope: {
        resolve: jest.fn((key: string) => {
          if (key === Modules.CUSTOMER) return customerModule;
          if (key === Modules.AUTH) return authModule;
          throw new Error(`Unexpected module ${key}`);
        }),
      },
    };
    const res = createResponse();

    await POST(req as never, res as never);

    expect(customerModule.listCustomers).not.toHaveBeenCalled();
    expect(mockSetAuthAppMetadataWorkflow).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      message: "Authenticated email does not match the requested customer email",
    });
  });

  it("returns 404 when there is no existing customer to claim", async () => {
    const customerModule = {
      listCustomers: jest.fn().mockResolvedValue([]),
      updateCustomers: jest.fn(),
      retrieveCustomer: jest.fn(),
    };
    const authModule = {
      retrieveAuthIdentity: jest.fn().mockResolvedValue({
        id: "auth_123",
        provider_identities: [
          {
            provider: "emailpass",
            entity_id: "new@example.com",
          },
        ],
      }),
    };
    const req = {
      auth_context: {
        auth_identity_id: "auth_123",
        actor_id: "",
        user_metadata: { email: "new@example.com" },
      },
      validatedBody: {
        email: "new@example.com",
        source: "emailpass",
      },
      scope: {
        resolve: jest.fn((key: string) => {
          if (key === Modules.CUSTOMER) return customerModule;
          if (key === Modules.AUTH) return authModule;
          throw new Error(`Unexpected module ${key}`);
        }),
      },
    };
    const res = createResponse();

    await POST(req as never, res as never);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      message: "No existing customer is available to claim",
    });
  });
});
