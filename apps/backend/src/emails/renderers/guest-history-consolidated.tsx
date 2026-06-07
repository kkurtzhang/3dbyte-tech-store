import { render } from "@react-email/render";

import { GuestHistoryConsolidatedEmail } from "../templates/guest-history-consolidated";

export async function renderGuestHistoryConsolidatedEmail(input: {
  customerEmail: string;
  transferredOrderCount: number;
}) {
  const component = <GuestHistoryConsolidatedEmail {...input} />;

  return {
    subject: "Your 3D Byte Tech account is ready",
    html: await render(component),
    text: await render(component, { plainText: true }),
  };
}
