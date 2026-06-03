import { pretty, render } from "@react-email/render";

import SupportTicketEmail from "../templates/support-ticket";
import type { RenderedEmail } from "../types";
import type {
  SupportTicketMessageRecord,
  SupportTicketRecord,
} from "../../lib/support-tickets/types";

type SupportTicketEmailInput = {
  supportInboxEmail: string;
  ticket: SupportTicketRecord;
};

type SupportTicketReplyEmailInput = SupportTicketEmailInput & {
  message: SupportTicketMessageRecord;
};

const formatLabel = (value: string | null | undefined): string =>
  String(value || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const getOptionalTextLine = (label: string, value?: string | null): string[] =>
  value ? [`${label}: ${value}`] : [];

const getTicketDetails = (ticket: SupportTicketRecord) => [
  { label: "Ticket", value: ticket.ticket_number },
  { label: "Subject", value: ticket.subject },
  { label: "Order reference", value: ticket.order_reference },
  { label: "Category", value: formatLabel(ticket.category) },
];

export const renderSupportTicketCustomerCreatedEmail = async ({
  supportInboxEmail,
  ticket,
}: SupportTicketEmailInput): Promise<RenderedEmail> => {
  const subject = `We received your support request ${ticket.ticket_number}`;
  const text = [
    `Hi ${ticket.customer_name},`,
    "",
    `We have your message and opened support request ${ticket.ticket_number}.`,
    `We will review it and reply from ${supportInboxEmail}.`,
    "",
    `Subject: ${ticket.subject}`,
    ...getOptionalTextLine("Order reference", ticket.order_reference),
    "",
    "What happens next",
    "- We will check the context and reply with the next best step.",
    "- Reply to this email if you want to add details.",
    "",
    "Need to add details?",
    `Reply to this email or contact ${supportInboxEmail}.`,
  ].join("\n");
  const html = await pretty(
    await render(
      <SupportTicketEmail
        bodyLines={[
          `Hi ${ticket.customer_name},`,
          `We have your message and opened support request ${ticket.ticket_number}.`,
          `We will review it and reply from ${supportInboxEmail}.`,
        ]}
        details={getTicketDetails(ticket)}
        footerText="Need to add details? Reply to this email."
        heading="Support request received"
        highlightLines={[
          "We will check the context and reply with the next best step.",
          "Reply to this email if you want to add details.",
        ]}
        highlightTitle="What happens next"
        preheader={subject}
        supportInboxEmail={supportInboxEmail}
        title="We have your support request."
      />,
    ),
  );

  return {
    html,
    subject,
    text,
  };
};

export const renderSupportTicketInternalCreatedEmail = async ({
  supportInboxEmail,
  ticket,
}: SupportTicketEmailInput): Promise<RenderedEmail> => {
  const priority = formatLabel(ticket.priority);
  const subject = `[${priority}] ${ticket.ticket_number} - ${ticket.subject}`;
  const text = [
    "Action needed",
    `Ticket: ${ticket.ticket_number}`,
    `Priority: ${priority}`,
    `Customer: ${ticket.customer_name} <${ticket.customer_email}>`,
    `Subject: ${ticket.subject}`,
    `Category: ${formatLabel(ticket.category)}`,
    `Source: ${formatLabel(ticket.source)}`,
    ...getOptionalTextLine("Order/reference", ticket.order_reference),
    "",
    ticket.ai_summary ? `AI summary: ${ticket.ai_summary}` : "",
    "",
    "Admin triage checklist",
    "- Confirm the customer context and order reference.",
    "- Reply from the admin ticket thread when ready.",
  ]
    .filter(Boolean)
    .join("\n");
  const html = await pretty(
    await render(
      <SupportTicketEmail
        bodyLines={[
          "Action needed",
          `A new support ticket is waiting for review.`,
        ]}
        details={[
          { label: "Ticket", value: ticket.ticket_number },
          { label: "Priority", value: priority },
          {
            label: "Customer context",
            value: `${ticket.customer_name} <${ticket.customer_email}>`,
          },
          { label: "Subject", value: ticket.subject },
          { label: "Category", value: formatLabel(ticket.category) },
          { label: "Source", value: formatLabel(ticket.source) },
          { label: "Order/reference", value: ticket.order_reference },
          { label: "AI summary", value: ticket.ai_summary },
        ]}
        footerText="Reply from the admin ticket thread when ready."
        heading="Support ticket admin alert"
        highlightLines={[
          "Confirm the customer context and order reference.",
          "Reply from the admin ticket thread when ready.",
        ]}
        highlightTitle="Admin triage checklist"
        preheader={subject}
        supportInboxEmail={supportInboxEmail}
        title="Action needed"
      />,
    ),
  );

  return {
    html,
    subject,
    text,
  };
};

export const renderSupportTicketCustomerReplyEmail = async ({
  message,
  supportInboxEmail,
  ticket,
}: SupportTicketReplyEmailInput): Promise<RenderedEmail> => {
  const subject = `Support update ${ticket.ticket_number} - ${ticket.subject}`;
  const text = [
    `Hi ${ticket.customer_name},`,
    "",
    message.body,
    "",
    `Ticket: ${ticket.ticket_number}`,
    "Reply to this email if you need anything else.",
  ].join("\n");
  const html = await pretty(
    await render(
      <SupportTicketEmail
        bodyLines={[`Hi ${ticket.customer_name},`, message.body]}
        details={getTicketDetails(ticket)}
        footerText="Reply to this email if you need anything else."
        heading={`Ticket ${ticket.ticket_number}`}
        preheader={subject}
        supportInboxEmail={supportInboxEmail}
        title="Support update"
      />,
    ),
  );

  return {
    html,
    subject,
    text,
  };
};
