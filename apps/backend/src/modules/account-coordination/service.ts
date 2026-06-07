import { MedusaService } from "@medusajs/framework/utils";

import { AccountSecurityEvent } from "./models/account-security-event";
import { GuestConsolidationRun } from "./models/guest-consolidation-run";
import { IdentityConflict } from "./models/identity-conflict";
import { OAuthLinkIntent } from "./models/oauth-link-intent";

class AccountCoordinationModuleService extends MedusaService({
  OAuthLinkIntent,
  AccountSecurityEvent,
  GuestConsolidationRun,
  IdentityConflict,
}) {}

export default AccountCoordinationModuleService;
