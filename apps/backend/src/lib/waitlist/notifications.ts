import type { MedusaContainer } from "@medusajs/framework/types"

import { renderWaitlistBackInStockEmail } from "../../emails/renderers/waitlist-back-in-stock"
import { resolveSenderProfileFromContainer } from "../email-settings/sender-profiles"
import { createWaitlistManageToken } from "./tokens"
import type { WaitlistAdminEntry } from "./admin"

type SendWaitlistNotificationInput = {
  container: MedusaContainer
  entry: WaitlistAdminEntry
  notificationCount: number
  testEmail?: string
}

const trimTrailingSlash = (value: string): string => value.replace(/\/$/, "")

const getStorefrontUrl = (): string =>
  trimTrailingSlash(process.env.STOREFRONT_URL || "http://localhost:3001")

const getWaitlistSecret = (): string =>
  process.env.WAITLIST_LINK_SECRET ||
  process.env.JWT_SECRET ||
  process.env.COOKIE_SECRET ||
  "waitlist-dev-secret"

export const buildWaitlistProductUrl = (entry: WaitlistAdminEntry): string =>
  `${getStorefrontUrl()}/products/${entry.product_handle}`

export const buildWaitlistManageUrl = (entry: WaitlistAdminEntry): string => {
  const token = createWaitlistManageToken({
    email: entry.customer_email,
    secret: getWaitlistSecret(),
    waitlistId: entry.id,
  })

  return `${getStorefrontUrl()}/waitlist/manage?token=${encodeURIComponent(token)}`
}

export const sendWaitlistBackInStockNotification = async ({
  container,
  entry,
  notificationCount,
  testEmail,
}: SendWaitlistNotificationInput) => {
  const notificationModule = container.resolve("notification")
  const senderProfile = await resolveSenderProfileFromContainer(
    container,
    "stock"
  )
  const content = await renderWaitlistBackInStockEmail({
    manageUrl: buildWaitlistManageUrl(entry),
    productTitle: entry.product_title,
    productUrl: buildWaitlistProductUrl(entry),
    variantTitle: entry.variant_title,
  })
  const to = testEmail || entry.customer_email

  return await notificationModule.createNotifications({
    to,
    channel: "email",
    template: "waitlist-back-in-stock",
    from: senderProfile.from,
    provider_data: {
      reply_to: senderProfile.reply_to,
    },
    idempotency_key: testEmail
      ? `waitlist-back-in-stock/test/${entry.id}/${to}`
      : `waitlist-back-in-stock/${entry.id}/${notificationCount}`,
    content,
    data: {
      waitlist: entry,
      email_metadata: {
        entity_id: entry.id,
        event: "waitlist.back_in_stock",
      },
    },
  })
}
