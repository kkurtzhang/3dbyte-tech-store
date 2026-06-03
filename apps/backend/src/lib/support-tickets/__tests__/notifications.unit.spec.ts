import type { MedusaContainer } from "@medusajs/framework/types";

import {
  sendSupportTicketCreatedNotifications,
  sendSupportTicketCustomerReplyNotification,
} from "../notifications";
import type { SupportTicketMessageRecord, SupportTicketRecord } from "../types";

const ticket: SupportTicketRecord = {
  id: "spt_1",
  ticket_number: "3DBS-ABCD-234567",
  status: "new",
  priority: "normal",
  category: "order_status",
  source: "ai_chat",
  customer_email: "ava@example.com",
  customer_name: "Ava Customer",
  subject: "Need help with my order",
  order_reference: "3DB-1777978800123",
  ai_summary: "Customer asked whether the PETG spool has shipped.",
  created_at: "2026-05-20T00:00:00.000Z",
};

const createContainer = (
  createNotifications = jest.fn().mockResolvedValue({}),
) =>
  ({
    resolve: jest.fn((key: string) => {
      if (key === "notification") {
        return { createNotifications };
      }

      if (key === "emailSettings") {
        return {
          getResolvedSenderProfile: jest.fn().mockResolvedValue({
            from: "3D Byte Tech <no-reply@3dbytetech.com.au>",
            reply_to: "support@3dbytetech.com.au",
          }),
        };
      }

      throw new Error(`Unexpected module ${key}`);
    }),
  }) as unknown as MedusaContainer;

describe("support ticket email notifications", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.EMAIL_ASSET_BASE_URL = "https://store.3dbytetech.com.au";
    process.env.SUPPORT_TICKET_INBOX_EMAIL = "support@3dbytetech.com.au";
  });

  it("sends polished customer and admin ticket-created emails", async () => {
    const createNotifications = jest.fn().mockResolvedValue({});

    await sendSupportTicketCreatedNotifications({
      container: createContainer(createNotifications),
      ticket,
    });

    expect(createNotifications).toHaveBeenCalledTimes(2);

    const customerNotification = createNotifications.mock.calls[0][0];
    expect(customerNotification.content.subject).toBe(
      "We received your support request 3DBS-ABCD-234567",
    );
    expect(customerNotification.content.text).toContain(
      "We have your message and opened support request 3DBS-ABCD-234567.",
    );
    expect(customerNotification.content.text).toContain(
      "We will review it and reply from support@3dbytetech.com.au.",
    );
    expect(customerNotification.content.text).toContain(
      "Order reference: 3DB-1777978800123",
    );
    expect(customerNotification.content.html).toContain("What happens next");
    expect(customerNotification.content.html).not.toContain(
      "@media (prefers-color-scheme: dark)",
    );
    expect(customerNotification.content.html).toContain("Ticket details");
    expect(customerNotification.content.html).toContain("Need to add details?");
    expect(customerNotification.content.html).toContain(
      "https://store.3dbytetech.com.au/brand/logos/logo-primary-horizontal-640w.png",
    );
    expect(customerNotification.content.html).not.toContain(
      "logo-primary-horizontal-reversed-640w.png",
    );

    const adminNotification = createNotifications.mock.calls[1][0];
    expect(adminNotification.content.subject).toBe(
      "[Normal] 3DBS-ABCD-234567 - Need help with my order",
    );
    expect(adminNotification.content.text).toContain("Action needed");
    expect(adminNotification.content.text).toContain(
      "Customer: Ava Customer <ava@example.com>",
    );
    expect(adminNotification.content.text).toContain(
      "Order/reference: 3DB-1777978800123",
    );
    expect(adminNotification.content.text).toContain(
      "AI summary: Customer asked whether the PETG spool has shipped.",
    );
    expect(adminNotification.content.html).toContain("Admin triage checklist");
    expect(adminNotification.content.html).not.toContain(
      "@media (prefers-color-scheme: dark)",
    );
    expect(adminNotification.content.html).toContain("Customer context");
    expect(adminNotification.content.html).toContain("Priority");
    expect(adminNotification.content.html).toContain(
      "https://store.3dbytetech.com.au/brand/logos/logo-primary-horizontal-640w.png",
    );
    expect(adminNotification.content.html).not.toContain(
      "logo-primary-horizontal-reversed-640w.png",
    );
  });

  it("sends customer replies with the ticket context and support footer", async () => {
    const createNotifications = jest.fn().mockResolvedValue({});
    const message: SupportTicketMessageRecord = {
      id: "msg_1",
      ticket_id: ticket.id,
      author_type: "admin",
      direction: "outbound",
      visibility: "customer",
      body: "Your order is packed and waiting for courier pickup.",
    };

    await sendSupportTicketCustomerReplyNotification({
      container: createContainer(createNotifications),
      message,
      ticket,
    });

    expect(createNotifications).toHaveBeenCalledTimes(1);

    const notification = createNotifications.mock.calls[0][0];
    expect(notification.content.subject).toBe(
      "Support update 3DBS-ABCD-234567 - Need help with my order",
    );
    expect(notification.content.text).toContain(
      "Your order is packed and waiting for courier pickup.",
    );
    expect(notification.content.text).toContain(
      "Reply to this email if you need anything else.",
    );
    expect(notification.content.html).toContain("Ticket 3DBS-ABCD-234567");
    expect(notification.content.html).not.toContain(
      "@media (prefers-color-scheme: dark)",
    );
    expect(notification.content.html).toContain("Support update");
  });
});
