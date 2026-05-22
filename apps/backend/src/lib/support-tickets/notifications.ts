import type { MedusaContainer } from "@medusajs/framework/types"

import { resolveSenderProfileFromContainer } from "../email-settings/sender-profiles"
import type { SupportTicketMessageRecord, SupportTicketRecord } from "./types"

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")

const getSupportInboxEmail = (): string =>
  process.env.SUPPORT_TICKET_INBOX_EMAIL || "support@3dbytetech.com.au"

const buildCustomerCreatedContent = (ticket: SupportTicketRecord) => ({
  subject: `Support request received: ${ticket.ticket_number}`,
  text: [
    `Hi ${ticket.customer_name},`,
    "",
    `We received your support request ${ticket.ticket_number}.`,
    "Our team will review it and reply as soon as possible.",
    "",
    `Subject: ${ticket.subject}`,
  ].join("\n"),
  html: `<p>Hi ${escapeHtml(ticket.customer_name)},</p><p>We received your support request <strong>${escapeHtml(
    ticket.ticket_number
  )}</strong>. Our team will review it and reply as soon as possible.</p><p><strong>Subject:</strong> ${escapeHtml(
    ticket.subject
  )}</p>`,
})

const buildInternalCreatedContent = (ticket: SupportTicketRecord) => ({
  subject: `New support ticket ${ticket.ticket_number}: ${ticket.subject}`,
  text: [
    `New support ticket ${ticket.ticket_number}`,
    `Customer: ${ticket.customer_name} <${ticket.customer_email}>`,
    `Category: ${ticket.category}`,
    `Source: ${ticket.source}`,
    "",
    ticket.ai_summary ? `AI summary: ${ticket.ai_summary}` : "",
  ]
    .filter(Boolean)
    .join("\n"),
  html: `<p><strong>New support ticket ${escapeHtml(
    ticket.ticket_number
  )}</strong></p><p>${escapeHtml(ticket.customer_name)} &lt;${escapeHtml(
    ticket.customer_email
  )}&gt;</p><p>Category: ${escapeHtml(String(ticket.category))}<br />Source: ${escapeHtml(
    String(ticket.source)
  )}</p>${
    ticket.ai_summary
      ? `<p><strong>AI summary:</strong> ${escapeHtml(ticket.ai_summary)}</p>`
      : ""
  }`,
})

const buildCustomerReplyContent = (
  ticket: SupportTicketRecord,
  message: SupportTicketMessageRecord
) => ({
  subject: `Update on ${ticket.ticket_number}: ${ticket.subject}`,
  text: [
    `Hi ${ticket.customer_name},`,
    "",
    message.body,
    "",
    `Ticket: ${ticket.ticket_number}`,
  ].join("\n"),
  html: `<p>Hi ${escapeHtml(ticket.customer_name)},</p><p>${escapeHtml(
    message.body
  ).replace(/\n/g, "<br />")}</p><p>Ticket: ${escapeHtml(
    ticket.ticket_number
  )}</p>`,
})

export const sendSupportTicketCreatedNotifications = async ({
  container,
  ticket,
}: {
  container: MedusaContainer
  ticket: SupportTicketRecord
}) => {
  const notificationModule = container.resolve<{
    createNotifications: (payload: Record<string, unknown>) => Promise<unknown>
  }>("notification")
  const senderProfile = await resolveSenderProfileFromContainer(
    container,
    "default"
  )

  await notificationModule.createNotifications({
    to: ticket.customer_email,
    channel: "email",
    template: "support-ticket-created",
    from: senderProfile.from,
    provider_data: {
      reply_to: senderProfile.reply_to,
    },
    idempotency_key: `support-ticket/customer-created/${ticket.id}`,
    content: buildCustomerCreatedContent(ticket),
    data: {
      ticket,
      email_metadata: {
        entity_id: ticket.id,
        event: "support_ticket.created.customer",
      },
    },
  })

  await notificationModule.createNotifications({
    to: getSupportInboxEmail(),
    channel: "email",
    template: "support-ticket-internal-alert",
    from: senderProfile.from,
    provider_data: {
      reply_to: ticket.customer_email,
    },
    idempotency_key: `support-ticket/internal-created/${ticket.id}`,
    content: buildInternalCreatedContent(ticket),
    data: {
      ticket,
      email_metadata: {
        entity_id: ticket.id,
        event: "support_ticket.created.internal",
      },
    },
  })
}

export const sendSupportTicketCustomerReplyNotification = async ({
  container,
  message,
  ticket,
}: {
  container: MedusaContainer
  message: SupportTicketMessageRecord
  ticket: SupportTicketRecord
}) => {
  const notificationModule = container.resolve<{
    createNotifications: (payload: Record<string, unknown>) => Promise<unknown>
  }>("notification")
  const senderProfile = await resolveSenderProfileFromContainer(
    container,
    "default"
  )

  await notificationModule.createNotifications({
    to: ticket.customer_email,
    channel: "email",
    template: "support-ticket-reply",
    from: senderProfile.from,
    provider_data: {
      reply_to: senderProfile.reply_to,
    },
    idempotency_key: `support-ticket/customer-reply/${message.id}`,
    content: buildCustomerReplyContent(ticket, message),
    data: {
      message,
      ticket,
      email_metadata: {
        entity_id: ticket.id,
        event: "support_ticket.reply.customer",
      },
    },
  })
}
