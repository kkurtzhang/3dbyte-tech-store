import { z } from "zod";

// The browser owns the transcript. Only text is conversational context; no
// historical tool result, approval, provider metadata or source is evidence.
const partSchema = z
  .object({
    type: z.string().min(1).max(120),
    text: z.string().max(4_000).optional(),
  })
  .passthrough()
  .superRefine((part, ctx) => {
    if (
      JSON.stringify(part).length > 25_000 ||
      (part.type === "text" && !part.text?.trim())
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Invalid message part",
      });
    }
  });

export const assistantMessageSchema = z
  .object({
    role: z.enum(["user", "assistant"]),
    content: z.string().trim().min(1).max(4_000).optional(),
    parts: z.array(partSchema).min(1).max(40).optional(),
  })
  .superRefine((message, ctx) => {
    const textParts =
      message.parts?.filter((part) => part.type === "text") ?? [];
    const partsText = textParts
      .map((part) => part.text ?? "")
      .join("")
      .trim();
    const content = message.content ?? partsText;
    if (
      (message.content !== undefined &&
        textParts.length &&
        message.content !== partsText) ||
      content.length > 4_000 ||
      (message.role === "user" && !content) ||
      (!content && !message.parts?.length)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Invalid or contradictory message text",
      });
    }
    for (const part of message.parts ?? []) {
      const discardable =
        part.type === "step-start" ||
        part.type === "reasoning" ||
        part.type === "source-url" ||
        part.type === "source-document" ||
        part.type === "dynamic-tool" ||
        part.type.startsWith("tool-") ||
        part.type.startsWith("data-");
      if (
        part.type !== "text" &&
        (message.role !== "assistant" || !discardable)
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Unsupported message part",
        });
      }
    }
  })
  .transform((message) => ({
    role: message.role,
    content:
      message.content ??
      (message.parts ?? [])
        .filter((part) => part.type === "text")
        .map((part) => part.text ?? "")
        .join("")
        .trim(),
  }));

export type AssistantMessage = z.infer<typeof assistantMessageSchema>;
export function getAssistantMessageContent(message: AssistantMessage) {
  return message.content;
}
export function toUiMessages(messages: AssistantMessage[]) {
  return messages
    .filter((message) => message.content)
    .map((message) => ({
      role: message.role,
      parts: [{ type: "text" as const, text: message.content }],
    }));
}
