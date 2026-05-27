import {
  AI_READY_CATALOGUE_PRODUCTS,
  buildAiCatalogueProductInput,
  getAiCatalogueCoverage,
} from "../ai-ready-catalogue/catalogue";
import {
  buildAiReadyProductDescription,
  buildAiReadyProductDocuments,
} from "../ai-ready-catalogue/content";

describe("AI-ready realistic product catalogue", () => {
  it("contains a deterministic small catalogue with unique ai-* handles", () => {
    const handles = AI_READY_CATALOGUE_PRODUCTS.map((product) => product.handle);

    expect(AI_READY_CATALOGUE_PRODUCTS.length).toBeGreaterThanOrEqual(25);
    expect(AI_READY_CATALOGUE_PRODUCTS.length).toBeLessThanOrEqual(30);
    expect(handles.every((handle) => handle.startsWith("ai-"))).toBe(true);
    expect(new Set(handles).size).toBe(handles.length);
  });

  it("covers print-process and RC model building product roles", () => {
    const coverage = getAiCatalogueCoverage(AI_READY_CATALOGUE_PRODUCTS);

    expect(coverage.productKinds).toEqual(
      expect.arrayContaining([
        "filament",
        "nozzle",
        "build_surface",
        "drying_storage",
        "maintenance_tool",
      ]),
    );
    expect(coverage.componentRoles).toEqual(
      expect.arrayContaining([
        "drive_motor",
        "esc",
        "servo",
        "bearing_set",
        "fastener_kit",
      ]),
    );
  });

  it("builds Medusa product input with metadata namespaces and AUD prices", () => {
    const product = AI_READY_CATALOGUE_PRODUCTS.find(
      (item) => item.handle === "ai-petg-black-175-1kg",
    );

    expect(product).toBeDefined();

    const input = buildAiCatalogueProductInput(product!, "aud");

    expect(input).toEqual(
      expect.objectContaining({
        handle: "ai-petg-black-175-1kg",
        status: "published",
        is_giftcard: false,
        discountable: true,
        metadata: expect.objectContaining({
          ai_catalogue_seed: true,
          three_d_printing: expect.objectContaining({
            product_kind: "filament",
            material: "PETG",
          }),
          rc_model_building: expect.objectContaining({
            component_role: "print_material",
          }),
        }),
      }),
    );
    expect(input.variants).toHaveLength(1);
    expect(input.variants[0]?.prices).toEqual([
      { amount: 32.95, currency_code: "aud" },
    ]);
    expect(input.images?.[0]?.url).toMatch(
      /\/ai-catalogue\/products\/ai-petg-black-175-1kg\.png$/,
    );
  });

  it("uses storefront-hosted raster product media", () => {
    expect(
      AI_READY_CATALOGUE_PRODUCTS.every((product) =>
        product.imageUrl.endsWith(
          `/ai-catalogue/products/${product.handle}.png`,
        ),
      ),
    ).toBe(true);
  });

  it("builds rich Strapi product descriptions from AI metadata", () => {
    const product = AI_READY_CATALOGUE_PRODUCTS.find(
      (item) => item.handle === "ai-petg-black-175-1kg",
    );

    expect(product).toBeDefined();

    const description = buildAiReadyProductDescription(product!);

    expect(description.rich_description).toContain("PETG");
    expect(description.rich_description).toContain("recommended print window");
    expect(description.features).toEqual(
      expect.arrayContaining([
        "PETG material for functional parts and 3DSets body panels.",
        "Drying is recommended before critical prints.",
      ]),
    );
    expect(description.specifications).toEqual(
      expect.objectContaining({
        material: "PETG",
        diameter_mm: 1.75,
        recommended_nozzle_temp_c: "230-250 C",
      }),
    );
  });

  it("builds public product document seeds with search keywords", () => {
    const product = AI_READY_CATALOGUE_PRODUCTS.find(
      (item) => item.handle === "ai-petg-cf-black-175-1kg",
    );

    expect(product).toBeDefined();

    const documents = buildAiReadyProductDocuments(product!);

    expect(documents.map((document) => document.document_type)).toEqual(
      expect.arrayContaining(["datasheet", "safety_sheet"]),
    );
    expect(
      documents.every((document) =>
        document.filename.startsWith(`${product!.handle}-`),
      ),
    ).toBe(true);
    expect(
      documents.flatMap((document) => document.search_keywords),
    ).toEqual(expect.arrayContaining(["PETG-CF", "hardened nozzle"]));
  });

  it("provides content and at least one document for every AI-ready product", () => {
    for (const product of AI_READY_CATALOGUE_PRODUCTS) {
      const description = buildAiReadyProductDescription(product);
      const documents = buildAiReadyProductDocuments(product);

      expect(description.rich_description.length).toBeGreaterThan(300);
      expect(documents.length).toBeGreaterThanOrEqual(1);
      expect(new Set(documents.map((document) => document.title)).size).toBe(
        documents.length,
      );
    }
  });
});
