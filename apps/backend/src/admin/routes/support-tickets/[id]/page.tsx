import { defineRouteConfig } from "@medusajs/admin-sdk"
import { ChatBubbleLeftRight } from "@medusajs/icons"
import {
  Badge,
  Button,
  Heading,
  Select,
  Text,
  Textarea,
  toast,
} from "@medusajs/ui"
import { FormEvent, useEffect, useState } from "react"
import { Link, useParams } from "react-router-dom"

import { Container } from "../../../components/container"
import { Header } from "../../../components/header"
import {
  useCreateSupportTicketMessage,
  useSupportTicket,
  useUpdateSupportTicketStatus,
} from "../../../hooks/support-tickets"
import {
  formatSupportTicketDate,
  getSupportTicketStatusBadgeColor,
  labelizeSupportTicketValue,
} from "../../../lib/support-tickets"

const statusOptions = [
  "new",
  "open",
  "waiting_customer",
  "waiting_internal",
  "resolved",
  "closed",
  "spam",
]

const SupportTicketDetailPage = () => {
  const { id = "" } = useParams()
  const { ticket, messages, events, isLoading } = useSupportTicket(id)
  const [status, setStatus] = useState("new")
  const [body, setBody] = useState("")
  const [visibility, setVisibility] = useState<"customer" | "internal">(
    "customer",
  )
  const { mutateAsync: updateStatus, isPending: isUpdatingStatus } =
    useUpdateSupportTicketStatus(id)
  const { mutateAsync: createMessage, isPending: isCreatingMessage } =
    useCreateSupportTicketMessage(id)

  useEffect(() => {
    if (ticket?.status) {
      setStatus(ticket.status)
    }
  }, [ticket?.status])

  const handleMessageSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    await createMessage({ body, visibility })
    setBody("")
    toast.success("", {
      description:
        visibility === "internal"
          ? "Internal note added."
          : "Customer reply sent.",
    })
  }

  if (isLoading) {
    return (
      <Container>
        <Header title="Support Ticket" subtitle="Loading ticket details..." />
      </Container>
    )
  }

  if (!ticket) {
    return (
      <Container>
        <Header
          title="Support Ticket"
          subtitle="The requested support ticket could not be found."
          actions={[
            {
              type: "custom",
              children: (
                <Button asChild size="small" variant="secondary">
                  <Link to="/support-tickets">Back to tickets</Link>
                </Button>
              ),
            },
          ]}
        />
      </Container>
    )
  }

  return (
    <div className="flex flex-col gap-y-3">
      <Container>
        <Header
          title={ticket.ticket_number}
          subtitle={ticket.subject}
          actions={[
            {
              type: "custom",
              children: (
                <Button asChild size="small" variant="secondary">
                  <Link to="/support-tickets">Back</Link>
                </Button>
              ),
            },
          ]}
        />
        <div className="grid gap-4 px-6 py-4 md:grid-cols-4">
          <div>
            <Text size="small" className="text-ui-fg-subtle">
              Status
            </Text>
            <Badge
              color={getSupportTicketStatusBadgeColor(ticket.status)}
              size="xsmall"
            >
              {labelizeSupportTicketValue(ticket.status)}
            </Badge>
          </div>
          <div>
            <Text size="small" className="text-ui-fg-subtle">
              Source
            </Text>
            <Text>{labelizeSupportTicketValue(ticket.source)}</Text>
          </div>
          <div>
            <Text size="small" className="text-ui-fg-subtle">
              Category
            </Text>
            <Text>{labelizeSupportTicketValue(ticket.category)}</Text>
          </div>
          <div>
            <Text size="small" className="text-ui-fg-subtle">
              Created
            </Text>
            <Text>{formatSupportTicketDate(ticket.created_at)}</Text>
          </div>
        </div>
        <div className="grid gap-4 px-6 py-4 md:grid-cols-2">
          <div>
            <Text size="small" className="text-ui-fg-subtle">
              Customer
            </Text>
            <Text>{ticket.customer_name}</Text>
            <Text className="text-ui-fg-subtle" size="small">
              {ticket.customer_email}
            </Text>
          </div>
          <div>
            <Text size="small" className="text-ui-fg-subtle">
              Context
            </Text>
            <Text size="small">
              Order {ticket.order_reference || "-"} · Product{" "}
              {ticket.product_handle || "-"}
            </Text>
          </div>
        </div>
        {ticket.ai_summary && (
          <div className="px-6 py-4">
            <Text size="small" className="text-ui-fg-subtle">
              AI Summary
            </Text>
            <Text>{ticket.ai_summary}</Text>
          </div>
        )}
      </Container>

      <Container>
        <Header title="Workflow" subtitle="Update the ticket status or reply." />
        <div className="grid gap-4 px-6 py-4 md:grid-cols-[240px_auto]">
          <Select value={status} onValueChange={setStatus}>
            <Select.Trigger>
              <Select.Value placeholder="Status" />
            </Select.Trigger>
            <Select.Content>
              {statusOptions.map((value) => (
                <Select.Item key={value} value={value}>
                  {labelizeSupportTicketValue(value)}
                </Select.Item>
              ))}
            </Select.Content>
          </Select>
          <Button
            className="w-fit"
            disabled={status === ticket.status}
            isLoading={isUpdatingStatus}
            size="small"
            variant="secondary"
            onClick={async () => {
              await updateStatus({ status })
              toast.success("", { description: "Support ticket updated." })
            }}
          >
            Update status
          </Button>
        </div>
        <form className="flex flex-col gap-3 px-6 py-4" onSubmit={handleMessageSubmit}>
          <div className="flex gap-2">
            <Button
              size="small"
              type="button"
              variant={visibility === "customer" ? "primary" : "secondary"}
              onClick={() => setVisibility("customer")}
            >
              Customer reply
            </Button>
            <Button
              size="small"
              type="button"
              variant={visibility === "internal" ? "primary" : "secondary"}
              onClick={() => setVisibility("internal")}
            >
              Internal note
            </Button>
          </div>
          <Textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder={
              visibility === "internal"
                ? "Add a private note for the support team"
                : "Write a reply to the customer"
            }
            rows={5}
          />
          <Button
            className="w-fit"
            disabled={!body.trim()}
            isLoading={isCreatingMessage}
            size="small"
            type="submit"
          >
            {visibility === "internal" ? "Add note" : "Send reply"}
          </Button>
        </form>
      </Container>

      <Container>
        <Header title="Messages" subtitle="Conversation history and notes." />
        <div className="flex flex-col gap-3 px-6 py-4">
          {messages.length === 0 ? (
            <Text className="text-ui-fg-subtle">No messages yet.</Text>
          ) : (
            messages.map((message) => (
              <div
                className="rounded-md border border-ui-border-base p-4"
                key={message.id}
              >
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div>
                    <Text weight="plus">
                      {labelizeSupportTicketValue(message.author_type)}
                    </Text>
                    <Text className="text-ui-fg-subtle" size="small">
                      {message.author_name || message.author_email || "-"}
                    </Text>
                  </div>
                  <Badge
                    color={message.visibility === "internal" ? "purple" : "blue"}
                    size="xsmall"
                  >
                    {labelizeSupportTicketValue(message.visibility)}
                  </Badge>
                </div>
                <Text className="whitespace-pre-wrap">{message.body}</Text>
                <Text className="mt-2 text-ui-fg-subtle" size="small">
                  {formatSupportTicketDate(message.created_at)}
                </Text>
              </div>
            ))
          )}
        </div>
      </Container>

      <Container>
        <Header title="Events" subtitle="Audit trail for this ticket." />
        <div className="flex flex-col gap-2 px-6 py-4">
          {events.length === 0 ? (
            <Text className="text-ui-fg-subtle">No events yet.</Text>
          ) : (
            events.map((event) => (
              <div className="flex items-center justify-between gap-3" key={event.id}>
                <Text>{labelizeSupportTicketValue(event.type)}</Text>
                <Text className="text-ui-fg-subtle" size="small">
                  {formatSupportTicketDate(event.created_at)}
                </Text>
              </div>
            ))
          )}
        </div>
      </Container>
    </div>
  )
}

export const config = defineRouteConfig({
  label: "Support Ticket",
  icon: ChatBubbleLeftRight,
})

export default SupportTicketDetailPage
