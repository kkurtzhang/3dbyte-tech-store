import { TransformStream } from "node:stream/web"

import type { TextStreamPart, ToolSet } from "ai"

import {
  collectEmailAddresses,
  createAssistantVisibleTextTransform,
  createStreamingEmailRedactor,
} from "../visible-output-sanitizer"

describe("visible assistant output sanitization", () => {
  const suppliedEmail = "Ava.Customer+PETG@Example.com"

  it("collects unique email addresses supplied in user messages", () => {
    expect(
      collectEmailAddresses([
        `Contact ${suppliedEmail}, please.`,
        "A second address is helper@example.org.",
        `The same address in different casing is ${suppliedEmail.toLowerCase()}.`,
      ]),
    ).toEqual([suppliedEmail, "helper@example.org"])
  })

  it.each(
    Array.from({ length: suppliedEmail.length - 1 }, (_, index) => index + 1),
  )("redacts a supplied email split at character %i", (splitAt) => {
    const redactor = createStreamingEmailRedactor([suppliedEmail])
    const output = [
      redactor.push(`Email: ${suppliedEmail.slice(0, splitAt)}`),
      redactor.push(`${suppliedEmail.slice(splitAt)}.`),
      redactor.flush(),
    ].join("")

    expect(output).toBe("Email: [email].")
  })

  it("redacts mixed-case supplied emails and multiple punctuated addresses", () => {
    const redactor = createStreamingEmailRedactor([
      suppliedEmail,
      "helper@example.org",
    ])
    const output = [
      redactor.push("Use AVA.CUSTOMER+PETG@example.COM, then "),
      redactor.push("(helper@EXAMPLE.org)!"),
      redactor.flush(),
    ].join("")

    expect(output).toBe("Use [email], then ([email])!")
  })

  it("masks unknown complete generated email addresses as defense in depth", () => {
    const redactor = createStreamingEmailRedactor([])
    const output = [
      redactor.push("Contact newly.generated"),
      redactor.push("@outside.example for help."),
      redactor.flush(),
    ].join("")

    expect(output).toBe("Contact [email] for help.")
  })

  it("flushes buffered safe text without changing it", () => {
    const redactor = createStreamingEmailRedactor([suppliedEmail])
    const output = [
      redactor.push("PETG remains suitable for outdoor brackets"),
      redactor.flush(),
    ].join("")

    expect(output).toBe("PETG remains suitable for outdoor brackets")
  })
})


describe("assistant text stream boundaries", () => {
  beforeAll(() => {
    Object.assign(globalThis, { TransformStream })
  })

  async function transformChunks(chunks: TextStreamPart<ToolSet>[]) {
    const onText = jest.fn()
    const onFlush = jest.fn()
    const stream = createAssistantVisibleTextTransform<ToolSet>([], {
      onText,
      onFlush,
    })()
    const writer = stream.writable.getWriter()
    const reader = stream.readable.getReader()
    const outputPromise = (async () => {
      const output: TextStreamPart<ToolSet>[] = []
      let result = await reader.read()
      while (!result.done) {
        output.push(result.value)
        result = await reader.read()
      }
      return output
    })()
    for (const chunk of chunks) await writer.write(chunk)
    await writer.close()
    return { output: await outputPromise, onText, onFlush }
  }

  it.each(["Hello", "Choose PETG.", "Contact helper@example.org"])(
    "emits the complete sanitized reply before text-end: %s",
    async (text) => {
      const { output, onText, onFlush } = await transformChunks([
        { type: "text-start", id: "0" },
        { type: "text-delta", id: "0", text },
        { type: "text-end", id: "0" },
      ])
      expect(output[0]).toEqual({ type: "text-start", id: "0" })
      expect(output.at(-1)).toEqual({ type: "text-end", id: "0" })
      const visibleText = output
        .filter((chunk) => chunk.type === "text-delta")
        .map((chunk) => chunk.text)
        .join("")
      expect(visibleText).toBe(text.replace("helper@example.org", "[email]"))
      expect(onText.mock.calls.flat().join("")).toBe(visibleText)
      expect(onFlush).toHaveBeenCalledTimes(1)
    },
  )

  it("flushes each tool-loop text part before the next part reuses its id", async () => {
    const chunks: TextStreamPart<ToolSet>[] = [
      { type: "text-start", id: "0" },
      { type: "text-delta", id: "0", text: "Searching" },
      { type: "text-end", id: "0" },
      { type: "text-start", id: "0" },
      { type: "text-delta", id: "0", text: "Found" },
      { type: "text-end", id: "0" },
    ]
    const { output } = await transformChunks(chunks)
    expect(output).toEqual(chunks)
  })

  it("keeps interleaved text parts and split email tokens separate", async () => {
    const { output } = await transformChunks([
      { type: "text-start", id: "a" },
      { type: "text-start", id: "b" },
      { type: "text-delta", id: "a", text: "helper@" },
      { type: "text-delta", id: "b", text: "PETG" },
      { type: "text-delta", id: "a", text: "example.org" },
      { type: "text-end", id: "a" },
      { type: "text-end", id: "b" },
    ])
    expect(output).toEqual([
      { type: "text-start", id: "a" },
      { type: "text-start", id: "b" },
      { type: "text-delta", id: "a", text: "[email]" },
      { type: "text-end", id: "a" },
      { type: "text-delta", id: "b", text: "PETG" },
      { type: "text-end", id: "b" },
    ])
  })
})
