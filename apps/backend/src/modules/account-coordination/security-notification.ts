import type { MedusaContainer } from "@medusajs/framework/types";

import { renderAccountSecurityEmail } from "../../emails/renderers/account-security";
import { resolveSenderProfileFromContainer } from "../../lib/email-settings/sender-profiles";
import { normalizeCustomerEmail } from "./security";

export const sendAccountSecurityNotification = async ({
  container,
  email,
  event,
  subject,
  message,
}: {
  container: MedusaContainer;
  email: string;
  event: string;
  subject: string;
  message: string;
}): Promise<void> => {
  const notificationModule = container.resolve<{
    createNotifications: (input: Record<string, unknown>) => Promise<unknown>;
  }>("notification");
  const senderProfile = await resolveSenderProfileFromContainer(
    container,
    "default",
  );
  const content = await renderAccountSecurityEmail({ message, subject });

  await notificationModule.createNotifications({
    to: normalizeCustomerEmail(email),
    channel: "email",
    template: "account-security",
    from: senderProfile.from,
    provider_data: { reply_to: senderProfile.reply_to },
    idempotency_key: `${event}/${Date.now()}`,
    content,
    data: {
      email_metadata: { event },
    },
  });
};
