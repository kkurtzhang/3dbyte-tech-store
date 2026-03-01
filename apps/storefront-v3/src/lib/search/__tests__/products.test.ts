/**
 * Unit tests for Product Search Service
 *
 * Tests searchProducts, getFacets, and internal helper functions
 */

import {
  searchProducts,
  getFacets,
  type ProductHit,
  type FacetDistribution,
} from "../products"

// ============================================================================
// Mocks - Must be at the top level before any imports that use them
// ============================================================================

// Create mock functions that will be used in the mock factory
const mockSearch = jest.fn()

// Mock the search client - use jest.fn() inside the factory and export the mock
jest.mock("../client", () => {
  const searchMock = jest.fn()
  return {
    searchClient: {
      index: jest.fn(() => ({
        search: searchMock,
      })),
    },
    INDEX_PRODUCTS: "products",
    // Export the mock so we can access it in tests
    __mockSearch: searchMock,
  }
})

// Mock the Medusa products module
jest.mock("@/lib/medusa/products", () => ({
  getProducts: jest.fn(),
}))

// Get the mock functions after they're defined
const mockClient = jest.requireMock("../client")
const mockGetProducts = jest.requireMock("@/lib/medusa/products").getProducts

// ============================================================================
// Test Utilities
// ============================================================================

// Suppress console.warn and console.error in tests
const originalWarn = console.warn
const originalError = console.error

beforeAll(() => {
  console.warn = jest.fn()
  console.error = jest.fn()
})

afterAll(() => {
  console.warn = originalWarn
  console.error = originalError
})

beforeEach(() => {
  // Reset the mock before each test
  mockClient.__mockSearch.mockReset()
  mockGetProducts.mockReset()
})

// ============================================================================
// Test Data Factories
// ============================================================================

const createMockProductHit = (overrides: Partial<ProductHit> = {}): ProductHit => ({
  id: "prod_1",
  handle: "test-product",
  title: "Test Product",
  thumbnail: "https://example.com/image.jpg",
  price_aud: 100,
  original_price_aud: 150,
  discount_percentage: 33.33,
  on_sale: true,
  in_stock: true,
  inventory_quantity: 10,
  category_ids: ["cat_1"],
  categories: ["3D Printers"],
  brand: {
    id: "brand_1",
    name: "Test Brand",
    handle: "test-brand",
  },
  variants: [
    { id: "variant_1", sku: "SKU-001", title: "Default" },
  ],
  ...overrides,
})

const createMockMeilisearchResponse = (
  hits: ProductHit[] = [],
  options: {
    totalHits?: number
    facets?: FacetDistribution
  } = {}
) => ({
  hits,
  estimatedTotalHits: options.totalHits ?? hits.length,
  facetDistribution: options.facets ?? {},
  processingTimeMs: 10,
  query: "",
  limit: 20,
  offset: 0,
})

const createMockMedusaProduct = (overrides: Record<string, unknown> = {}) => ({
  id: "medusa_prod_1",
  handle: "medusa-product",
  title: "Medusa Product",
  thumbnail: "https://example.com/medusa.jpg",
  variants: [
    {
      id: "medusa_variant_1",
      sku: "MEDUSA-SKU",
      title: "Default",
      calculated_price: {
        calculated_amount: 100,
        original_amount: 150,
      },
      original_price: { amount: 150 },
      prices: [{ amount: 100, currency_code: "aud" }],
      inventory_quantity: 10,
      manage_inventory: true,
    },
  ],
  categories: [{ id: "cat_1", name: "3D Printers" }],
  brand: {
    id: "brand_1",
    name: "Test Brand",
    handle: "test-brand",
  },
  ...overrides,
})

// ============================================================================
// searchProducts Tests
// ============================================================================

