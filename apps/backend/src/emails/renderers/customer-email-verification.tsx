import { pretty, render } from "@react-email/render";

import CustomerEmailVerificationEmail from "../templates/customer-email-verification";
import type { RenderedEmail } from "../types";

type RenderCustomerEmailVerificationEmailInput = {
  customerEmail: string;
  purpose?: "email_change" | "registration";
  storeName?: string;
  verificationUrl: string;
};

export const renderCustomerEmailVerificationEmail = async ({
  customerEmail,
  purpose = "registration",
  storeName = "3D Byte Tech",
  verificationUrl,
}: RenderCustomerEmailVerificationEmailInput): Promise<RenderedEmail> => {
  const isEmailChange = purpose === "email_change";
  const subject = isEmailChange
    ? `Confirm your new ${storeName} email`
    : `Confirm your ${storeName} account`;
  const text = [
    isEmailChange
      ? `Confirm this new email for your ${storeName} account.`
      : `Confirm your ${storeName} account email.`,
    "",
    `Email: ${customerEmail}`,
    `Confirm email: ${verificationUrl}`,
    "",
    "This verification link expires in 24 hours.",
    "",
    "If you did not create this account, you can ignore this email.",
  ].join("\n");
  const html = await pretty(
    await render(
      <CustomerEmailVerificationEmail
        customerEmail={customerEmail}
        purpose={purpose}
        storeName={storeName}
        verificationUrl={verificationUrl}
      />,
    ),
  );

  return {
    html,
    subject,
    text,
  };
};
