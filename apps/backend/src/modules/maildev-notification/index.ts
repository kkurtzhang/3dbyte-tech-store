import { ModuleProvider, Modules } from "@medusajs/framework/utils";

import MaildevNotificationProviderService from "./service";

export default ModuleProvider(Modules.NOTIFICATION, {
  services: [MaildevNotificationProviderService],
});
