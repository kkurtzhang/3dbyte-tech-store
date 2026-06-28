export type AdminFeedNotificationProviderConfig = {
  resolve: "@medusajs/medusa/notification-local"
  id: "admin-feed"
  options: {
    name: "Admin feed notifications"
    channels: ["feed"]
  }
}

export const getAdminFeedNotificationProvider =
  (): AdminFeedNotificationProviderConfig => ({
    resolve: "@medusajs/medusa/notification-local",
    id: "admin-feed",
    options: {
      name: "Admin feed notifications",
      channels: ["feed"],
    },
  })
