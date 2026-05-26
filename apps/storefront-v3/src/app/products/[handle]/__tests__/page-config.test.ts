import { readFileSync } from "node:fs"
import path from "node:path"

describe("product detail route config", () => {
  it("stays dynamic because pricing reads region cookies", () => {
    const source = readFileSync(path.resolve(__dirname, "../page.tsx"), "utf8")

    expect(source).toContain('export const dynamic = "force-dynamic"')
  })
})
