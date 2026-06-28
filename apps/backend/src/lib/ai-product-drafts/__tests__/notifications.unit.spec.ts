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
})
