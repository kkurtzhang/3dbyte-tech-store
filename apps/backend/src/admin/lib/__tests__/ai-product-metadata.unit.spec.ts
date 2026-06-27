import {
  buildAiProductMetadataFormState,
  buildAiProductMetadataUpdatePayload,
  type AiProductMetadataFormState,
} from "../ai-product-metadata";

describe("AI product metadata admin helpers", () => {
  it("builds form state from existing AI metadata namespaces", () => {
    const state = buildAiProductMetadataFormState({
      ai_core: {
        schema_version: 1,
        product_kind: "soldering_station",
        audience: ["electronics beginners", "makers"],
        best_for: ["kit assembly"],
        not_recommended_for: ["production lines"],
        compatibility_notes: ["Use with 240V AU outlet"],
        care_or_safety_notes: ["Let the iron cool before storing"],
        ai_search_keywords: ["soldering iron"],
      },
      three_d_printing: {
        schema_version: 1,
        product_kind: "filament",
        material: "PETG",
        diameter_mm: 1.75,
        recommended_nozzle_temp_c: { min: 230, max: 250 },
        requires_enclosure: false,
        requires_hardened_nozzle: false,
        drying_recommended: true,
        best_for: ["functional parts"],
      },
      rc_model_building: {
        schema_version: 1,
        component_role: "esc",
        voltage: "7.4V",
        connector_type: "XT60",
        used_for: ["3DSets-style drivetrain"],
      },
    });

    expect(state.aiCore.enabled).toBe(true);
    expect(state.aiCore.productKind).toBe("soldering_station");
    expect(state.aiCore.audience).toBe(
      "electronics beginners\nmakers",
    );
    expect(state.threeDPrinting.enabled).toBe(true);
    expect(state.threeDPrinting.material).toBe("PETG");
    expect(state.threeDPrinting.nozzleTempMinC).toBe("230");
    expect(state.rcModelBuilding.enabled).toBe(true);
    expect(state.rcModelBuilding.connectorType).toBe("XT60");
  });

  it("builds an update payload that preserves unrelated metadata", () => {
    const formState: AiProductMetadataFormState = {
      ...buildAiProductMetadataFormState({}),
      aiCore: {
        ...buildAiProductMetadataFormState({}).aiCore,
        enabled: true,
        productKind: "soldering_station",
        audience: "electronics beginners\nmakers",
        bestFor: "kit assembly\nbench repairs",
        compatibilityNotes: "Use with 240V AU outlet",
        careOrSafetyNotes: "Let the iron cool before storing",
        aiSearchKeywords: "soldering iron\nelectronics bench",
      },
      threeDPrinting: {
        ...buildAiProductMetadataFormState({}).threeDPrinting,
        enabled: false,
      },
      rcModelBuilding: {
        ...buildAiProductMetadataFormState({}).rcModelBuilding,
        enabled: true,
        componentRole: "esc",
        voltage: "7.4V",
        connectorType: "XT60",
        usedFor: "crawler drivetrain",
      },
    };

    expect(
      buildAiProductMetadataUpdatePayload(
        {
          legacy_flag: true,
          ai_core: { schema_version: 1, product_kind: "old" },
          three_d_printing: { schema_version: 1, product_kind: "filament" },
        },
        formState,
      ),
    ).toEqual({
      metadata: {
        legacy_flag: true,
        ai_core: {
          schema_version: 1,
          product_kind: "soldering_station",
          audience: ["electronics beginners", "makers"],
          best_for: ["kit assembly", "bench repairs"],
          compatibility_notes: ["Use with 240V AU outlet"],
          care_or_safety_notes: ["Let the iron cool before storing"],
          ai_search_keywords: ["soldering iron", "electronics bench"],
        },
        rc_model_building: {
          schema_version: 1,
          component_role: "esc",
          voltage: "7.4V",
          connector_type: "XT60",
          used_for: ["crawler drivetrain"],
        },
      },
    });
  });

  it("rejects invalid numeric values before building a product update payload", () => {
    const formState: AiProductMetadataFormState = {
      ...buildAiProductMetadataFormState({}),
      threeDPrinting: {
        ...buildAiProductMetadataFormState({}).threeDPrinting,
        enabled: true,
        productKind: "filament",
        diameterMm: "not-a-number",
      },
    };

    expect(() =>
      buildAiProductMetadataUpdatePayload({}, formState),
    ).toThrow("Diameter must be a valid number");
  });
});
