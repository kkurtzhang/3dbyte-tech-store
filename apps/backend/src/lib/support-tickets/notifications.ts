import type { MedusaContainer } from "@medusajs/framework/types";

import {
  renderSupportTicketCustomerCreatedEmail,
  renderSupportTicketCustomerReplyEmail,
  renderSupportTicketInternalCreatedEmail,
} from "../../emails/renderers/support-ticket";
import { resolveSenderProfileFromContainer } from "../email-settings/sender-profiles";
import type { SupportTicketMessageRecord, SupportTicketRecord } from "./types";

const getSupportInboxEmail = (): string =>
  process.env.SUPPORT_TICKET_INBOX_EMAIL || "support@3dbytetech.com.au";

export const sendSupportTicketCreatedNotifications = async ({
  container,
  ticket,
}: {
  container: MedusaContainer;
  ticket: SupportTicketRecord;
}) => {
  const notificationModule = container.resolve<{
    createNotifications: (payload: Record<string, unknown>) => Promise<unknown>;
  }>("notification");
  const senderProfile = await resolveSenderProfileFromContainer(
    container,
    "default",
  );
  const supportInboxEmail = getSupportInboxEmail();
  const customerContent = await renderSupportTicketCustomerCreatedEmail({
    supportInboxEmail,
    ticket,
  });
  const internalContent = await renderSupportTicketInternalCreatedEmail({
    supportInboxEmail,
    ticket,
  });

  await notificationModule.createNotifications({
    to: ticket.customer_email,
    channel: "email",
    template: "support-ticket-created",
    from: senderProfile.from,
    provider_data: {
      reply_to: senderProfile.reply_to,
    },
    idempotency_key: `support-ticket/customer-created/${ticket.id}`,
    content: customerContent,
    data: {
      ticket,
      email_metadata: {
        entity_id: ticket.id,
        event: "support_ticket.created.customer",
      },
    },
  });

  await notificationModule.createNotifications({
    to: supportInboxEmail,
    channel: "email",
    template: "support-ticket-internal-alert",
    from: senderProfile.from,
    provider_data: {
      reply_to: ticket.customer_email,
    },
    idempotency_key: `support-ticket/internal-created/${ticket.id}`,
    content: internalContent,
    data: {
      ticket,
      email_metadata: {
        entity_id: ticket.id,
        event: "support_ticket.created.internal",
      },
    },
  });
};

export const sendSupportTicketCustomerReplyNotification = async ({
  container,
  message,
  ticket,
}: {
  container: MedusaContainer;
  message: SupportTicketMessageRecord;
  ticket: SupportTicketRecord;
}) => {
  const notificationModule = container.resolve<{
    createNotifications: (payload: Record<string, unknown>) => Promise<unknown>;
  }>("notification");
  const senderProfile = await resolveSenderProfileFromContainer(
    container,
    "default",
  );
  const content = await renderSupportTicketCustomerReplyEmail({
    message,
    supportInboxEmail: getSupportInboxEmail(),
    ticket,
  });

  await notificationModule.createNotifications({
    to: ticket.customer_email,
    channel: "email",
    template: "support-ticket-reply",
    from: senderProfile.from,
    provider_data: {
      reply_to: senderProfile.reply_to,
    },
    idempotency_key: `support-ticket/customer-reply/${message.id}`,
    content,
    data: {
      message,
      ticket,
      email_metadata: {
        entity_id: ticket.id,
        event: "support_ticket.reply.customer",
      },
    },
  });
};
