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

  it("publishes a valid Product Contract v2 fixture", () => {
    const fixture = JSON.parse(
      readFileSync(
        path.join(
          repoRoot,
          "docs/hermes/fixtures/product-research-packet.v2.example.json"
        ),
        "utf8"
      )
    )

    const packet = ProductResearchPacketSchema.parse(fixture)

    expect(packet.packet_version).toBe(2)
    expect("request_id" in packet && packet.request_id).toBeTruthy()
    expect("requested_operation" in packet && packet.requested_operation).toBe(
      "auto"
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

    const v2Schema = JSON.parse(
      readFileSync(
        path.join(repoRoot, "docs/hermes/product-research-packet.v2.schema.json"),
        "utf8"
      )
    )

    expect(v2Schema.$id).toBe(
      "https://3dbyte.tech/schemas/hermes/product-research-packet.v2.json"
    )
    expect(v2Schema.required).toEqual(
      expect.arrayContaining(["request_id", "requested_operation"])
    )
    expect(v2Schema.properties.requested_operation.enum).toEqual([
      "auto",
      "create",
      "enrich",
    ])
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
    expect(submitter).toContain("/integrations/hermes/product-drafts")
    expect(submitter).not.toContain("POST /admin/ai-product-drafts")
    expect(submitter).toContain("x-3db-hermes-product-draft-token")
    expect(submitter).toContain("Never call Medusa product update routes")
    expect(submitter).toContain("Product Research Packet v2")
    expect(submitter).toContain("request_id")
    expect(submitter).toContain("needs_resolution")

    const packetBuilder = readFileSync(
      path.join(repoRoot, "docs/hermes/skills/hermes-packet-builder/SKILL.md"),
      "utf8"
    )
    expect(packetBuilder).toContain("product-research-packet.v2.schema.json")
    expect(packetBuilder).toContain('"requested_operation": "auto"')
    expect(packetBuilder).toContain("Do not invent")
  })

  it("keeps Hermes intake outside the Medusa Admin authentication namespace", () => {
    const middlewareSource = readFileSync(
      path.join(repoRoot, "apps/backend/src/api/middlewares.ts"),
      "utf8"
    )
    const adminRouteSource = readFileSync(
      path.join(
        repoRoot,
        "apps/backend/src/api/admin/ai-product-drafts/route.ts"
      ),
      "utf8"
    )
    const onboardingGuide = readFileSync(
      path.join(repoRoot, "docs/hermes/native-product-onboarding-skills.md"),
      "utf8"
    )

    expect(middlewareSource).toContain(
      'matcher: "/integrations/hermes/product-drafts"'
    )
    expect(middlewareSource).not.toMatch(
      /matcher: "\/admin\/ai-product-drafts",\s+methods: \["POST"\]/
    )
    expect(adminRouteSource).not.toMatch(/export async function POST/)
    expect(onboardingGuide).toContain(
      "POST /integrations/hermes/product-drafts"
    )
    expect(onboardingGuide).not.toContain("POST /admin/ai-product-drafts")
  })
})
