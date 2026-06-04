import { Modules } from "@medusajs/framework/utils";

import { GET, POST } from "../route";

jest.mock("../../../../../emails/renderers/customer-email-verification", () => ({
  renderCustomerEmailVerificationEmail: jest.fn(async ({ verificationUrl }) => ({
    html: `<a href="${verificationUrl}">Confirm email</a>`,
    subject: "Confirm your 3D Byte Tech account",
    text: `Confirm email: ${verificationUrl}`,
  })),
}))

function createResponse() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
    redirect: jest.fn(),
  };
}

function createRequest({
  actorId = "cus_123",
  customerModule,
  notificationModule,
  query = {},
}: {
  actorId?: string | null;
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
    const {
      createCustomerEmailVerificationToken,
    } = await import("../../../../../lib/customer-verification/tokens");
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
    expect(res.redirect).toHaveBeenCalledWith(
      "https://store.example.com/sign-in?verified=1",
    );
  });
});
