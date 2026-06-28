import { getAdminFeedNotificationProvider } from "../config"

describe("getAdminFeedNotificationProvider", () => {
  it("registers Medusa's local provider for Admin feed notifications", () => {
    expect(getAdminFeedNotificationProvider()).toEqual({
      resolve: "@medusajs/medusa/notification-local",
      id: "admin-feed",
      options: {
        name: "Admin feed notifications",
        channels: ["feed"],
      },
    })
  })
})
