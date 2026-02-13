import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import NewsletterModuleService from "../../../../modules/newsletter/service"
import { NEWSLETTER_MODULE } from "../../../../modules/newsletter"

type SubscribeRequest = {
  email: string
  firstName?: string
  lastName?: string
}

export async function POST(
  req: MedusaRequest<SubscribeRequest>,
  res: MedusaResponse
): Promise<void> {
  const newsletterModuleService: NewsletterModuleService = req.scope.resolve(
    NEWSLETTER_MODULE
  )

  const { email, firstName, lastName } = req.body

  if (!email) {
    res.status(400).json({
      message: "Email is required",
    })
    return
  }

  try {
    const subscriber = await newsletterModuleService.subscribe(
      email,
      firstName,
      lastName
    )

    res.status(200).json({
      message: "Successfully subscribed to newsletter",
      subscriber,
    })
  } catch (error) {
    res.status(500).json({
      message: "Failed to subscribe to newsletter",
      error: error instanceof Error ? error.message : "Unknown error",
    })
  }
}
