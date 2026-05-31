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
  it("contains a deterministic source-backed launch catalogue with unique real handles", () => {
    const handles = AI_READY_CATALOGUE_PRODUCTS.map(
      (product) => product.handle,
    );

    expect(AI_READY_CATALOGUE_PRODUCTS.length).toBeGreaterThanOrEqual(35);
    expect(AI_READY_CATALOGUE_PRODUCTS.length).toBeLessThanOrEqual(45);
    expect(handles.every((handle) => !handle.startsWith("ai-"))).toBe(true);
    expect(new Set(handles).size).toBe(handles.length);
    expect(
      AI_READY_CATALOGUE_PRODUCTS.every(
        (product) =>
          product.brandName &&
          product.categoryHandle &&
          product.collectionHandle &&
          product.source.official_product_url.startsWith("https://") &&
          product.source.source_checked_at === "2026-05-31",
      ),
    ).toBe(true);
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
        "connector_pack",
        "receiver",
        "transmitter",
      ]),
    );
  });

  it("keeps PolyDryer under drying/storage instead of filament", () => {
    const product = AI_READY_CATALOGUE_PRODUCTS.find(
      (item) => item.handle === "polymaker-polydryer",
    );

    expect(product).toBeDefined();
    expect(product?.categoryHandle).toBe("tools");
    expect(product?.collectionHandle).toBe("filament-drying-storage");
    expect(product?.metadata.three_d_printing?.product_kind).toBe(
      "drying_storage",
    );
  });

  it("uses China-origin brands for nozzle and hotend products", () => {
    const nozzleAndHotendProducts = AI_READY_CATALOGUE_PRODUCTS.filter(
      (product) =>
        product.metadata.three_d_printing?.product_kind === "nozzle" ||
        product.metadata.three_d_printing?.product_kind === "hotend",
    );

    expect(nozzleAndHotendProducts.length).toBeGreaterThanOrEqual(6);
    expect(nozzleAndHotendProducts.map((product) => product.brandName)).toEqual(
      expect.arrayContaining([
        "Phaetus",
        "BIQU",
        "Trianglelab",
        "Creality",
        "Bambu Lab",
        "Mellow3D",
      ]),
    );
    expect(
      nozzleAndHotendProducts.every(
        (product) => product.brandOriginCountry === "China",
      ),
    ).toBe(true);
  });

  it("builds Medusa product input with source metadata namespaces and AUD prices", () => {
    const product = AI_READY_CATALOGUE_PRODUCTS.find(
      (item) => item.handle === "polymaker-polylite-petg-black-175-1kg",
    );

    expect(product).toBeDefined();

    const input = buildAiCatalogueProductInput(product!, "aud");

    expect(input).toEqual(
      expect.objectContaining({
        handle: "polymaker-polylite-petg-black-175-1kg",
        status: "published",
        is_giftcard: false,
        discountable: true,
        metadata: expect.objectContaining({
          ai_catalogue_seed: false,
          source_backed_catalogue_seed: true,
          brand: "Polymaker",
          category: "filament/petg",
          collection: "premium-filaments",
          tags: expect.arrayContaining(["filament", "petg", "polymaker"]),
          source: expect.objectContaining({
            kind: "official_product_page",
            official_product_url:
              "https://us.polymaker.com/products/polylite-petg?variant=41266031198265",
          }),
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
    expect(input.images?.[0]?.url).toContain("shop.polymaker.com");
    expect(input.thumbnail).toBe(input.images?.[0]?.url);
  });

  it("uses source-backed raster product media without generated placeholders", () => {
    expect(
      AI_READY_CATALOGUE_PRODUCTS.every((product) =>
        /^https:\/\/.+\.(png|jpe?g|webp)(\?|$)/i.test(product.imageUrl),
      ),
    ).toBe(true);
    expect(
      AI_READY_CATALOGUE_PRODUCTS.every((product) =>
        product.imageUrl.includes("placehold.co"),
      ),
    ).toBe(false);
  });

  it("builds rich Strapi product descriptions from AI metadata", () => {
    const product = AI_READY_CATALOGUE_PRODUCTS.find(
      (item) => item.handle === "polymaker-polylite-petg-black-175-1kg",
    );

    expect(product).toBeDefined();

    const description = buildAiReadyProductDescription(product!);

    expect(description.rich_description).toContain("PETG");
    expect(description.rich_description).toContain("recommended print window");
    expect(description.features).toEqual(
      expect.arrayContaining([
        "PETG material for functional parts and outdoor brackets.",
        "Drying is recommended before critical prints.",
      ]),
    );
    expect(description.specifications).toEqual(
      expect.objectContaining({
        material: "PETG",
        diameter_mm: 1.75,
        recommended_nozzle_temp_c: "230-260 C",
      }),
    );
  });

  it("builds public product document seeds with search keywords", () => {
    const product = AI_READY_CATALOGUE_PRODUCTS.find(
      (item) => item.handle === "bambu-pla-cf-black-175-1kg",
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
    expect(documents.flatMap((document) => document.search_keywords)).toEqual(
      expect.arrayContaining(["PLA-CF", "hardened nozzle"]),
    );
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
