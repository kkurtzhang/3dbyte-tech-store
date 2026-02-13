import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import NewsletterModuleService from "../../../../modules/newsletter/service"
import { NEWSLETTER_MODULE } from "../../../../modules/newsletter"

type SubscribeRequest = {
  email: string
  firstName?: string
  lastName?: string
}

const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
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
      success: false,
      message: "Email is required",
    })
    return
  }

  // Validate email format
  if (!isValidEmail(email)) {
    res.status(400).json({
      success: false,
      message: "Invalid email format",
    })
    return
  }

  try {
    const result = await newsletterModuleService.subscribe(
      email,
      firstName,
      lastName
    )

    // subscribe can return a single object or array (from create/update)
    const subscriber = Array.isArray(result) ? result[0] : result

    if (!subscriber) {
      res.status(400).json({
        success: false,
        message: "Failed to subscribe",
      })
      return
    }

    res.status(200).json({
      success: true,
      message: "Successfully subscribed to newsletter",
      subscriber: {
        id: subscriber.id,
        email: subscriber.email,
        status: subscriber.status,
      },
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to subscribe to newsletter",
      error: error instanceof Error ? error.message : "Unknown error",
    })
  }
}
