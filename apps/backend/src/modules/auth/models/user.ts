import { model } from "@medusajs/framework/utils";

/**
 * Represents an auth user account (renamed to avoid conflict with Medusa User)
 */
export const AuthUser = model.define("auth_user", {
  id: model.id({ prefix: "auth_user" }).primaryKey(),
  email: model.text().unique(),
  first_name: model.text().nullable(),
  last_name: model.text().nullable(),
  google_id: model.text().unique().nullable(),
  avatar_url: model.text().nullable(),
  metadata: model.json().nullable(),
});
