import { Modules } from "@medusajs/framework/utils";

import { ACCOUNT_COORDINATION_MODULE } from "../../../../../../../modules/account-coordination";
import { createAccountReauthToken } from "../../../../../../../modules/account-coordination/security";
import { DELETE } from "../route";

function createResponse() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  };
}

describe("DELETE /store/customers/me/login-methods/google", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = {
      ...originalEnv,
      CUSTOMER_ACCOUNT_COORDINATION_SECRET: "coordination-secret",
    };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("disconnects Google after reauthentication when emailpass remains", async () => {
    const customer = { id: "cus_123", email: "ava@example.com" };
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
              entity_id: "google-subject-opaque-123",
            },
          ],
        },
        {
          id: "auth_emailpass",
          app_metadata: { customer_id: customer.id },
          provider_identities: [
            {
              id: "provider_emailpass",
              provider: "emailpass",
              entity_id: customer.email,
            },
          ],
        },
      ]),
      deleteProviderIdentities: jest.fn().mockResolvedValue(undefined),
      deleteAuthIdentities: jest.fn().mockResolvedValue(undefined),
    };
    const coordinationModule = {
      createAccountSecurityEvents: jest.fn().mockResolvedValue({}),
    };
    const notificationModule = {
      createNotifications: jest.fn().mockResolvedValue({}),
    };
    const req = {
      auth_context: { actor_id: customer.id },
      headers: { "x-customer-reauth-token": reauthToken },
      scope: {
        resolve: jest.fn((key: string) => {
          if (key === Modules.CUSTOMER) return customerModule;
          if (key === Modules.AUTH) return authModule;
          if (key === ACCOUNT_COORDINATION_MODULE) return coordinationModule;
          if (key === "notification") return notificationModule;
          throw new Error(`Unexpected module ${key}`);
        }),
      },
      get: jest.fn((name: string) =>
        name.toLowerCase() === "x-customer-reauth-token" ? reauthToken : "",
      ),
    };
    const res = createResponse();

    await DELETE(req as never, res as never);

    expect(authModule.deleteProviderIdentities).toHaveBeenCalledWith([
      "provider_google",
    ]);
    expect(authModule.deleteAuthIdentities).toHaveBeenCalledWith([
      "auth_google",
    ]);
    expect(coordinationModule.createAccountSecurityEvents).toHaveBeenCalledWith(
      expect.objectContaining({
        customer_id: customer.id,
        event_type: "login_method.google.disconnected",
        provider: "google",
      }),
    );
    expect(res.json).toHaveBeenCalledWith({
      login_method: "google",
      disconnected: true,
    });
  });

  it("refuses to remove the last usable login method", async () => {
    const customer = { id: "cus_123", email: "ava@example.com" };
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
      deleteProviderIdentities: jest.fn(),
      deleteAuthIdentities: jest.fn(),
    };
    const req = {
      auth_context: { actor_id: customer.id },
      get: jest.fn(() => reauthToken),
      scope: {
        resolve: jest.fn((key: string) => {
          if (key === Modules.CUSTOMER) return customerModule;
          if (key === Modules.AUTH) return authModule;
          throw new Error(`Unexpected module ${key}`);
        }),
      },
    };
    const res = createResponse();

    await DELETE(req as never, res as never);

    expect(authModule.deleteProviderIdentities).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({
      message: "Add another login method before disconnecting Google",
      code: "last_login_method",
    });
  });
});
