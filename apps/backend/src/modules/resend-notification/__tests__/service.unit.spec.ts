import ResendNotificationProviderService from "../service";

const fetchMock = jest.fn();

global.fetch = fetchMock as unknown as typeof fetch;

const logger = {
  debug: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
};

const options = {
  apiKey: "re_test",
  apiUrl: "https://api.resend.com",
  channels: ["email"],
  from: "3D Byte Tech <orders@example.com.au>",
};

describe("ResendNotificationProviderService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ id: "resend-message-id" }),
    });
  });

  it("sends Medusa email notifications through the Resend API", async () => {
    const service = new ResendNotificationProviderService(
      { logger: logger as never },
      options,
    );

    await expect(
      service.send({
        channel: "email",
        content: {
          html: "<p>Hello Ada</p>",
          subject: "Order confirmed",
          text: "Hello Ada",
        },
        data: {
          email_metadata: {
            idempotency_key: "order-placed/order_123",
          },
        },
        template: "order-confirmed",
        to: "ada@example.com",
      }),
    ).resolves.toEqual({ id: "resend-message-id" });

    expect(fetchMock).toHaveBeenCalledWith("https://api.resend.com/emails", {
      body: JSON.stringify({
        from: "3D Byte Tech <orders@example.com.au>",
        html: "<p>Hello Ada</p>",
        subject: "Order confirmed",
        text: "Hello Ada",
        to: "ada@example.com",
      }),
      headers: {
        Authorization: "Bearer re_test",
        "Content-Type": "application/json",
        "Idempotency-Key": "order-placed/order_123",
      },
      method: "POST",
    });
  });

  it("throws a useful error when Resend rejects the request", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 422,
      json: async () => ({
        message: "The from address is not verified.",
      }),
    });

    const service = new ResendNotificationProviderService(
      { logger: logger as never },
      options,
    );

    await expect(
      service.send({
        channel: "email",
        content: {
          html: "<p>Hello Ada</p>",
          subject: "Order confirmed",
        },
        data: {},
        template: "order-confirmed",
        to: "ada@example.com",
      }),
    ).rejects.toThrow(
      "Resend notification failed with status 422: The from address is not verified.",
    );
  });
});
