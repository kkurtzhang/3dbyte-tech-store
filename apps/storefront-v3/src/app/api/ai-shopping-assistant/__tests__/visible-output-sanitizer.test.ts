import {
  collectEmailAddresses,
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
