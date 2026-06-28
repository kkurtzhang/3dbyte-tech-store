type NotificationContainer = {
  resolve: (key: string) => {
    createNotifications: (input: unknown) => Promise<unknown>
  }
}

type DraftNotificationKind =
  | "needs_review"
  | "validation_failed"
  | "imported"
  | "import_failed"

type DraftNotificationInput = {
  kind: DraftNotificationKind
  draft_id: string
  product_handle?: string | null
  product_id?: string | null
  warnings_count?: number
  validation_error_count?: number
  error?: string
}

const notificationCopy: Record<
  DraftNotificationKind,
  { title: string; description: (input: DraftNotificationInput) => string }
> = {
  needs_review: {
    title: "AI product draft ready",
    description: (input) =>
      `Hermes submitted a draft${input.product_handle ? ` for ${input.product_handle}` : ""}.`,
  },
  validation_failed: {
    title: "AI product draft needs attention",
    description: (input) =>
      `Hermes submitted a packet that failed validation${
        input.validation_error_count
          ? ` with ${input.validation_error_count} issue(s)`
          : ""
      }.`,
  },
  imported: {
    title: "AI product draft imported",
    description: (input) =>
      `Approved AI draft${input.product_handle ? ` for ${input.product_handle}` : ""} was imported.`,
  },
  import_failed: {
    title: "AI product draft import failed",
    description: (input) =>
      input.error || "Approved AI draft import failed. Review the draft summary.",
  },
}

export async function sendAiProductDraftAdminNotification(
  container: NotificationContainer,
  input: DraftNotificationInput
) {
  const copy = notificationCopy[input.kind]
  const notificationModule = container.resolve("notification")

  await notificationModule.createNotifications({
    to: "",
    channel: "feed",
    template: "admin-ui",
    data: {
      title: copy.title,
      description: copy.description(input),
      draft_id: input.draft_id,
      product_id: input.product_id || null,
      product_handle: input.product_handle || null,
      status: input.kind,
      warnings_count: input.warnings_count || 0,
      route: `/ai-product-drafts/${input.draft_id}`,
    },
  })
}
