import { Modules } from "@medusajs/framework/utils";

import { consolidateGuestHistory } from "../../../../../modules/account-coordination/consolidate-guest-history";
import { GET, POST } from "../route";

jest.mock(
  "../../../../../modules/account-coordination/consolidate-guest-history",
  () => ({
    consolidateGuestHistory: jest.fn().mockResolvedValue({
      mode: "dry_run",
      status: "completed",
      transferred_order_ids: [],
    }),
  }),
);
jest.mock(
  "../../../../../emails/renderers/customer-email-verification",
  () => ({
    renderCustomerEmailVerificationEmail: jest.fn(
      async ({ verificationUrl }) => ({
        html: `<a href="${verificationUrl}">Confirm email</a>`,
        subject: "Confirm your 3D Byte Tech account",
        text: `Confirm email: ${verificationUrl}`,
      }),
    ),
  }),
);

function createResponse() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
    redirect: jest.fn(),
  };
}

function createRequest({
  actorId = "cus_123",
  authModule,
  coordinationModule,
  customerModule,
  notificationModule,
  query = {},
}: {
  actorId?: string | null;
  authModule?: Record<string, jest.Mock>;
  coordinationModule?: Record<string, jest.Mock>;
  customerModule: Record<string, jest.Mock>;
  notificationModule?: Record<string, jest.Mock>;
  query?: Record<string, unknown>;
}) {
  return {
    auth_context: actorId ? { actor_id: actorId } : undefined,
    query,
    scope: {
      resolve: jest.fn((key: string) => {
        if (key === Modules.CUSTOMER) {
          return customerModule;
        }

        if (key === Modules.AUTH) {
          return authModule;
        }

        if (key === "accountCoordination") {
          return coordinationModule;
        }

        if (key === "notification") {
          return notificationModule;
        }

        throw new Error(`Unexpected module ${key}`);
      }),
    },
  };
}

