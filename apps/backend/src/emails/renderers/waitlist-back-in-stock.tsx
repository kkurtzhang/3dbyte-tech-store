import { pretty, render } from "@react-email/render"

import WaitlistBackInStockEmail from "../templates/waitlist-back-in-stock"
import type { RenderedEmail } from "../types"

type RenderWaitlistEmailInput = {
  manageUrl: string
  productTitle: string
  productUrl: string
  storeName?: string | null
  variantTitle?: string | null
}

export const renderWaitlistBackInStockEmail = async ({
  manageUrl,
  productTitle,
  productUrl,
  storeName,
  variantTitle,
}: RenderWaitlistEmailInput): Promise<RenderedEmail> => {
  const resolvedStoreName = storeName || "3D Byte Tech"
  const productLabel = `${productTitle}${variantTitle ? ` (${variantTitle})` : ""}`
  const html = await pretty(
    await render(
      <WaitlistBackInStockEmail
        manageUrl={manageUrl}
        productTitle={productTitle}
        productUrl={productUrl}
        storeName={resolvedStoreName}
        variantTitle={variantTitle}
      />,
    ),
  )

  return {
    html,
    subject: `${productLabel} is back in stock`,
    text: [
      `${productLabel} is back in stock at ${resolvedStoreName}.`,
      "",
      `View product: ${productUrl}`,
      `Manage or unsubscribe: ${manageUrl}`,
    ].join("\n"),
  }
}