describe("searchProducts", () => {
  // -------------------------------------------------------------------------
  // Basic Functionality
  // -------------------------------------------------------------------------

  describe("basic functionality", () => {
    it("returns products for empty query with default pagination", async () => {
      const mockHits = [createMockProductHit()]
      mockClient.__mockSearch.mockResolvedValueOnce(createMockMeilisearchResponse(mockHits))

      const result = await searchProducts()

      expect(result.products).toHaveLength(1)
      expect(result.totalCount).toBe(1)
      expect(result.error).toBe(false)
      expect(result.degradedMode).toBe(false)
      expect(mockClient.__mockSearch).toHaveBeenCalledWith("", expect.objectContaining({
        limit: 20,
        offset: 0,
      }))
    })

    it("returns products for empty query with custom pagination", async () => {
      const mockHits = [createMockProductHit()]
      mockClient.__mockSearch.mockResolvedValueOnce(createMockMeilisearchResponse(mockHits, { totalHits: 50 }))

      const result = await searchProducts({ page: 2, limit: 10 })

      expect(result.products).toHaveLength(1)
      expect(result.totalCount).toBe(50)
      expect(mockClient.__mockSearch).toHaveBeenCalledWith("", expect.objectContaining({
        limit: 10,
        offset: 10, // (page - 1) * limit = (2 - 1) * 10
      }))
    })

    it("returns products with search query", async () => {
      const mockHits = [createMockProductHit({ title: "Prusa MK4" })]
      mockClient.__mockSearch.mockResolvedValueOnce(createMockMeilisearchResponse(mockHits))

      const result = await searchProducts({ query: "prusa" })

      expect(result.products).toHaveLength(1)
      expect(result.products[0].title).toBe("Prusa MK4")
      expect(mockClient.__mockSearch).toHaveBeenCalledWith("prusa", expect.any(Object))
    })

    it("returns empty products array when no results", async () => {
      mockClient.__mockSearch.mockResolvedValueOnce(createMockMeilisearchResponse([]))

      const result = await searchProducts({ query: "nonexistent" })

      expect(result.products).toHaveLength(0)
      expect(result.totalCount).toBe(0)
      expect(result.error).toBe(false)
    })

    it("returns facets in the result", async () => {
      const mockFacets: FacetDistribution = {
        "brand.id": { brand_1: 10, brand_2: 5 },
        category_ids: { cat_1: 15 },
        on_sale: { true: 8, false: 7 },
      }
      mockClient.__mockSearch.mockResolvedValueOnce(
        createMockMeilisearchResponse([createMockProductHit()], { facets: mockFacets })
      )

      const result = await searchProducts()

      expect(result.facets).toEqual(mockFacets)
    })
  })

  // -------------------------------------------------------------------------
  // Pagination
  // -------------------------------------------------------------------------

  describe("pagination", () => {
    it("calculates correct offset for page 1", async () => {
      mockClient.__mockSearch.mockResolvedValueOnce(createMockMeilisearchResponse([]))

      await searchProducts({ page: 1, limit: 20 })

      expect(mockClient.__mockSearch).toHaveBeenCalledWith("", expect.objectContaining({
        offset: 0,
        limit: 20,
      }))
    })

    it("calculates correct offset for page 3 with limit 15", async () => {
      mockClient.__mockSearch.mockResolvedValueOnce(createMockMeilisearchResponse([]))

      await searchProducts({ page: 3, limit: 15 })

      expect(mockClient.__mockSearch).toHaveBeenCalledWith("", expect.objectContaining({
        offset: 30, // (3 - 1) * 15
        limit: 15,
      }))
    })

    it("uses default limit of 20 when not specified", async () => {
      mockClient.__mockSearch.mockResolvedValueOnce(createMockMeilisearchResponse([]))

      await searchProducts({ page: 1 })

      expect(mockClient.__mockSearch).toHaveBeenCalledWith("", expect.objectContaining({
        limit: 20,
      }))
    })
  })

  // -------------------------------------------------------------------------
  // Sorting
  // -------------------------------------------------------------------------

  describe("sorting", () => {
    it("applies newest sort (created_at_timestamp:desc)", async () => {
      mockClient.__mockSearch.mockResolvedValueOnce(createMockMeilisearchResponse([]))

      await searchProducts({ sort: "newest" })

      expect(mockClient.__mockSearch).toHaveBeenCalledWith("", expect.objectContaining({
        sort: ["created_at_timestamp:desc"],
      }))
    })

    it("applies price-asc sort", async () => {
      mockClient.__mockSearch.mockResolvedValueOnce(createMockMeilisearchResponse([]))

      await searchProducts({ sort: "price-asc" })

      expect(mockClient.__mockSearch).toHaveBeenCalledWith("", expect.objectContaining({
        sort: ["price_aud:asc"],
      }))
    })

    it("applies price-desc sort", async () => {
      mockClient.__mockSearch.mockResolvedValueOnce(createMockMeilisearchResponse([]))

      await searchProducts({ sort: "price-desc" })

      expect(mockClient.__mockSearch).toHaveBeenCalledWith("", expect.objectContaining({
        sort: ["price_aud:desc"],
      }))
    })

    it("does not apply sort when not specified", async () => {
      mockClient.__mockSearch.mockResolvedValueOnce(createMockMeilisearchResponse([]))

      await searchProducts({})

      expect(mockClient.__mockSearch).toHaveBeenCalledWith("", expect.objectContaining({
        sort: undefined,
      }))
    })
  })

  // -------------------------------------------------------------------------
  // Filters
  // -------------------------------------------------------------------------

  describe("filters", () => {
    it("applies single category filter", async () => {
      mockClient.__mockSearch.mockResolvedValueOnce(createMockMeilisearchResponse([]))

      await searchProducts({
        filters: { categoryIds: ["cat_1"] },
      })

      expect(mockClient.__mockSearch).toHaveBeenCalledWith(
        "",
        expect.objectContaining({
          filter: '(category_ids = "cat_1")',
        })
      )
    })

    it("applies multiple category filters with OR", async () => {
      mockClient.__mockSearch.mockResolvedValueOnce(createMockMeilisearchResponse([]))

      await searchProducts({
        filters: { categoryIds: ["cat_1", "cat_2", "cat_3"] },
      })

      expect(mockClient.__mockSearch).toHaveBeenCalledWith(
        "",
        expect.objectContaining({
          filter: '(category_ids = "cat_1" OR category_ids = "cat_2" OR category_ids = "cat_3")',
        })
      )
    })

    it("applies single brand filter", async () => {
      mockClient.__mockSearch.mockResolvedValueOnce(createMockMeilisearchResponse([]))

      await searchProducts({
        filters: { brandIds: ["brand_1"] },
      })

      expect(mockClient.__mockSearch).toHaveBeenCalledWith(
        "",
        expect.objectContaining({
          filter: '(brand.id = "brand_1")',
        })
      )
    })

    it("applies multiple brand filters with OR", async () => {
      mockClient.__mockSearch.mockResolvedValueOnce(createMockMeilisearchResponse([]))

      await searchProducts({
        filters: { brandIds: ["brand_1", "brand_2"] },
      })

      expect(mockClient.__mockSearch).toHaveBeenCalledWith(
        "",
        expect.objectContaining({
          filter: '(brand.id = "brand_1" OR brand.id = "brand_2")',
        })
      )
    })

    it("applies single collection filter", async () => {
      mockClient.__mockSearch.mockResolvedValueOnce(createMockMeilisearchResponse([]))

      await searchProducts({
        filters: { collectionIds: ["coll_1"] },
      })

      expect(mockClient.__mockSearch).toHaveBeenCalledWith(
        "",
        expect.objectContaining({
          filter: '(collection_ids = "coll_1")',
        })
      )
    })

    it("applies multiple collection filters with OR", async () => {
      mockClient.__mockSearch.mockResolvedValueOnce(createMockMeilisearchResponse([]))

      await searchProducts({
        filters: { collectionIds: ["coll_1", "coll_2"] },
      })

      expect(mockClient.__mockSearch).toHaveBeenCalledWith(
        "",
        expect.objectContaining({
          filter: '(collection_ids = "coll_1" OR collection_ids = "coll_2")',
        })
      )
    })

    it("applies onSale=true filter", async () => {
      mockClient.__mockSearch.mockResolvedValueOnce(createMockMeilisearchResponse([]))

      await searchProducts({
        filters: { onSale: true },
      })

      expect(mockClient.__mockSearch).toHaveBeenCalledWith(
        "",
        expect.objectContaining({
          filter: "on_sale = true",
        })
      )
    })

    it("applies onSale=false filter", async () => {
      mockClient.__mockSearch.mockResolvedValueOnce(createMockMeilisearchResponse([]))

      await searchProducts({
        filters: { onSale: false },
      })

      expect(mockClient.__mockSearch).toHaveBeenCalledWith(
        "",
        expect.objectContaining({
          filter: "on_sale = false",
        })
      )
    })

    it("applies inStock=true filter", async () => {
      mockClient.__mockSearch.mockResolvedValueOnce(createMockMeilisearchResponse([]))

      await searchProducts({
        filters: { inStock: true },
      })

      expect(mockClient.__mockSearch).toHaveBeenCalledWith(
        "",
        expect.objectContaining({
          filter: "in_stock = true",
        })
      )
    })

    it("applies price range filters", async () => {
      mockClient.__mockSearch.mockResolvedValueOnce(createMockMeilisearchResponse([]))

      await searchProducts({
        filters: { minPrice: 100, maxPrice: 500 },
      })

      expect(mockClient.__mockSearch).toHaveBeenCalledWith(
        "",
        expect.objectContaining({
          filter: "price_aud >= 100 AND price_aud <= 500",
        })
      )
    })

    it("applies only minPrice filter", async () => {
      mockClient.__mockSearch.mockResolvedValueOnce(createMockMeilisearchResponse([]))

      await searchProducts({
        filters: { minPrice: 50 },
      })

      expect(mockClient.__mockSearch).toHaveBeenCalledWith(
        "",
        expect.objectContaining({
          filter: "price_aud >= 50",
        })
      )
    })

    it("applies only maxPrice filter", async () => {
      mockClient.__mockSearch.mockResolvedValueOnce(createMockMeilisearchResponse([]))

      await searchProducts({
        filters: { maxPrice: 200 },
      })

      expect(mockClient.__mockSearch).toHaveBeenCalledWith(
        "",
        expect.objectContaining({
          filter: "price_aud <= 200",
        })
      )
    })

    it("applies dynamic options filters with OR within same option", async () => {
      mockClient.__mockSearch.mockResolvedValueOnce(createMockMeilisearchResponse([]))

      await searchProducts({
        filters: {
          options: {
            colour: ["Black", "White"],
            size: ["S", "M"],
          },
        },
      })

      // Options should be combined with AND across different options,
      // but OR within the same option
      const filterArg = mockClient.__mockSearch.mock.calls[0][1].filter
      expect(filterArg).toContain('options_colour = "Black" OR options_colour = "White"')
      expect(filterArg).toContain('options_size = "S" OR options_size = "M"')
      expect(filterArg).toContain(" AND ")
    })

    it("combines multiple filters with AND", async () => {
      mockClient.__mockSearch.mockResolvedValueOnce(createMockMeilisearchResponse([]))

      await searchProducts({
        filters: {
          categoryIds: ["cat_1"],
          brandIds: ["brand_1"],
          onSale: true,
          inStock: true,
          minPrice: 100,
          maxPrice: 500,
        },
      })

      const filterArg = mockClient.__mockSearch.mock.calls[0][1].filter
      expect(filterArg).toContain('(category_ids = "cat_1")')
      expect(filterArg).toContain('(brand.id = "brand_1")')
      expect(filterArg).toContain("on_sale = true")
      expect(filterArg).toContain("in_stock = true")
      expect(filterArg).toContain("price_aud >= 100")
      expect(filterArg).toContain("price_aud <= 500")
      // All should be joined with AND
      expect(filterArg).toMatch(/\) AND \(/)
    })

    it("does not apply filter when no filters provided", async () => {
      mockClient.__mockSearch.mockResolvedValueOnce(createMockMeilisearchResponse([]))

      await searchProducts({})

      expect(mockClient.__mockSearch).toHaveBeenCalledWith(
        "",
        expect.objectContaining({
          filter: undefined,
        })
      )
    })
  })

  // -------------------------------------------------------------------------
  // Fallback to Medusa
  // -------------------------------------------------------------------------

  describe("fallback to Medusa", () => {
    it("falls back to Medusa when Meilisearch fails", async () => {
      mockClient.__mockSearch.mockRejectedValueOnce(new Error("Meilisearch connection error"))
      mockGetProducts.mockResolvedValueOnce({
        products: [createMockMedusaProduct()],
        count: 1,
      })

      const result = await searchProducts({ page: 1, limit: 20 })

      expect(result.products).toHaveLength(1)
      expect(result.degradedMode).toBe(true)
      expect(result.error).toBe(false)
      expect(console.warn).toHaveBeenCalledWith(
        "Meilisearch search failed, falling back to Medusa",
        expect.any(Error)
      )
    })

    it("transforms Medusa products to ProductHit format", async () => {
      mockClient.__mockSearch.mockRejectedValueOnce(new Error("Meilisearch error"))
      mockGetProducts.mockResolvedValueOnce({
        products: [createMockMedusaProduct()],
        count: 1,
      })

      const result = await searchProducts({ page: 1, limit: 20 })

      expect(result.products[0]).toMatchObject({
        id: "medusa_prod_1",
        handle: "medusa-product",
        title: "Medusa Product",
        price_aud: 100,
        original_price_aud: 150,
        on_sale: true,
        in_stock: true,
        category_ids: ["cat_1"],
        categories: ["3D Printers"],
      })
    })

    it("returns error when both Meilisearch and Medusa fail", async () => {
      mockClient.__mockSearch.mockRejectedValueOnce(new Error("Meilisearch error"))
      mockGetProducts.mockRejectedValueOnce(new Error("Medusa error"))

      const result = await searchProducts()

      expect(result.products).toHaveLength(0)
      expect(result.totalCount).toBe(0)
      expect(result.error).toBe(true)
      expect(result.degradedMode).toBe(false)
    })
  })

  // -------------------------------------------------------------------------
  // Discount Filtering (uses Medusa directly)
  // -------------------------------------------------------------------------

  describe("discount filtering", () => {
    it("uses Medusa directly when minDiscount is specified", async () => {
      mockGetProducts.mockResolvedValueOnce({
        products: [
          createMockMedusaProduct(),
          createMockMedusaProduct({
            id: "medusa_prod_2",
            variants: [
              {
                id: "variant_2",
                calculated_price: { calculated_amount: 80, original_amount: 100 },
                original_price: { amount: 100 },
                prices: [{ amount: 80, currency_code: "aud" }],
                inventory_quantity: 5,
                manage_inventory: true,
              },
            ],
          }),
        ],
        count: 2,
      })

      const result = await searchProducts({
        filters: { minDiscount: 20 },
      })

      expect(mockClient.__mockSearch).not.toHaveBeenCalled()
      expect(mockGetProducts).toHaveBeenCalled()
      expect(result.degradedMode).toBe(true)
    })

    it("uses Medusa directly when maxDiscount is specified", async () => {
      mockGetProducts.mockResolvedValueOnce({
        products: [createMockMedusaProduct()],
        count: 1,
      })

      const result = await searchProducts({
        filters: { maxDiscount: 50 },
      })

      expect(mockClient.__mockSearch).not.toHaveBeenCalled()
      expect(result.degradedMode).toBe(true)
    })

    it("filters products by minDiscount percentage", async () => {
      const discountedProduct = createMockMedusaProduct({
        id: "discounted_prod",
        variants: [
          {
            id: "variant_disc",
            calculated_price: { calculated_amount: 50, original_amount: 100 },
            original_price: { amount: 100 },
            prices: [{ amount: 50, currency_code: "aud" }],
            inventory_quantity: 5,
            manage_inventory: true,
          },
        ],
      })
      const nonDiscountedProduct = createMockMedusaProduct({
        id: "non_discounted_prod",
        variants: [
          {
            id: "variant_nondisc",
            calculated_price: { calculated_amount: 95, original_amount: 100 },
            original_price: { amount: 100 },
            prices: [{ amount: 95, currency_code: "aud" }],
            inventory_quantity: 5,
            manage_inventory: true,
          },
        ],
      })

      mockGetProducts.mockResolvedValueOnce({
        products: [discountedProduct, nonDiscountedProduct],
        count: 2,
      })

      const result = await searchProducts({
        filters: { minDiscount: 40 }, // 50% discount >= 40%
      })

      // Only the discounted product should pass (50% discount)
      expect(result.products).toHaveLength(1)
      expect(result.products[0].id).toBe("discounted_prod")
    })

    it("filters products by maxDiscount percentage", async () => {
      const lowDiscountProduct = createMockMedusaProduct({
        id: "low_discount_prod",
        variants: [
          {
            id: "variant_low",
            calculated_price: { calculated_amount: 90, original_amount: 100 },
            original_price: { amount: 100 },
            prices: [{ amount: 90, currency_code: "aud" }],
            inventory_quantity: 5,
            manage_inventory: true,
          },
        ],
      })
      const highDiscountProduct = createMockMedusaProduct({
        id: "high_discount_prod",
        variants: [
          {
            id: "variant_high",
            calculated_price: { calculated_amount: 30, original_amount: 100 },
            original_price: { amount: 100 },
            prices: [{ amount: 30, currency_code: "aud" }],
            inventory_quantity: 5,
            manage_inventory: true,
          },
        ],
      })

      mockGetProducts.mockResolvedValueOnce({
        products: [lowDiscountProduct, highDiscountProduct],
        count: 2,
      })

      const result = await searchProducts({
        filters: { maxDiscount: 20 }, // 10% discount <= 20%
      })

      // Only the low discount product should pass (10% discount)
      expect(result.products).toHaveLength(1)
      expect(result.products[0].id).toBe("low_discount_prod")
    })

    it("filters by both minDiscount and maxDiscount", async () => {
      const product1 = createMockMedusaProduct({
        id: "prod_25_percent",
        variants: [
          {
            id: "v1",
            calculated_price: { calculated_amount: 75, original_amount: 100 },
            original_price: { amount: 100 },
            prices: [{ amount: 75, currency_code: "aud" }],
            inventory_quantity: 5,
            manage_inventory: true,
          },
        ],
      })
      const product2 = createMockMedusaProduct({
        id: "prod_50_percent",
        variants: [
          {
            id: "v2",
            calculated_price: { calculated_amount: 50, original_amount: 100 },
            original_price: { amount: 100 },
            prices: [{ amount: 50, currency_code: "aud" }],
            inventory_quantity: 5,
            manage_inventory: true,
          },
        ],
      })

      mockGetProducts.mockResolvedValueOnce({
        products: [product1, product2],
        count: 2,
      })

      const result = await searchProducts({
        filters: { minDiscount: 20, maxDiscount: 40 },
      })

      // Only 25% discount product should pass (20 <= 25 <= 40)
      expect(result.products).toHaveLength(1)
      expect(result.products[0].id).toBe("prod_25_percent")
    })

    it("applies pagination after discount filtering", async () => {
      const products = Array.from({ length: 25 }, (_, i) =>
        createMockMedusaProduct({
          id: `prod_${i}`,
          variants: [
            {
              id: `v_${i}`,
              calculated_price: { calculated_amount: 50, original_amount: 100 },
              original_price: { amount: 100 },
              prices: [{ amount: 50, currency_code: "aud" }],
              inventory_quantity: 5,
              manage_inventory: true,
            },
          ],
        })
      )

      mockGetProducts.mockResolvedValueOnce({
        products,
        count: 25,
      })

      const result = await searchProducts({
        page: 2,
        limit: 10,
        filters: { minDiscount: 40 },
      })

      // 25 total products, page 2 with limit 10 = items 10-19
      expect(result.products).toHaveLength(10)
      expect(result.totalCount).toBe(25)
      expect(result.products[0].id).toBe("prod_10")
    })

    it("returns empty facets when using discount filter", async () => {
      mockGetProducts.mockResolvedValueOnce({
        products: [createMockMedusaProduct()],
        count: 1,
      })

      const result = await searchProducts({
        filters: { minDiscount: 10 },
      })

      expect(result.facets).toEqual({})
    })
  })

  // -------------------------------------------------------------------------
  // Product Transformation
  // -------------------------------------------------------------------------

  describe("product transformation", () => {
    it("calculates discount percentage correctly", async () => {
      const hitWithDiscount = {
        ...createMockProductHit(),
        price_aud: 100,
        original_price_aud: 200,
      }
      mockClient.__mockSearch.mockResolvedValueOnce(createMockMeilisearchResponse([hitWithDiscount]))

      const result = await searchProducts()

      // (200 - 100) / 200 * 100 = 50%
      expect(result.products[0].discount_percentage).toBeCloseTo(50)
    })

    it("handles products without discount (no original_price_aud)", async () => {
      const hitNoDiscount = {
        ...createMockProductHit(),
        price_aud: 100,
        original_price_aud: undefined,
        on_sale: false,
      }
      mockClient.__mockSearch.mockResolvedValueOnce(createMockMeilisearchResponse([hitNoDiscount]))

      const result = await searchProducts()

      expect(result.products[0].discount_percentage).toBeUndefined()
    })

    it("handles zero price gracefully", async () => {
      const hitZeroPrice = {
        ...createMockProductHit(),
        price_aud: 0,
        original_price_aud: 0,
      }
      mockClient.__mockSearch.mockResolvedValueOnce(createMockMeilisearchResponse([hitZeroPrice]))

      const result = await searchProducts()

      expect(result.products[0].price_aud).toBe(0)
    })
  })
})

