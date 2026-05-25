import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { z } from "@medusajs/framework/zod";

import {
  EMAIL_SETTINGS_MODULE,
  EmailSenderProfile,
  EmailSenderProfileKey,
  isEmailSenderProfileKey,
} from "../../../../../../lib/email-settings/sender-profiles";
import { PostAdminEmailSenderProfileTest } from "../../../validators";

type PostAdminEmailSenderProfileTestType = z.infer<
  typeof PostAdminEmailSenderProfileTest
>;

export const POST = async (
  req: MedusaRequest<PostAdminEmailSenderProfileTestType>,
  res: MedusaResponse,
) => {
  const key = req.params.key;

  if (!isEmailSenderProfileKey(key)) {
    return res.status(404).json({
      message: `Unsupported email sender profile: ${key}`,
    });
  }

  if (!process.env.RESEND_API_KEY?.trim()) {
    return res.status(400).json({
      message: "Resend is not configured.",
    });
  }

  const input =
    req.validatedBody || (req.body as PostAdminEmailSenderProfileTestType);
  const emailSettingsModule = req.scope.resolve<{
    getResolvedSenderProfile: (
      profileKey: EmailSenderProfileKey,
      env?: NodeJS.ProcessEnv,
    ) => Promise<EmailSenderProfile>;
  }>(EMAIL_SETTINGS_MODULE);
  const notificationModule = req.scope.resolve<{
    createNotifications: (payload: unknown) => Promise<unknown>;
  }>("notification");
  const profile = await emailSettingsModule.getResolvedSenderProfile(
    key,
    process.env,
  );

  await notificationModule.createNotifications({
    to: input.to,
    channel: "email",
    template: "email-settings-test",
    from: profile.from,
    provider_data: {
      reply_to: profile.reply_to,
    },
    content: {
      subject: `Test email from ${profile.label}`,
      text: `This is a test email from ${profile.from}.`,
      html: `<p>This is a test email from ${profile.from}.</p>`,
    },
    data: {
      email_metadata: {
        event: "email_settings.test",
        entity_id: profile.key,
      },
    },
  });

  return res.status(200).json({ sent: true });
};
