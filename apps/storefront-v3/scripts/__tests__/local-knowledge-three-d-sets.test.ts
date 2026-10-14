import { resolveThreeDSetsResources } from "../../src/app/api/ai-shopping-assistant/three-d-sets-resources";
import index from "../../src/app/api/ai-shopping-assistant/three-d-sets-source-index.json";
const user = (content: string) => ({ role: "user" as const, content });

describe("3D Sets source link routing", () => {
  it("routes Sandy assembly to the publisher-linked presentation without copying steps", () => {
    const result = resolveThreeDSetsResources([
      user("How do I assemble model 11 Sandy?"),
    ])!;
    expect(result.status).toBe("source_links");
    expect(result.guideRevision).toBe("1.0");
    expect(
      result.links.some((link) =>
        link.url.includes("1xb7YkoKhJmHLQ6zAjSLmep7UbICcW2iVI0if_n4BRAo"),
      ),
    ).toBe(true);
    expect(result.text).toContain("official public presentation");
    expect(result.text).not.toMatch(/tighten|solder|screw|step 1/i);
  });
  it("does not substitute a different requested guide revision", () => {
    const result = resolveThreeDSetsResources([
      user("Sandy build guide v2.0"),
    ])!;
    expect(result.reason).toBe("exact_guide_revision_unverified");
    expect(
      result.links.every((link) => !link.url.includes("docs.google.com")),
    ).toBe(true);
  });
  it("keeps Rancher product release distinct from guide revision", () => {
    const result = resolveThreeDSetsResources([
      user("Rancher Hardtop assembly guide"),
    ])!;
    expect(result.productRelease).toBe("1.4.1");
    expect(result.guideRevision).toBe("1.4.0");
    expect(result.text).toContain("are distinct");
  });
  it("can select a specifically indexed older Rancher guide", () => {
    const result = resolveThreeDSetsResources([
      user("Model 2 assembly guide v1.3.2"),
    ])!;
    expect(result.guideRevision).toBe("1.3.2");
    expect(result.links[1].url).toContain(
      "1efrWbdka1HBKklFfKKETao6EAzMzaLn4NoRnkBS0U2A",
    );
  });
  it("preserves Max Team versus Max 4x4 identity conflict", () => {
    const result = resolveThreeDSetsResources([
      user("How do I build Max 4x4?"),
    ])!;
    expect(result.reason).toBe("publisher_guide_label_conflict");
    expect(result.links).toHaveLength(1);
    expect(result.text).toContain("Max Team");
  });
  it("does not turn a physical kit into digital model access or retailer stock", () => {
    const result = resolveThreeDSetsResources([
      user("Does my Sandy kit include STLs and a radio, and is it in stock?"),
    ])!;
    expect(result.reason).toBe("store_kit_not_mapped");
    expect(result.unknownFields).toEqual(
      expect.arrayContaining([
        "included_contents",
        "digital_access_included",
        "physical_stock",
      ]),
    );
    expect(result.text).not.toContain("224.95");
  });
  it("links the dated FAQ without extracting its answers", () => {
    const result = resolveThreeDSetsResources([user("3D Sets FAQ please")])!;
    expect(result.links[0].url).toBe("https://3dsets.com/blog/faq/");
    expect(result.text).toContain("2021");
    expect(index.source_usage.faq_content_ingested).toBe(false);
  });
  it("does not infer aircraft from indexed boats", () => {
    const result = resolveThreeDSetsResources([
      user("How do I build a 3D Sets jet aircraft?"),
    ])!;
    expect(result.reason).toBe("aircraft_family_unverified");
    expect(result.guideRevision).toBeNull();
  });
  it("does not choose a guide after comparing two models", () => {
    const result = resolveThreeDSetsResources([
      user("Sandy versus Rancher Hardtop"),
      user("How do I build it?"),
    ])!;
    expect(result.reason).toBe("exact_model_required");
  });
  it("keeps assistant text and private history out of entity resolution", () => {
    expect(
      resolveThreeDSetsResources([
        { role: "assistant", content: "Build Sandy." },
        user("How do I build it?"),
      ]),
    ).toBeNull();
    expect(
      resolveThreeDSetsResources([
        user("My order order_fixture123 included Sandy."),
        user("How do I build it?"),
      ]),
    ).toBeNull();
  });
  it("leaves other knowledge topics with their existing retrieval path", () => {
    expect(
      resolveThreeDSetsResources([user("How do I dry PA6-CF20?")]),
    ).toBeNull();
  });
  it("keeps retailer observations and all actual store mappings separate", () => {
    expect(index.retailer_examples).toHaveLength(3);
    expect(
      index.retailer_examples.every(
        (example) =>
          example.store_identity === null && example.store_stock === null,
      ),
    ).toBe(true);
    expect(
      index.models.every(
        (model) =>
          model.store_kit.sku === null && model.native_approval === null,
      ),
    ).toBe(true);
    expect(index.source_usage.guide_content_ingested).toBe(false);
    expect(index.source_usage.guide_embeddings_created).toBe(false);
  });
  it("keeps an indexed retailer family from falling through to unrelated material claims", () => {
    const result = resolveThreeDSetsResources([
      user("What is included in the Landy kit WES2488?"),
    ])!;
    expect(result.reason).toBe("store_kit_not_mapped");
    expect(result.modelKey).toBeNull();
    expect(result.unknownFields).toContain("included_contents");
  });
});
