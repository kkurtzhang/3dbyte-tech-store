import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { z } from "@medusajs/framework/zod";

import {
  EMAIL_SETTINGS_MODULE,
  EmailSenderProfileKey,
  isEmailSenderProfileKey,
} from "../../../../../lib/email-settings/sender-profiles";
import { PutAdminEmailSenderProfile } from "../../validators";

type PutAdminEmailSenderProfileType = z.infer<
  typeof PutAdminEmailSenderProfile
>;

export const PUT = async (
  req: MedusaRequest<PutAdminEmailSenderProfileType>,
  res: MedusaResponse,
) => {
  const key = req.params.key;

  if (!isEmailSenderProfileKey(key)) {
    return res.status(404).json({
      message: `Unsupported email sender profile: ${key}`,
    });
  }

  const emailSettingsModule = req.scope.resolve<{
    upsertSenderProfile: (
      profileKey: EmailSenderProfileKey,
      input: PutAdminEmailSenderProfileType,
      env?: NodeJS.ProcessEnv,
    ) => Promise<unknown>;
  }>(EMAIL_SETTINGS_MODULE);
  const input = req.validatedBody || (req.body as PutAdminEmailSenderProfileType);
  const profile = await emailSettingsModule.upsertSenderProfile(
    key,
    input,
    process.env,
  );

  return res.status(200).json({ profile });
};
