type NotificationContainer = {
  resolve: <T = unknown>(key: string) => T
}

type NotificationModule = {
  createNotifications: (input: unknown) => Promise<unknown>
}

type Logger = {
  warn: (message: string) => void
}

type DraftNotificationKind =
  | "needs_review"
  | "needs_resolution"
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
  needs_resolution: {
    title: "AI product draft needs product resolution",
    description: () =>
      "Hermes submitted a draft with a possible catalogue match. Choose create or enrich before review.",
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

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown notification error"
}

function warnNotificationFailure(
  container: NotificationContainer,
  input: DraftNotificationInput,
  error: unknown
) {
  try {
    const logger = container.resolve<Logger>("logger")
    logger.warn(
      `AI product draft Admin notification failed for ${input.draft_id}: ${getErrorMessage(error)}`
    )
  } catch {
    // Logging is best-effort here; the draft record remains the source of truth.
  }
}

export async function sendAiProductDraftAdminNotification(
  container: NotificationContainer,
  input: DraftNotificationInput
) {
  const copy = notificationCopy[input.kind]
  const notificationModule = container.resolve<NotificationModule>("notification")

  try {
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
  } catch (error) {
    warnNotificationFailure(container, input, error)
  }
}
