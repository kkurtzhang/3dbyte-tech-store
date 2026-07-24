import {
  buildAiProductDraftChangeSet,
  buildAiProductSnapshotHash,
  resolveAiProductDraftOperation,
} from "../resolution"

const candidate = {
  id: "prod_123",
  handle: "example-petg",
  title: "Example PETG",
  metadata: {
    ai_core: {
      schema_version: 1,
      product_kind: "filament",
    },
    three_d_printing: {
      schema_version: 1,
      diameter_mm: 2.85,
    },
  },
}

describe("AI product draft operation resolution", () => {
  it("resolves an explicit existing target as enrichment", () => {
    expect(
      resolveAiProductDraftOperation({
        requested_operation: "enrich",
        product_id: "prod_123",
        product_handle: "example-petg",
        candidates: [candidate],
      })
    ).toEqual({
      operation: "enrich",
      resolution_status: "resolved",
      target: candidate,
      reason: "explicit_target",
    })
  })

  it("resolves an automatic request with no candidate as creation", () => {
    expect(
      resolveAiProductDraftOperation({
        requested_operation: "auto",
        product_id: "",
        product_handle: "",
        candidates: [],
      })
    ).toEqual({
      operation: "create",
      resolution_status: "resolved",
      target: null,
      reason: "no_existing_match",
    })
  })

  it("requires admin resolution when creation would duplicate a candidate", () => {
    expect(
      resolveAiProductDraftOperation({
        requested_operation: "create",
        product_id: "",
        product_handle: "",
        candidates: [candidate],
      })
    ).toEqual({
      operation: null,
      resolution_status: "needs_resolution",
      target: null,
      reason: "create_candidate_conflict",
    })
  })

  it("requires admin resolution for multiple automatic candidates", () => {
    expect(
      resolveAiProductDraftOperation({
        requested_operation: "auto",
        product_id: "",
        product_handle: "",
        candidates: [
          candidate,
          { ...candidate, id: "prod_456", handle: "example-petg-black" },
        ],
      }).resolution_status
    ).toBe("needs_resolution")
  })

  it("fails explicit enrichment when the requested target is missing", () => {
    expect(
      resolveAiProductDraftOperation({
        requested_operation: "enrich",
        product_id: "prod_missing",
        product_handle: "",
        candidates: [],
      }).resolution_status
    ).toBe("validation_failed")
  })
})

describe("AI product draft quality assessment", () => {
  const normalizedDraft = {
    metadata: {
      ai_core: {
        schema_version: 1,
        product_kind: "filament",
      },
      three_d_printing: {
        schema_version: 1,
        material: "PETG",
        diameter_mm: 1.75,
      },
    },
    claim_evidence: [
      {
        claim_path: "metadata.three_d_printing.material",
        value: "PETG",
        source_url: "https://manufacturer.example/petg",
        source_type: "official_product_page",
        confidence: 0.96,
      },
      {
        claim_path: "metadata.three_d_printing.diameter_mm",
        value: 1.75,
        source_url: "https://manufacturer.example/petg",
        source_type: "official_product_page",
        confidence: 0.94,
      },
    ],
  }

  it("preselects missing values and requires explicit selection for conflicts", () => {
    const changes = buildAiProductDraftChangeSet({
      current_product: candidate,
      normalized_draft: normalizedDraft,
    })

    expect(changes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: "metadata.three_d_printing.material",
          disposition: "missing",
          default_selected: true,
          proposed_value: "PETG",
        }),
        expect.objectContaining({
          path: "metadata.three_d_printing.diameter_mm",
          disposition: "conflict",
          default_selected: false,
          current_value: 2.85,
          proposed_value: 1.75,
        }),
      ])
    )
    expect(changes).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: "metadata.ai_core.product_kind",
        }),
      ])
    )
  })

  it("produces a stable snapshot hash regardless of object key order", () => {
    expect(
      buildAiProductSnapshotHash({
        id: "prod_123",
        handle: "example-petg",
        metadata: { material: "PETG", diameter: 1.75 },
      })
    ).toBe(
      buildAiProductSnapshotHash({
        metadata: { diameter: 1.75, material: "PETG" },
        handle: "example-petg",
        id: "prod_123",
      })
    )
  })
})