describe("store customer email verification route", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.CUSTOMER_EMAIL_VERIFICATION_SECRET = "test-secret";
    process.env.STOREFRONT_URL = "https://store.example.com";
  });

  afterEach(() => {
    delete process.env.CUSTOMER_EMAIL_VERIFICATION_SECRET;
    delete process.env.STOREFRONT_URL;
  });

  it("sends a confirmation link and marks the customer verification as pending", async () => {
    const customerModule = {
      retrieveCustomer: jest.fn().mockResolvedValue({
        id: "cus_123",
        email: "Ava@Example.COM",
        metadata: {},
      }),
      updateCustomers: jest.fn().mockResolvedValue({ id: "cus_123" }),
    };
    const notificationModule = {
      createNotifications: jest.fn().mockResolvedValue([{ id: "noti_123" }]),
    };
    const req = createRequest({ customerModule, notificationModule });
    const res = createResponse();

    await POST(req as never, res as never);

    expect(customerModule.updateCustomers).toHaveBeenCalledWith({
      id: "cus_123",
      metadata: expect.objectContaining({
        email_verification_status: "pending",
      }),
    });
    expect(notificationModule.createNotifications).toHaveBeenCalledWith(
      expect.objectContaining({
        channel: "email",
        template: "customer-email-verification",
        to: "ava@example.com",
        content: expect.objectContaining({
          subject: "Confirm your 3D Byte Tech account",
        }),
      }),
    );
    expect(res.json).toHaveBeenCalledWith({ sent: true });
  });

  it("does not downgrade an already verified customer when resend is requested", async () => {
    const customerModule = {
      retrieveCustomer: jest.fn().mockResolvedValue({
        id: "cus_123",
        email: "ava@example.com",
        metadata: {
          email_verification_status: "verified",
          email_verified_at: "2026-06-04T00:00:00.000Z",
        },
      }),
      updateCustomers: jest.fn(),
    };
    const notificationModule = {
      createNotifications: jest.fn(),
    };
    const req = createRequest({ customerModule, notificationModule });
    const res = createResponse();

    await POST(req as never, res as never);

    expect(customerModule.updateCustomers).not.toHaveBeenCalled();
    expect(notificationModule.createNotifications).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({
      sent: false,
      already_verified: true,
    });
  });

  it("confirms a valid token and redirects customers to sign in", async () => {
    const { createCustomerEmailVerificationToken } = await import(
      "../../../../../lib/customer-verification/tokens"
    );
    const token = createCustomerEmailVerificationToken({
      customerId: "cus_123",
      email: "ava@example.com",
      expiresInSeconds: 60,
      issuedAt: new Date(),
      secret: "test-secret",
    });
    const customerModule = {
      retrieveCustomer: jest.fn().mockResolvedValue({
        id: "cus_123",
        email: "ava@example.com",
        metadata: {
          email_verification_status: "pending",
        },
      }),
      updateCustomers: jest.fn().mockResolvedValue({ id: "cus_123" }),
    };
    const req = createRequest({
      actorId: null,
      customerModule,
      query: { token },
    });
    const res = createResponse();

    await GET(req as never, res as never);

    expect(customerModule.updateCustomers).toHaveBeenCalledWith({
      id: "cus_123",
      metadata: expect.objectContaining({
        email_verification_status: "verified",
        email_verified_at: expect.any(String),
      }),
    });
    expect(consolidateGuestHistory).toHaveBeenCalledWith({
      container: req.scope,
      customerId: "cus_123",
    });
    expect(
      (consolidateGuestHistory as jest.Mock).mock.invocationCallOrder[0],
    ).toBeLessThan(customerModule.updateCustomers.mock.invocationCallOrder[0]);
    expect(res.redirect).toHaveBeenCalledWith(
      "https://store.example.com/sign-in?verified=1",
    );
  });

  it("confirms a valid token with a JSON response for storefront verification pages", async () => {
    const { createCustomerEmailVerificationToken } = await import(
      "../../../../../lib/customer-verification/tokens"
    );
    const token = createCustomerEmailVerificationToken({
      customerId: "cus_123",
      email: "ava@example.com",
      expiresInSeconds: 60,
      issuedAt: new Date(),
      secret: "test-secret",
    });
    const customerModule = {
      retrieveCustomer: jest.fn().mockResolvedValue({
        id: "cus_123",
        email: "ava@example.com",
        metadata: {
          email_verification_status: "pending",
        },
      }),
      updateCustomers: jest.fn().mockResolvedValue({ id: "cus_123" }),
    };
    const req = createRequest({
      actorId: null,
      customerModule,
      query: { token, response: "json" },
    });
    const res = createResponse();

    await GET(req as never, res as never);

    expect(res.redirect).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({
      verified: true,
      redirect_to: "https://store.example.com/sign-in?verified=1",
    });
  });

  it("returns a failed JSON response when the verification token is invalid", async () => {
    const customerModule = {
      retrieveCustomer: jest.fn(),
      updateCustomers: jest.fn(),
    };
    const req = createRequest({
      actorId: null,
      customerModule,
      query: { token: "not-a-token", response: "json" },
    });
    const res = createResponse();

    await GET(req as never, res as never);

    expect(customerModule.retrieveCustomer).not.toHaveBeenCalled();
    expect(res.redirect).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({
      verified: false,
      redirect_to: "https://store.example.com/sign-in?verified=0",
    });
  });

  it("applies a verified pending email change without claiming historical orders", async () => {
    const { createCustomerEmailVerificationToken } = await import(
      "../../../../../lib/customer-verification/tokens"
    );
    const token = createCustomerEmailVerificationToken({
      customerId: "cus_123",
      email: "new@example.com",
      expiresInSeconds: 60,
      issuedAt: new Date(),
      secret: "test-secret",
    });
    const customerModule = {
      retrieveCustomer: jest.fn().mockResolvedValue({
        id: "cus_123",
        email: "old@example.com",
        metadata: {
          email_verification_status: "verified",
          email_verified_at: "2026-06-04T00:00:00.000Z",
          pending_email_change: {
            email: "new@example.com",
            requested_at: "2026-06-07T00:00:00.000Z",
          },
        },
      }),
      listCustomers: jest.fn().mockResolvedValue([]),
      updateCustomers: jest.fn().mockResolvedValue({ id: "cus_123" }),
    };
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
      listProviderIdentities: jest.fn().mockResolvedValue([]),
      updateProviderIdentities: jest.fn().mockResolvedValue({
        id: "pi_email",
        entity_id: "new@example.com",
      }),
    };
    const coordinationModule = {
      createAccountSecurityEvents: jest.fn().mockResolvedValue({ id: "ase_1" }),
    };
    const notificationModule = {
      createNotifications: jest.fn().mockResolvedValue([]),
    };
    const req = createRequest({
      actorId: null,
      authModule,
      coordinationModule,
      customerModule,
      notificationModule,
      query: { token },
    });
    const res = createResponse();

    await GET(req as never, res as never);

    expect(authModule.updateProviderIdentities).toHaveBeenCalledWith({
      id: "pi_email",
      entity_id: "new@example.com",
    });
    expect(customerModule.updateCustomers).toHaveBeenCalledWith({
      id: "cus_123",
      email: "new@example.com",
      metadata: expect.not.objectContaining({
        pending_email_change: expect.anything(),
      }),
    });
    expect(consolidateGuestHistory).not.toHaveBeenCalled();
    expect(res.redirect).toHaveBeenCalledWith(
      "https://store.example.com/account/settings?email=changed",
    );
  });

  it("returns account-settings redirect details for JSON email-change verification", async () => {
    const { createCustomerEmailVerificationToken } = await import(
      "../../../../../lib/customer-verification/tokens"
    );
    const token = createCustomerEmailVerificationToken({
      customerId: "cus_123",
      email: "new@example.com",
      expiresInSeconds: 60,
      issuedAt: new Date(),
      secret: "test-secret",
    });
    const customerModule = {
      retrieveCustomer: jest.fn().mockResolvedValue({
        id: "cus_123",
        email: "old@example.com",
        metadata: {
          email_verification_status: "verified",
          email_verified_at: "2026-06-04T00:00:00.000Z",
          pending_email_change: {
            email: "new@example.com",
            requested_at: "2026-06-07T00:00:00.000Z",
          },
        },
      }),
      listCustomers: jest.fn().mockResolvedValue([]),
      updateCustomers: jest.fn().mockResolvedValue({ id: "cus_123" }),
    };
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
      listProviderIdentities: jest.fn().mockResolvedValue([]),
      updateProviderIdentities: jest.fn().mockResolvedValue({
        id: "pi_email",
        entity_id: "new@example.com",
      }),
    };
    const coordinationModule = {
      createAccountSecurityEvents: jest.fn().mockResolvedValue({ id: "ase_1" }),
    };
    const notificationModule = {
      createNotifications: jest.fn().mockResolvedValue([]),
    };
    const req = createRequest({
      actorId: null,
      authModule,
      coordinationModule,
      customerModule,
      notificationModule,
      query: { token, response: "json" },
    });
    const res = createResponse();

    await GET(req as never, res as never);

    expect(res.redirect).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({
      verified: true,
      redirect_to: "https://store.example.com/account/settings?email=changed",
    });
  });
});
