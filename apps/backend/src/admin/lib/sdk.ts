import Medusa from "@medusajs/js-sdk";

import { getAdminSdkAuthConfig } from "./admin-sdk-auth";

export const sdk = new Medusa({
  baseUrl: import.meta.env.VITE_BACKEND_URL || "/",
  debug: import.meta.env.DEV,
  auth: getAdminSdkAuthConfig(),
});
