import { sanitizeCmsHtml } from "../sanitize-cms-html"

describe("sanitizeCmsHtml", () => {
  it("preserves editorial formatting while removing executable markup", () => {
    const sanitized = sanitizeCmsHtml(`
      <h2>Material guide</h2>
      <p onclick="alert(1)">Use <strong>PETG</strong>.</p>
      <script>alert(1)</script>
      <iframe src="https://evil.example"></iframe>
      <svg><script>alert(2)</script></svg>
    `)

    expect(sanitized).toContain("<h2>Material guide</h2>")
    expect(sanitized).toContain("<strong>PETG</strong>")
    expect(sanitized).not.toMatch(/script|iframe|svg|onclick/i)
  })

  it("drops unsafe URLs and hardens links opened in a new tab", () => {
    const sanitized = sanitizeCmsHtml(`
      <a href="javascript:alert(1)">Unsafe</a>
      <a href="https://docs.example.com" target="_blank">Documentation</a>
      <img src="data:text/html;base64,PHNjcmlwdD4=" alt="unsafe" />
    `)

    expect(sanitized).not.toContain("javascript:")
    expect(sanitized).not.toContain("data:text/html")
    expect(sanitized).toContain('rel="noopener noreferrer"')
  })
})
