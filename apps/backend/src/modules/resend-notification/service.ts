import type {
  Logger,
  ProviderSendNotificationDTO,
  ProviderSendNotificationResultsDTO,
} from "@medusajs/framework/types";
import { AbstractNotificationProviderService } from "@medusajs/framework/utils";
import { Resend } from "resend";

import type { ResendNotificationOptions } from "./types";

type InjectedDependencies = {
  logger: Logger;
};

type NotificationContent = {
  html?: string;
  subject?: string;
  text?: string;
};

type NotificationWithSenderOverrides = ProviderSendNotificationDTO & {
  from?: unknown;
  provider_data?: unknown;
};

type ResendResponse = {
  error?: unknown;
  id?: unknown;
  message?: unknown;
  name?: unknown;
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

const readRecordValue = (value: unknown, key: string): unknown | undefined => {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  return (value as Record<string, unknown>)[key];
};

const readString = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim()
    ? value.trim().slice(0, 256)
    : undefined;

const getIdempotencyKey = (
  notification: ProviderSendNotificationDTO,
): string | undefined => {
  const directKey = readString(
    (notification as ProviderSendNotificationDTO & { idempotency_key?: string })
      .idempotency_key,
  );

  if (directKey) {
    return directKey;
  }

  const metadata = readRecordValue(notification.data, "email_metadata");
  return readString(readRecordValue(metadata, "idempotency_key"));
};

const getNotificationFrom = (
  notification: ProviderSendNotificationDTO,
): string | undefined => {
  return readString((notification as NotificationWithSenderOverrides).from);
};

const getNotificationReplyTo = (
  notification: ProviderSendNotificationDTO,
): string | undefined => {
  const providerData = (notification as NotificationWithSenderOverrides)
    .provider_data;

  return (
    readString(readRecordValue(providerData, "reply_to")) ||
    readString(readRecordValue(providerData, "replyTo"))
  );
};

const readJson = async (response: Response): Promise<ResendResponse> => {
  try {
    const value = await response.json();

    return value && typeof value === "object" ? (value as ResendResponse) : {};
  } catch {
    return {};
  }
};

const getResponseMessage = (payload: ResendResponse): string => {
  if (typeof payload.message === "string") {
    return payload.message;
  }

  if (typeof payload.error === "string") {
    return payload.error;
  }

  if (typeof payload.name === "string") {
    return payload.name;
  }

  return "Unknown Resend API error";
};

class ResendNotificationProviderService extends AbstractNotificationProviderService {
  static identifier = "resend";

  private readonly apiKey: string;
  private readonly apiUrl?: string;
  private readonly client?: Resend;
  private readonly from: string;
  private readonly logger: Logger;

  constructor(
    { logger }: InjectedDependencies,
    options: ResendNotificationOptions,
  ) {
    super();

    this.apiKey = options.apiKey;
    this.apiUrl = options.apiUrl?.replace(/\/+$/, "");
    this.client = this.apiUrl ? undefined : new Resend(options.apiKey);
    this.from = options.from;
    this.logger = logger;
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
    const idempotencyKey = getIdempotencyKey(notification);
    const from = getNotificationFrom(notification) || this.from;
    const replyTo = getNotificationReplyTo(notification);

    const result = this.apiUrl
      ? await this.sendWithFetch({
          from,
          html,
          idempotencyKey,
          replyTo,
          subject,
          text,
          to: notification.to,
        })
      : await this.sendWithSdk({
          from,
          html,
          idempotencyKey,
          replyTo,
          subject,
          text,
          to: notification.to,
        });

    this.logger.debug(
      `Resend notification sent for ${notification.template} to ${notification.to}`,
    );

    return result;
  }

  private async sendWithFetch({
    from,
    html,
    idempotencyKey,
    replyTo,
    subject,
    text,
    to,
  }: {
    from: string;
    html: string;
    idempotencyKey?: string;
    replyTo?: string;
    subject: string;
    text: string;
    to: string;
  }): Promise<ProviderSendNotificationResultsDTO> {
    const response = await fetch(`${this.apiUrl}/emails`, {
      body: JSON.stringify({
        from,
        html,
        ...(replyTo ? { reply_to: replyTo } : {}),
        subject,
        text,
        to,
      }),
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
        ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
      },
      method: "POST",
    });
    const payload = await readJson(response);

    if (!response.ok) {
      throw new Error(
        `Resend notification failed with status ${response.status}: ${getResponseMessage(payload)}`,
      );
    }

    return {
      id: typeof payload.id === "string" ? payload.id : "",
    };
  }

  private async sendWithSdk({
    from,
    html,
    idempotencyKey,
    replyTo,
    subject,
    text,
    to,
  }: {
    from: string;
    html: string;
    idempotencyKey?: string;
    replyTo?: string;
    subject: string;
    text: string;
    to: string;
  }): Promise<ProviderSendNotificationResultsDTO> {
    const result = await this.client!.emails.send(
      {
        from,
        html,
        ...(replyTo ? { replyTo } : {}),
        subject,
        text,
        to,
      },
      idempotencyKey ? { idempotencyKey } : undefined,
    );

    if (result.error) {
      throw new Error(result.error.message);
    }

    return {
      id: result.data?.id || "",
    };
  }
}

export default ResendNotificationProviderService;
