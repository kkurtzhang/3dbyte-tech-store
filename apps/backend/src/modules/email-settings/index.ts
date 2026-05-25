import { Module } from "@medusajs/framework/utils";

import { EMAIL_SETTINGS_MODULE } from "../../lib/email-settings/sender-profiles";
import EmailSettingsModuleService from "./service";

export { EMAIL_SETTINGS_MODULE };

export default Module(EMAIL_SETTINGS_MODULE, {
  service: EmailSettingsModuleService,
});
