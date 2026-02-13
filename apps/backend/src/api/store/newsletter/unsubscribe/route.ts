import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import NewsletterModuleService from "../../../../modules/newsletter/service"
import { NEWSLETTER_MODULE } from "../../../../modules/newsletter"

type UnsubscribeRequest = {
  email: string
}

export async function POST(
  req: MedusaRequest<UnsubscribeRequest>,
  res: MedusaResponse
): Promise<void> {
  const newsletterModuleService: NewsletterModuleService = req.scope.resolve(
    NEWSLETTER_MODULE
  )

  const { email } = req.body

  if (!email) {
    res.status(400).json({
      message: "Email is required",
    })
    return
  }

  try {
    const subscriber = await newsletterModuleService.unsubscribe(email)

    if (!subscriber) {
      res.status(404).json({
        message: "Subscriber not found",
      })
      return
    }

    res.status(200).json({
      message: "Successfully unsubscribed from newsletter",
      subscriber,
    })
  } catch (error) {
    res.status(500).json({
      message: "Failed to unsubscribe from newsletter",
      error: error instanceof Error ? error.message : "Unknown error",
    })
  }
}
