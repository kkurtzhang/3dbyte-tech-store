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
    const redactor = createStreamingEmailRedactor(suppliedEmails)
    let latestTextChunk: Extract<
      TextStreamPart<TOOLS>,
      { type: "text-delta" }
    > | null = null

    return new TransformStream<TextStreamPart<TOOLS>, TextStreamPart<TOOLS>>({
      transform(chunk, controller) {
        if (chunk.type === "text-delta") {
          latestTextChunk = chunk
          const safeText = redactor.push(chunk.text)

          if (safeText) {
            hooks.onText?.(safeText)
            controller.enqueue({ ...chunk, text: safeText })
          }
          return
        }

        controller.enqueue(chunk)
      },
      flush(controller) {
        const safeText = redactor.flush()

        if (safeText && latestTextChunk) {
          hooks.onText?.(safeText)
          controller.enqueue({ ...latestTextChunk, text: safeText })
        }

        hooks.onFlush?.()
      },
    })
  }
}
