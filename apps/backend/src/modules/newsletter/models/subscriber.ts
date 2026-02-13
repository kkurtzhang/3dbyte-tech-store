import { model } from "@medusajs/framework/utils"

const Subscriber = model.define("newsletter_subscriber", {
  id: model.id().primaryKey(),
  email: model.text(),
  first_name: model.text().nullable(),
  last_name: model.text().nullable(),
  status: model.text().default("active"),
  subscribed_at: model.dateTime(),
  unsubscribed_at: model.dateTime().nullable(),
})

export default Subscriber
