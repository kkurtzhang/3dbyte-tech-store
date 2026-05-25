describe("search index configuration", () => {
  const previousEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...previousEnv };
    delete process.env.NEXT_PUBLIC_MEILISEARCH_PRODUCT_INDEX_NAME;
    delete process.env.NEXT_PUBLIC_MEILISEARCH_CATEGORY_INDEX_NAME;
    delete process.env.NEXT_PUBLIC_MEILISEARCH_BRAND_INDEX_NAME;
    delete process.env.NEXT_PUBLIC_MEILISEARCH_COLLECTION_INDEX_NAME;
    delete process.env.NEXT_PUBLIC_MEILISEARCH_BLOG_INDEX_NAME;
  });

  afterAll(() => {
    process.env = previousEnv;
  });

  it("uses default Meilisearch index names", async () => {
    const client = await import("../client");

    expect(client.INDEX_PRODUCTS).toBe("products");
    expect(client.INDEX_CATEGORIES).toBe("categories");
    expect(client.INDEX_BRANDS).toBe("brands");
    expect(client.INDEX_COLLECTIONS).toBe("collections");
    expect(client.INDEX_BLOG).toBe("blog");
  });

  it("uses environment-specific Meilisearch index names", async () => {
    process.env.NEXT_PUBLIC_MEILISEARCH_PRODUCT_INDEX_NAME = "stg_products";
    process.env.NEXT_PUBLIC_MEILISEARCH_CATEGORY_INDEX_NAME = "stg_categories";
    process.env.NEXT_PUBLIC_MEILISEARCH_BRAND_INDEX_NAME = "stg_brands";
    process.env.NEXT_PUBLIC_MEILISEARCH_COLLECTION_INDEX_NAME = "stg_collections";
    process.env.NEXT_PUBLIC_MEILISEARCH_BLOG_INDEX_NAME = "stg_blog";

    const client = await import("../client");

    expect(client.INDEX_PRODUCTS).toBe("stg_products");
    expect(client.INDEX_CATEGORIES).toBe("stg_categories");
    expect(client.INDEX_BRANDS).toBe("stg_brands");
    expect(client.INDEX_COLLECTIONS).toBe("stg_collections");
    expect(client.INDEX_BLOG).toBe("stg_blog");
  });
});
