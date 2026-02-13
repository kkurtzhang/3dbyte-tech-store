import { MedusaService } from "@medusajs/framework/utils"
import Subscriber from "./models/subscriber"

class NewsletterModuleService extends MedusaService({
  Subscriber,
}) {
  async subscribe(email: string, firstName?: string, lastName?: string) {
    const [subscriber] = await this.listSubscribers({ email })

    if (subscriber) {
      if (subscriber.status === "unsubscribed") {
        return await this.updateSubscribers([{ id: subscriber.id, status: "active", unsubscribed_at: null }])
      }
      return subscriber
    }

    return await this.createSubscribers([{
      email,
      first_name: firstName,
      last_name: lastName,
      status: "active",
      subscribed_at: new Date(),
    }])
  }

  async unsubscribe(email: string) {
    const [subscriber] = await this.listSubscribers({ email })

    if (subscriber) {
      return await this.updateSubscribers([{ id: subscriber.id, status: "unsubscribed", unsubscribed_at: new Date() }])
    }

    return null
  }
}

export default NewsletterModuleService
