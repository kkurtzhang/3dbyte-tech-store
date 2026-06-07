import { Module } from "@medusajs/framework/utils";

import AccountCoordinationModuleService from "./service";

export { AccountSecurityEvent } from "./models/account-security-event";
export { GuestConsolidationRun } from "./models/guest-consolidation-run";
export { IdentityConflict } from "./models/identity-conflict";
export { OAuthLinkIntent } from "./models/oauth-link-intent";

export const ACCOUNT_COORDINATION_MODULE = "accountCoordination";

export default Module(ACCOUNT_COORDINATION_MODULE, {
  service: AccountCoordinationModuleService,
});
