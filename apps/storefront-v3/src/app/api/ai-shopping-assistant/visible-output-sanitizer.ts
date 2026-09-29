import type { TextStreamPart, ToolSet } from "ai"

const EMAIL_PATTERN_SOURCE =
  "\\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}\\b"
const EMAIL_TOKEN_CHARACTER_PATTERN = /^[A-Z0-9._%+@-]$/i

function createEmailPattern() {
  return new RegExp(EMAIL_PATTERN_SOURCE, "gi")
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

export function collectEmailAddresses(texts: readonly string[]) {
  const seen = new Set<string>()

  return texts.flatMap((text) =>
    Array.from(text.matchAll(createEmailPattern()), ([email]) => email).filter(
      (email) => {
        const normalized = email.toLowerCase()

        if (seen.has(normalized)) {
          return false
        }

        seen.add(normalized)
        return true
      },
    ),
  )
}

export function maskCompleteEmailAddresses(
  text: string,
  suppliedEmails: readonly string[] = [],
) {
  const suppliedEmailPattern = suppliedEmails.length
    ? new RegExp(
        suppliedEmails
          .map((email) => escapeRegExp(email))
          .sort((left, right) => right.length - left.length)
          .join("|"),
        "gi",
      )
    : null
  const suppliedMasked = suppliedEmailPattern
    ? text.replace(suppliedEmailPattern, "[email]")
    : text

  return suppliedMasked.replace(createEmailPattern(), "[email]")
}

export function createStreamingEmailRedactor(
  suppliedEmails: readonly string[],
) {
  let bufferedToken = ""

  return {
    push(text: string) {
      let safeText = ""

      for (const character of text) {
        if (EMAIL_TOKEN_CHARACTER_PATTERN.test(character)) {
          bufferedToken += character
          continue
        }

        safeText +=
          maskCompleteEmailAddresses(bufferedToken, suppliedEmails) + character
        bufferedToken = ""
      }

      return safeText
    },
    flush() {
      const safeText = maskCompleteEmailAddresses(
        bufferedToken,
        suppliedEmails,
      )
      bufferedToken = ""
      return safeText
    },
  }
}

export function createAssistantVisibleTextTransform<TOOLS extends ToolSet>(
  suppliedEmails: readonly string[],
  hooks: {
    onFlush?: () => void
    onText?: (text: string) => void
  } = {},
) {
  return () => {
    type TextDelta = Extract<TextStreamPart<TOOLS>, { type: "text-delta" }>
    const textParts = new Map<
      string,
      {
        redactor: ReturnType<typeof createStreamingEmailRedactor>
        latestChunk: TextDelta
      }
    >()

    const flushTextPart = (
      id: string,
      controller: TransformStreamDefaultController<TextStreamPart<TOOLS>>,
    ) => {
      const part = textParts.get(id)
      if (!part) return

      const safeText = part.redactor.flush()
      if (safeText) {
        hooks.onText?.(safeText)
        controller.enqueue({ ...part.latestChunk, text: safeText })
      }
      textParts.delete(id)
    }

    return new TransformStream<TextStreamPart<TOOLS>, TextStreamPart<TOOLS>>({
      transform(chunk, controller) {
        if (chunk.type === "text-delta") {
          const part = textParts.get(chunk.id) ?? {
            redactor: createStreamingEmailRedactor(suppliedEmails),
            latestChunk: chunk,
          }
          textParts.set(chunk.id, { ...part, latestChunk: chunk })
          const safeText = part.redactor.push(chunk.text)

          if (safeText) {
            hooks.onText?.(safeText)
            controller.enqueue({ ...chunk, text: safeText })
          }
          return
        }

        if (chunk.type === "text-end") {
          // The UI stream closes this part at text-end; later deltas are invalid.
          flushTextPart(chunk.id, controller)
        }

        controller.enqueue(chunk)
      },
      flush(controller) {
        textParts.forEach((_part, id) => flushTextPart(id, controller))
        hooks.onFlush?.()
      },
    })
  }
}
