import type {
  Logger,
  ProviderSendNotificationDTO,
  ProviderSendNotificationResultsDTO,
} from "@medusajs/framework/types";
import { AbstractNotificationProviderService } from "@medusajs/framework/utils";

import type { ResendNotificationOptions } from "./types";

type InjectedDependencies = {
  logger: Logger;
};

type NotificationContent = {
  html?: string;
  subject?: string;
  text?: string;
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

const getIdempotencyKey = (data: unknown): string | undefined => {
  const metadata = readRecordValue(data, "email_metadata");
  const key = readRecordValue(metadata, "idempotency_key");

  return typeof key === "string" && key.trim()
    ? key.trim().slice(0, 256)
    : undefined;
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
  private readonly apiUrl: string;
  private readonly from: string;
  private readonly logger: Logger;

  constructor(
    { logger }: InjectedDependencies,
    options: ResendNotificationOptions,
  ) {
    super();

    this.apiKey = options.apiKey;
    this.apiUrl = options.apiUrl.replace(/\/+$/, "");
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
    const idempotencyKey = getIdempotencyKey(notification.data);

    const response = await fetch(`${this.apiUrl}/emails`, {
      body: JSON.stringify({
        from: this.from,
        html,
        subject,
        text,
        to: notification.to,
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

    this.logger.debug(
      `Resend notification sent for ${notification.template} to ${notification.to}`,
    );

    return {
      id: typeof payload.id === "string" ? payload.id : "",
    };
  }
}

export default ResendNotificationProviderService;
