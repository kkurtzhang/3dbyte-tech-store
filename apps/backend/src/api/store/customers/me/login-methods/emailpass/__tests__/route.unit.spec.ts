import { Modules } from "@medusajs/framework/utils";
import { setAuthAppMetadataWorkflow } from "@medusajs/medusa/core-flows";

import { ACCOUNT_COORDINATION_MODULE } from "../../../../../../../modules/account-coordination";
import { createAccountReauthToken } from "../../../../../../../modules/account-coordination/security";
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

describe("POST /store/customers/me/login-methods/emailpass", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = {
      ...originalEnv,
      CUSTOMER_ACCOUNT_COORDINATION_SECRET: "coordination-secret",
    };
    mockSetAuthAppMetadataWorkflow.mockReturnValue({
      run: jest.fn().mockResolvedValue({}),
    } as never);
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("adds an emailpass identity after recent Google reauthentication", async () => {
    const customer = {
      id: "cus_123",
      email: "ava@example.com",
      has_account: true,
    };
    const reauthToken = createAccountReauthToken({
      customerId: customer.id,
      provider: "google",
      secret: "coordination-secret",
      expiresInSeconds: 300,
    });
    const customerModule = {
      retrieveCustomer: jest.fn().mockResolvedValue(customer),
    };
    const authModule = {
      listAuthIdentities: jest.fn().mockResolvedValue([
        {
          id: "auth_google",
          app_metadata: { customer_id: customer.id },
          provider_identities: [
            {
              id: "provider_google",
              provider: "google",
              entity_id: customer.email,
            },
          ],
        },
      ]),
      register: jest.fn().mockResolvedValue({
        success: true,
        authIdentity: {
          id: "auth_emailpass",
          app_metadata: {},
          provider_identities: [
            {
              id: "provider_emailpass",
              provider: "emailpass",
              entity_id: customer.email,
            },
          ],
        },
      }),
    };
    const coordinationModule = {
      createAccountSecurityEvents: jest.fn().mockResolvedValue({}),
    };
    const notificationModule = {
      createNotifications: jest.fn().mockResolvedValue({}),
    };
    const req = {
      auth_context: { actor_id: customer.id },
      validatedBody: {
        password: "StrongPassword123!",
        reauth_token: reauthToken,
      },
      scope: {
        resolve: jest.fn((key: string) => {
          if (key === Modules.CUSTOMER) return customerModule;
          if (key === Modules.AUTH) return authModule;
          if (key === ACCOUNT_COORDINATION_MODULE) return coordinationModule;
          if (key === "notification") return notificationModule;
          throw new Error(`Unexpected module ${key}`);
        }),
      },
    };
    const res = createResponse();

    await POST(req as never, res as never);

    expect(authModule.register).toHaveBeenCalledWith("emailpass", {
      body: {
        email: "ava@example.com",
        password: "StrongPassword123!",
      },
    });
    expect(
      (
        mockSetAuthAppMetadataWorkflow.mock.results[0]?.value as {
          run: jest.Mock;
        }
      ).run,
    ).toHaveBeenCalledWith({
      input: {
        authIdentityId: "auth_emailpass",
        actorType: "customer",
        value: "cus_123",
      },
    });
    expect(coordinationModule.createAccountSecurityEvents).toHaveBeenCalledWith(
      expect.objectContaining({
        customer_id: "cus_123",
        event_type: "login_method.emailpass.added",
        provider: "emailpass",
      }),
    );
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      login_method: "emailpass",
      added: true,
    });
  });

  it("rejects missing recent reauthentication", async () => {
    const customerModule = {
      retrieveCustomer: jest.fn().mockResolvedValue({
        id: "cus_123",
        email: "ava@example.com",
      }),
    };
    const authModule = {
      listAuthIdentities: jest.fn(),
      register: jest.fn(),
    };
    const req = {
      auth_context: { actor_id: "cus_123" },
      validatedBody: {
        password: "StrongPassword123!",
        reauth_token: "invalid",
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

    expect(authModule.register).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      message: "Recent Google verification is required",
      code: "reauth_required",
    });
  });
});
