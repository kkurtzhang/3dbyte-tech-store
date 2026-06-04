import passwordResetHandler, { config } from "../auth-password-reset";
import { renderCustomerPasswordResetEmail } from "../../emails/renderers/customer-password-reset";

jest.mock("../../emails/renderers/customer-password-reset", () => ({
  renderCustomerPasswordResetEmail: jest.fn(async ({ resetPasswordUrl }) => ({
    html: `<a href="${resetPasswordUrl}">Reset password</a>`,
    subject: "Reset your 3D Byte Tech password",
    text: `Reset password: ${resetPasswordUrl}`,
  })),
}));

const mockedRenderCustomerPasswordResetEmail =
  renderCustomerPasswordResetEmail as jest.MockedFunction<
    typeof renderCustomerPasswordResetEmail
  >;

describe("auth password reset subscriber", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = {
      ...originalEnv,
      APP_ENV: "staging",
      STOREFRONT_URL: "https://store.example.com/",
    };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("sends a storefront password reset email for customer reset events", async () => {
    const notificationModule = {
      createNotifications: jest.fn().mockResolvedValue([{ id: "noti_123" }]),
    };
    const emailSettings = {
      getResolvedSenderProfile: jest.fn().mockResolvedValue({
        from: "3D Byte Tech <staging-no-reply@3dbytetech.com.au>",
        reply_to: "support@3dbytetech.com.au",
      }),
    };
    const query = {
      graph: jest.fn().mockResolvedValue({ data: [{ name: "3D Byte Tech" }] }),
    };
    const container = {
      resolve: jest.fn((key: string) => {
        if (key === "notification") return notificationModule;
        if (key === "emailSettings") return emailSettings;
        if (key === "query") return query;
        throw new Error(`Unexpected dependency ${key}`);
      }),
    };

    await passwordResetHandler({
      event: {
        data: {
          actor_type: "customer",
          entity_id: "Ava@Example.COM",
          token: "reset token",
        },
      },
      container,
    } as never);

    expect(config).toEqual({ event: "auth.password_reset" });
    expect(mockedRenderCustomerPasswordResetEmail).toHaveBeenCalledWith({
      customerEmail: "ava@example.com",
      resetPasswordUrl:
        "https://store.example.com/reset-password?token=reset+token&email=ava%40example.com",
      storeName: "3D Byte Tech",
    });
    expect(notificationModule.createNotifications).toHaveBeenCalledWith(
      expect.objectContaining({
        channel: "email",
        from: "3D Byte Tech <staging-no-reply@3dbytetech.com.au>",
        provider_data: {
          reply_to: "support@3dbytetech.com.au",
        },
        template: "password-reset",
        to: "ava@example.com",
      }),
    );
  });

  it("ignores non-customer password reset events", async () => {
    const notificationModule = {
      createNotifications: jest.fn(),
    };
    const container = {
      resolve: jest.fn((key: string) => {
        if (key === "notification") return notificationModule;
        throw new Error(`Unexpected dependency ${key}`);
      }),
    };

    await passwordResetHandler({
      event: {
        data: {
          actor_type: "user",
          entity_id: "admin@example.com",
          token: "reset-token",
        },
      },
      container,
    } as never);

    expect(notificationModule.createNotifications).not.toHaveBeenCalled();
  });
});
