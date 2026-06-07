import { render } from "@react-email/render";

import { AccountSecurityEmail } from "../templates/account-security";

export async function renderAccountSecurityEmail(input: {
  message: string;
  subject: string;
}) {
  const component = <AccountSecurityEmail {...input} />;

  return {
    subject: input.subject,
    html: await render(component),
    text: await render(component, { plainText: true }),
  };
}
