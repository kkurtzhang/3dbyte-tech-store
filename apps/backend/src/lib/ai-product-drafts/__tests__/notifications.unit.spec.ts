import { sendAiProductDraftAdminNotification } from "../notifications"

describe("sendAiProductDraftAdminNotification", () => {
  it("creates a native Admin feed notification for review-ready drafts", async () => {
    const createNotifications = jest.fn().mockResolvedValue([{ id: "noti_1" }])
    const container = {
      resolve: jest.fn((key: string) => {
        if (key === "notification") {
          return { createNotifications }
        }
        throw new Error(`Unexpected module ${key}`)
      }),
    }

    await sendAiProductDraftAdminNotification(container as never, {
      kind: "needs_review",
      draft_id: "aipd_123",
      product_handle: "example-petg",
      warnings_count: 2,
    })

    expect(createNotifications).toHaveBeenCalledWith({
      to: "",
      channel: "feed",
      template: "admin-ui",
      data: expect.objectContaining({
        title: "AI product draft ready",
        draft_id: "aipd_123",
        route: "/ai-product-drafts/aipd_123",
      }),
    })
  })

  it("does not fail draft handling when the Admin feed provider is unavailable", async () => {
    const createNotifications = jest
      .fn()
      .mockRejectedValue(
        new Error(
          "Could not find a notification provider for channel: feed for notification id noti_1"
        )
      )
    const logger = {
      warn: jest.fn(),
    }
    const container = {
      resolve: jest.fn((key: string) => {
        if (key === "notification") {
          return { createNotifications }
        }
        if (key === "logger") {
          return logger
        }
        throw new Error(`Unexpected module ${key}`)
      }),
    }

    await expect(
      sendAiProductDraftAdminNotification(container as never, {
        kind: "validation_failed",
        draft_id: "aipd_123",
        validation_error_count: 1,
      })
    ).resolves.toBeUndefined()

    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining("AI product draft Admin notification failed")
    )
  })
})