// ============================================================================
// getFacets Tests
// ============================================================================

describe("getFacets", () => {
  it("returns facet distribution from Meilisearch", async () => {
    const mockFacets: FacetDistribution = {
      "brand.id": { brand_1: 10, brand_2: 5 },
      category_ids: { cat_1: 15, cat_2: 8 },
      on_sale: { true: 8, false: 7 },
      in_stock: { true: 12, false: 3 },
    }
    mockClient.__mockSearch.mockResolvedValueOnce({
      hits: [],
      estimatedTotalHits: 0,
      facetDistribution: mockFacets,
    })

    const result = await getFacets()

    expect(result.facets).toEqual(mockFacets)
    expect(result.error).toBe(false)
  })

  it("requests facets with limit 0", async () => {
    mockClient.__mockSearch.mockResolvedValueOnce({
      hits: [],
      estimatedTotalHits: 0,
      facetDistribution: {},
    })

    await getFacets()

    expect(mockClient.__mockSearch).toHaveBeenCalledWith("", expect.objectContaining({
      limit: 0,
    }))
  })

  it("requests all expected facets", async () => {
    mockClient.__mockSearch.mockResolvedValueOnce({
      hits: [],
      estimatedTotalHits: 0,
      facetDistribution: {},
    })

    await getFacets()

    const facetsArg = mockClient.__mockSearch.mock.calls[0][1].facets
    expect(facetsArg).toContain("brand.id")
    expect(facetsArg).toContain("category_ids")
    expect(facetsArg).toContain("collection_ids")
    expect(facetsArg).toContain("on_sale")
    expect(facetsArg).toContain("in_stock")
    expect(facetsArg).toContain("price_aud")
    // Dynamic options facets
    expect(facetsArg).toContain("options_colour")
    expect(facetsArg).toContain("options_size")
  })

  it("returns empty facets and error on failure", async () => {
    mockClient.__mockSearch.mockRejectedValueOnce(new Error("Connection error"))

    const result = await getFacets()

    expect(result.facets).toEqual({})
    expect(result.error).toBe(true)
    expect(console.warn).toHaveBeenCalledWith("Failed to fetch facets", expect.any(Error))
  })

  it("returns empty facets when facetDistribution is null", async () => {
    mockClient.__mockSearch.mockResolvedValueOnce({
      hits: [],
      estimatedTotalHits: 0,
      facetDistribution: null,
    })

    const result = await getFacets()

    expect(result.facets).toEqual({})
    expect(result.error).toBe(false)
  })
})

