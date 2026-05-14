import { Resend } from "resend";

import ResendNotificationProviderService from "../service";

jest.mock("resend", () => ({
  Resend: jest.fn(),
}));

const fetchMock = jest.fn();
const send = jest.fn();
const originalFetch = global.fetch;

const logger = {
  debug: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
};

describe("ResendNotificationProviderService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = fetchMock as unknown as typeof fetch;
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ id: "resend-message-id" }),
    });
    send.mockResolvedValue({ data: { id: "email_123" }, error: null });
    jest.mocked(Resend).mockImplementation(
      () =>
        ({
          emails: { send },
        }) as never,
    );
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it("sends Medusa notifications through the Resend SDK by default", async () => {
    const service = new ResendNotificationProviderService(
      { logger: logger as never },
      {
        apiKey: "re_test",
        from: "3D Byte Tech <orders@example.com.au>",
      },
    );

    await expect(
      service.send({
        channel: "email",
        content: {
          html: "<p>Ready</p>",
          subject: "Back in stock",
          text: "Ready",
        },
        data: {},
        idempotency_key: "waitlist/wait_1",
        template: "waitlist-back-in-stock",
        to: "ava@example.com",
      } as never),
    ).resolves.toEqual({ id: "email_123" });

    expect(Resend).toHaveBeenCalledWith("re_test");
    expect(send).toHaveBeenCalledWith(
      {
        from: "3D Byte Tech <orders@example.com.au>",
        html: "<p>Ready</p>",
        subject: "Back in stock",
        text: "Ready",
        to: "ava@example.com",
      },
      {
        idempotencyKey: "waitlist/wait_1",
      },
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("supports custom Resend-compatible API URLs for deployment", async () => {
    const service = new ResendNotificationProviderService(
      { logger: logger as never },
      {
        apiKey: "re_test",
        apiUrl: "https://resend-proxy.internal",
        channels: ["email"],
        from: "3D Byte Tech <orders@example.com.au>",
      },
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

    expect(fetchMock).toHaveBeenCalledWith(
      "https://resend-proxy.internal/emails",
      {
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
      },
    );
    expect(send).not.toHaveBeenCalled();
  });

  it("throws useful errors from the SDK", async () => {
    send.mockResolvedValue({
      data: null,
      error: { message: "Invalid API key" },
    });
    const service = new ResendNotificationProviderService(
      { logger: logger as never },
      {
        apiKey: "re_test",
        from: "3D Byte Tech <orders@example.com.au>",
      },
    );

    await expect(
      service.send({
        channel: "email",
        content: { subject: "Back in stock" },
        data: {},
        template: "waitlist-back-in-stock",
        to: "ava@example.com",
      } as never),
    ).rejects.toThrow("Invalid API key");
  });

  it("throws useful errors from a custom Resend-compatible API URL", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 422,
      json: async () => ({
        message: "The from address is not verified.",
      }),
    });
    const service = new ResendNotificationProviderService(
      { logger: logger as never },
      {
        apiKey: "re_test",
        apiUrl: "https://resend-proxy.internal",
        from: "3D Byte Tech <orders@example.com.au>",
      },
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
