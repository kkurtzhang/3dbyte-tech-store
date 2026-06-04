import { pretty, render } from "@react-email/render";

import CustomerEmailVerificationEmail from "../templates/customer-email-verification";
import type { RenderedEmail } from "../types";

type RenderCustomerEmailVerificationEmailInput = {
  customerEmail: string;
  storeName?: string;
  verificationUrl: string;
};

export const renderCustomerEmailVerificationEmail = async ({
  customerEmail,
  storeName = "3D Byte Tech",
  verificationUrl,
}: RenderCustomerEmailVerificationEmailInput): Promise<RenderedEmail> => {
  const subject = `Confirm your ${storeName} account`;
  const text = [
    `Confirm your ${storeName} account email.`,
    "",
    `Email: ${customerEmail}`,
    `Confirm email: ${verificationUrl}`,
    "",
    "If you did not create this account, you can ignore this email.",
  ].join("\n");
  const html = await pretty(
    await render(
      <CustomerEmailVerificationEmail
        customerEmail={customerEmail}
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
