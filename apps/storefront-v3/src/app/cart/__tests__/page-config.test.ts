import { readFileSync } from "node:fs"
import path from "node:path"

describe("cart route config", () => {
  it("forces request-time rendering for customer cart state", () => {
    const source = readFileSync(path.resolve(__dirname, "../page.tsx"), "utf8")

    expect(source).toContain('export const dynamic = "force-dynamic"')
  })
})
