import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";

import {
  EMAIL_SENDER_ALLOWED_DOMAIN,
  EMAIL_SETTINGS_MODULE,
  resolveEmailRuntimeEnvironment,
} from "../../../lib/email-settings/sender-profiles";

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const emailSettingsModule = req.scope.resolve<{
    listResolvedSenderProfiles: (env?: NodeJS.ProcessEnv) => Promise<unknown>;
  }>(EMAIL_SETTINGS_MODULE);

  const profiles = await emailSettingsModule.listResolvedSenderProfiles(
    process.env,
  );

  return res.json({
    environment: resolveEmailRuntimeEnvironment(process.env),
    allowed_domain: EMAIL_SENDER_ALLOWED_DOMAIN,
    resend_configured: Boolean(
      process.env.RESEND_API_KEY?.trim() && process.env.RESEND_FROM_EMAIL?.trim(),
    ),
    profiles,
  });
};