// ============================================================================
// Edge Cases
// ============================================================================

describe("edge cases", () => {
  it("handles empty filters object", async () => {
    mockClient.__mockSearch.mockResolvedValueOnce(createMockMeilisearchResponse([]))

    await searchProducts({ filters: {} })

    expect(mockClient.__mockSearch).toHaveBeenCalledWith(
      "",
      expect.objectContaining({
        filter: undefined,
      })
    )
  })

  it("handles empty categoryIds array", async () => {
    mockClient.__mockSearch.mockResolvedValueOnce(createMockMeilisearchResponse([]))

    await searchProducts({ filters: { categoryIds: [] } })

    expect(mockClient.__mockSearch).toHaveBeenCalledWith(
      "",
      expect.objectContaining({
        filter: undefined,
      })
    )
  })

  it("handles empty options object", async () => {
    mockClient.__mockSearch.mockResolvedValueOnce(createMockMeilisearchResponse([]))

    await searchProducts({ filters: { options: {} } })

    expect(mockClient.__mockSearch).toHaveBeenCalledWith(
      "",
      expect.objectContaining({
        filter: undefined,
      })
    )
  })

  it("handles empty options values array", async () => {
    mockClient.__mockSearch.mockResolvedValueOnce(createMockMeilisearchResponse([]))

    await searchProducts({ filters: { options: { colour: [] } } })

    expect(mockClient.__mockSearch).toHaveBeenCalledWith(
      "",
      expect.objectContaining({
        filter: undefined,
      })
    )
  })

  it("handles page 0 (treated as page 1 due to default)", async () => {
    mockClient.__mockSearch.mockResolvedValueOnce(createMockMeilisearchResponse([]))

    // TypeScript would prevent this, but testing runtime behavior
    await searchProducts({ page: 0 as unknown as undefined })

    // Should use default behavior
    expect(mockClient.__mockSearch).toHaveBeenCalled()
  })

  it("handles very large page numbers", async () => {
    mockClient.__mockSearch.mockResolvedValueOnce(createMockMeilisearchResponse([]))

    await searchProducts({ page: 1000, limit: 10 })

    expect(mockClient.__mockSearch).toHaveBeenCalledWith(
      "",
      expect.objectContaining({
        offset: 9990, // (1000 - 1) * 10
      })
    )
  })

  it("handles products without brand", async () => {
    const hitNoBrand = createMockProductHit({ brand: undefined })
    mockClient.__mockSearch.mockResolvedValueOnce(createMockMeilisearchResponse([hitNoBrand]))

    const result = await searchProducts()

    expect(result.products[0].brand).toBeUndefined()
  })

  it("handles products without thumbnail", async () => {
    const hitNoThumbnail = createMockProductHit({ thumbnail: undefined })
    mockClient.__mockSearch.mockResolvedValueOnce(createMockMeilisearchResponse([hitNoThumbnail]))

    const result = await searchProducts()

    expect(result.products[0].thumbnail).toBeUndefined()
  })

  it("handles products with empty variants array", async () => {
    const hitNoVariants = createMockProductHit({ variants: [] })
    mockClient.__mockSearch.mockResolvedValueOnce(createMockMeilisearchResponse([hitNoVariants]))

    const result = await searchProducts()

    expect(result.products[0].variants).toEqual([])
  })
})
