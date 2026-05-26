import {
  AI_READY_CATALOGUE_PRODUCTS,
  buildAiCatalogueProductInput,
  getAiCatalogueCoverage,
} from "../ai-ready-catalogue/catalogue";

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
    expect(input.images?.[0]?.url).toBe(
      "https://placehold.co/900x900/png?text=AI+PETG+Black",
    );
  });

  it("uses raster placeholder images that Next image optimization accepts", () => {
    expect(
      AI_READY_CATALOGUE_PRODUCTS.every((product) =>
        product.imageUrl.startsWith("https://placehold.co/900x900/png?"),
      ),
    ).toBe(true);
  });
});
