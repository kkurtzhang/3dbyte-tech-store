import nodemailer from "nodemailer";

import MaildevNotificationProviderService from "../service";

jest.mock("nodemailer", () => ({
  createTransport: jest.fn(),
}));

const sendMail = jest.fn();

const logger = {
  debug: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
};

const options = {
  channels: ["email"],
  from: "store@example.com",
  host: "192.168.0.45",
  port: 1025,
  secure: false,
  rejectUnauthorized: false,
  webUrl: "http://192.168.0.45:1080",
};

describe("MaildevNotificationProviderService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    sendMail.mockResolvedValue({ messageId: "maildev-message-id" });
    jest.mocked(nodemailer.createTransport).mockReturnValue({
      sendMail,
    } as never);
  });

  it("creates an SMTP transport for the configured MailDev server", () => {
    new MaildevNotificationProviderService({ logger }, options);

    expect(nodemailer.createTransport).toHaveBeenCalledWith({
      host: "192.168.0.45",
      port: 1025,
      secure: false,
      tls: {
        rejectUnauthorized: false,
      },
    });
  });

  it("sends Medusa email notifications to MailDev", async () => {
    const service = new MaildevNotificationProviderService(
      { logger },
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
        data: { order_id: "order_123" },
        template: "order-confirmed",
        to: "ada@example.com",
      }),
    ).resolves.toEqual({ id: "maildev-message-id" });

    expect(sendMail).toHaveBeenCalledWith({
      from: "store@example.com",
      html: "<p>Hello Ada</p>",
      subject: "Order confirmed",
      text: "Hello Ada",
      to: "ada@example.com",
    });
  });

  it("renders a safe fallback body when notification content is omitted", async () => {
    const service = new MaildevNotificationProviderService(
      { logger },
      options,
    );

    await service.send({
      channel: "email",
      data: {
        customer: "<Ada>",
      },
      template: "password-reset",
      to: "ada@example.com",
    });

    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        html: expect.stringContaining("&lt;Ada&gt;"),
        subject: "Medusa notification: password-reset",
        text: expect.stringContaining('"customer": "<Ada>"'),
      }),
    );
  });
});
