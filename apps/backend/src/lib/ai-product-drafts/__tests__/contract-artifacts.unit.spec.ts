import { readFileSync } from "fs"
import path from "path"

import { ProductResearchPacketSchema } from "../schemas"

const repoRoot = path.resolve(__dirname, "../../../../../..")

describe("Hermes product draft contract artifacts", () => {
  it("keeps the canonical Hermes packet fixture valid", () => {
    const fixture = JSON.parse(
      readFileSync(
        path.join(
          repoRoot,
          "docs/hermes/fixtures/product-research-packet.v1.example.json"
        ),
        "utf8"
      )
    )

    expect(ProductResearchPacketSchema.parse(fixture).source_agent).toBe(
      "hermes"
    )
  })

  it("publishes a JSON Schema contract for Hermes native skills", () => {
    const schema = JSON.parse(
      readFileSync(
        path.join(repoRoot, "docs/hermes/product-research-packet.v1.schema.json"),
        "utf8"
      )
    )

    expect(schema.$id).toBe("https://3dbyte.tech/schemas/hermes/product-research-packet.v1.json")
    expect(schema.properties.packet_version.const).toBe(1)
  })

  it("publishes the Hermes native skill pack with draft-only guardrails", () => {
    const skillNames = [
      "hermes-product-intake",
      "hermes-controlled-product-research",
      "hermes-evidence-extractor",
      "hermes-packet-builder",
      "hermes-medusa-draft-submitter",
    ]

    for (const skillName of skillNames) {
      const skill = readFileSync(
        path.join(repoRoot, "docs/hermes/skills", skillName, "SKILL.md"),
        "utf8"
      )

      expect(skill).toContain(`# ${skillName}`)
      expect(skill).toContain("Guardrails")
    }

    const submitter = readFileSync(
      path.join(
        repoRoot,
        "docs/hermes/skills/hermes-medusa-draft-submitter/SKILL.md"
      ),
      "utf8"
    )

    expect(submitter).toContain("POST")
    expect(submitter).toContain("/admin/ai-product-drafts")
    expect(submitter).toContain("x-3db-hermes-product-draft-token")
    expect(submitter).toContain("Never call Medusa product update routes")
  })
})
