import { MedusaService } from "@medusajs/framework/utils";

import {
  buildDefaultSenderProfiles,
  EmailSenderProfile as ResolvedEmailSenderProfile,
  EmailSenderProfileInput,
  EmailSenderProfileKey,
  isEmailSenderProfileKey,
  validateSenderProfile,
} from "../../lib/email-settings/sender-profiles";
import { EmailSenderProfile } from "./models/email-sender-profile";

type Env = Partial<Record<string, string | undefined>>;

class EmailSettingsModuleService extends MedusaService({
  EmailSenderProfile,
}) {
  async listResolvedSenderProfiles(
    env: Env = process.env,
  ): Promise<ResolvedEmailSenderProfile[]> {
    const defaults = buildDefaultSenderProfiles(env);
    const persisted = await this.listEmailSenderProfiles({});
    const persistedByKey = new Map(
      persisted.map((profile) => [profile.key, profile]),
    );

    return defaults.map((defaultProfile) => {
      const persistedProfile = persistedByKey.get(defaultProfile.key);

      return {
        ...defaultProfile,
        ...(persistedProfile
          ? {
              from: persistedProfile.from,
              reply_to: persistedProfile.reply_to,
            }
          : {}),
      };
    });
  }

  async getResolvedSenderProfile(
    key: EmailSenderProfileKey,
    env: Env = process.env,
  ): Promise<ResolvedEmailSenderProfile> {
    if (!isEmailSenderProfileKey(key)) {
      throw new Error(`Unsupported email sender profile: ${key}`);
    }

    const profiles = await this.listResolvedSenderProfiles(env);
    return profiles.find((profile) => profile.key === key)!;
  }

  async upsertSenderProfile(
    key: EmailSenderProfileKey,
    input: EmailSenderProfileInput,
    env: Env = process.env,
  ): Promise<ResolvedEmailSenderProfile> {
    if (!isEmailSenderProfileKey(key)) {
      throw new Error(`Unsupported email sender profile: ${key}`);
    }

    const validatedInput = validateSenderProfile(input, env);
    const defaultProfile = buildDefaultSenderProfiles(env).find(
      (profile) => profile.key === key,
    )!;
    const [existing] = await this.listEmailSenderProfiles({ key });

    if (existing) {
      await this.updateEmailSenderProfiles({
        id: existing.id,
        ...validatedInput,
      });
    } else {
      await this.createEmailSenderProfiles({
        key,
        label: defaultProfile.label,
        description: defaultProfile.description,
        ...validatedInput,
      });
    }

    return await this.getResolvedSenderProfile(key, env);
  }
}

export default EmailSettingsModuleService;
