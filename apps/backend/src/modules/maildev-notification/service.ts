import type {
  Logger,
  ProviderSendNotificationDTO,
  ProviderSendNotificationResultsDTO,
} from "@medusajs/framework/types";
import { AbstractNotificationProviderService } from "@medusajs/framework/utils";
import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";

import type { MaildevNotificationOptions } from "./types";

type InjectedDependencies = {
  logger: Logger;
};

type NotificationContent = {
  html?: string;
  subject?: string;
  text?: string;
};

const escapeHtml = (value: string): string =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const stringifyData = (data: unknown): string => {
  if (data === undefined) {
    return "";
  }

  try {
    return JSON.stringify(data, null, 2);
  } catch {
    return String(data);
  }
};

class MaildevNotificationProviderService extends AbstractNotificationProviderService {
  static identifier = "maildev";

  private readonly from: string;
  private readonly logger: Logger;
  private readonly transporter: Transporter;
  private readonly webUrl?: string;

  constructor(
    { logger }: InjectedDependencies,
    options: MaildevNotificationOptions,
  ) {
    super();

    this.from = options.from;
    this.logger = logger;
    this.webUrl = options.webUrl;
    this.transporter = nodemailer.createTransport({
      host: options.host,
      port: options.port,
      secure: options.secure,
      ...(options.auth ? { auth: options.auth } : {}),
      tls: {
        rejectUnauthorized: options.rejectUnauthorized,
      },
    });
  }

  async send(
    notification: ProviderSendNotificationDTO,
  ): Promise<ProviderSendNotificationResultsDTO> {
    const content = (notification.content || {}) as NotificationContent;
    const fallbackText = stringifyData(notification.data);
    const subject =
      content.subject || `Medusa notification: ${notification.template}`;
    const text =
      content.text ||
      [
        `Template: ${notification.template}`,
        fallbackText ? `Data:\n${fallbackText}` : undefined,
      ]
        .filter(Boolean)
        .join("\n\n");
    const html =
      content.html ||
      `<h1>${escapeHtml(subject)}</h1><pre>${escapeHtml(fallbackText)}</pre>`;

    const result = await this.transporter.sendMail({
      from: this.from,
      html,
      subject,
      text,
      to: notification.to,
    });

    this.logger.debug(
      `MailDev notification sent for ${notification.template} to ${notification.to}` +
        (this.webUrl ? ` (${this.webUrl})` : ""),
    );

    return {
      id: result.messageId,
    };
  }
}

export default MaildevNotificationProviderService;
