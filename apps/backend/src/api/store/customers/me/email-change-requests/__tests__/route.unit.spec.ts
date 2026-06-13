import { Modules } from "@medusajs/framework/utils";

import { POST } from "../route";

jest.mock(
  "../../../../../../emails/renderers/customer-email-verification",
  () => ({
    renderCustomerEmailVerificationEmail: jest.fn(
      async ({ verificationUrl }) => ({
        html: `<a href="${verificationUrl}">Confirm email</a>`,
        subject: "Confirm your new email",
        text: `Confirm email: ${verificationUrl}`,
      }),
    ),
  }),
);

function createResponse() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  };
}

function createRequest({
  authModule,
  coordinationModule,
  customerModule,
  notificationModule,
}: {
  authModule: Record<string, jest.Mock>;
  coordinationModule?: Record<string, jest.Mock>;
  customerModule: Record<string, jest.Mock>;
  notificationModule?: Record<string, jest.Mock>;
}) {
  return {
    auth_context: { actor_id: "cus_123" },
    body: {
      email: "New@Example.COM",
      current_password: "CurrentPassword123!",
    },
    headers: {},
    protocol: "https",
    query: {},
    url: "/store/customers/me/email-change-requests",
    scope: {
      resolve: jest.fn((key: string) => {
        if (key === Modules.AUTH) return authModule;
        if (key === Modules.CUSTOMER) return customerModule;
        if (key === "notification") return notificationModule;
        if (key === "accountCoordination") return coordinationModule;
        throw new Error(`Unexpected module ${key}`);
      }),
    },
  };
}

describe("POST /store/customers/me/email-change-requests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.CUSTOMER_EMAIL_VERIFICATION_SECRET = "test-secret";
    process.env.STOREFRONT_URL = "https://store.example.com";
  });

  afterEach(() => {
    delete process.env.CUSTOMER_EMAIL_VERIFICATION_SECRET;
    delete process.env.STOREFRONT_URL;
  });

  it("verifies the current password and sends a confirmation to an unused email", async () => {
    const authModule = {
      authenticate: jest.fn().mockResolvedValue({
        success: true,
        authIdentity: {
          id: "auth_123",
          app_metadata: { customer_id: "cus_123" },
        },
      }),
      listAuthIdentities: jest.fn().mockResolvedValue([
        {
          id: "auth_123",
          app_metadata: { customer_id: "cus_123" },
          provider_identities: [
            {
              id: "pi_email",
              provider: "emailpass",
              entity_id: "old@example.com",
            },
          ],
        },
      ]),
      listProviderIdentities: jest.fn().mockResolvedValue([]),
    };
    const customerModule = {
      retrieveCustomer: jest.fn().mockResolvedValue({
        id: "cus_123",
        email: "old@example.com",
        metadata: { email_verification_status: "verified" },
      }),
      listCustomers: jest.fn().mockResolvedValue([]),
      updateCustomers: jest.fn().mockResolvedValue({ id: "cus_123" }),
    };
    const notificationModule = {
      createNotifications: jest.fn().mockResolvedValue([{ id: "noti_123" }]),
    };
    const coordinationModule = {
      createAccountSecurityEvents: jest.fn().mockResolvedValue({ id: "ase_1" }),
    };
    const req = createRequest({
      authModule,
      coordinationModule,
      customerModule,
      notificationModule,
    });
    const res = createResponse();

    await POST(req as never, res as never);

    expect(authModule.authenticate).toHaveBeenCalledWith(
      "emailpass",
      expect.objectContaining({
        body: {
          email: "old@example.com",
          password: "CurrentPassword123!",
        },
      }),
    );
    expect(customerModule.updateCustomers).toHaveBeenCalledWith(
      "cus_123",
      {
        metadata: expect.objectContaining({
          pending_email_change: expect.objectContaining({
            email: "new@example.com",
          }),
        }),
      },
    );
    expect(notificationModule.createNotifications).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "new@example.com",
        template: "customer-email-change",
      }),
    );
    expect(res.json).toHaveBeenCalledWith({
      sent: true,
      email: "new@example.com",
    });
  });

  it("requires Google to be disconnected before changing canonical email", async () => {
    const authModule = {
      listAuthIdentities: jest.fn().mockResolvedValue([
        {
          id: "auth_google",
          app_metadata: { customer_id: "cus_123" },
          provider_identities: [
            {
              id: "pi_google",
              provider: "google",
              entity_id: "old@example.com",
            },
          ],
        },
      ]),
    };
    const customerModule = {
      retrieveCustomer: jest.fn().mockResolvedValue({
        id: "cus_123",
        email: "old@example.com",
        metadata: {},
      }),
    };
    const req = createRequest({ authModule, customerModule });
    const res = createResponse();

    await POST(req as never, res as never);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: "google_disconnect_required" }),
    );
  });

  it("rejects email addresses already claimed by a registered customer", async () => {
    const authModule = {
      listAuthIdentities: jest.fn().mockResolvedValue([
        {
          id: "auth_123",
          app_metadata: { customer_id: "cus_123" },
          provider_identities: [
            {
              id: "pi_email",
              provider: "emailpass",
              entity_id: "old@example.com",
            },
          ],
        },
      ]),
    };
    const customerModule = {
      retrieveCustomer: jest.fn().mockResolvedValue({
        id: "cus_123",
        email: "old@example.com",
        metadata: {},
      }),
      listCustomers: jest.fn().mockResolvedValue([
        {
          id: "cus_other",
          email: "new@example.com",
          has_account: true,
        },
      ]),
    };
    const req = createRequest({ authModule, customerModule });
    const res = createResponse();

    await POST(req as never, res as never);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: "email_unavailable" }),
    );
  });
});
