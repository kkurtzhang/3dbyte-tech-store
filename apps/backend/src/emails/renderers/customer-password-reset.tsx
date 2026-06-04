import { pretty, render } from "@react-email/render";

import CustomerPasswordResetEmail from "../templates/customer-password-reset";
import type { RenderedEmail } from "../types";

type RenderCustomerPasswordResetEmailInput = {
  customerEmail: string;
  resetPasswordUrl: string;
  storeName?: string;
};

export const renderCustomerPasswordResetEmail = async ({
  customerEmail,
  resetPasswordUrl,
  storeName = "3D Byte Tech",
}: RenderCustomerPasswordResetEmailInput): Promise<RenderedEmail> => {
  const subject = `Reset your ${storeName} password`;
  const text = [
    `Reset your ${storeName} account password.`,
    "",
    `Email: ${customerEmail}`,
    `Reset password: ${resetPasswordUrl}`,
    "",
    "If you did not request this reset, you can ignore this email.",
  ].join("\n");
  const html = await pretty(
    await render(
      <CustomerPasswordResetEmail
        customerEmail={customerEmail}
        resetPasswordUrl={resetPasswordUrl}
        storeName={storeName}
      />,
    ),
  );

  return {
    html,
    subject,
    text,
  };
};
