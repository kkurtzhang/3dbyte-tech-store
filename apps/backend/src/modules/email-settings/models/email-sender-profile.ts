import { model } from "@medusajs/framework/utils";

export const EmailSenderProfile = model.define("email_sender_profile", {
  id: model.id().primaryKey(),
  key: model.text(),
  label: model.text(),
  description: model.text(),
  from: model.text(),
  reply_to: model.text(),
});
