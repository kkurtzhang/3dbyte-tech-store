const mockCreateProductsRun = jest.fn()
const mockUpdateProductsRun = jest.fn()

jest.mock("@medusajs/medusa/core-flows", () => ({
  createProductsWorkflow: jest.fn(() => ({
    run: mockCreateProductsRun,
  })),
  updateProductsWorkflow: jest.fn(() => ({
    run: mockUpdateProductsRun,
  })),
}))

import { POST as intakeDraft } from "../../../integrations/hermes/product-drafts/route"
import { buildAiProductSnapshotHash } from "../../../../lib/ai-product-drafts/resolution"
import * as adminDraftRoutes from "../route"
import { DELETE as cleanupDrafts, GET as listDrafts } from "../route"
import { GET as exportFailedDrafts } from "../export/route"
import { DELETE as deleteDraft, GET as getDraft } from "../[id]/route"
import { POST as approveDraft } from "../[id]/approve/route"
import { POST as rejectDraft } from "../[id]/reject/route"
import { POST as importDraft } from "../[id]/import/route"
import { POST as resolveDraft } from "../[id]/resolve/route"

const validPacket = {
  packet_version: 1,
  source_agent: "hermes",
  product_id: "prod_123",
  product_handle: "example-petg",
  product_input: {
    brand: "Example",
    product_name: "Example PETG",
    colour: "Black",
    diameter_mm: 1.75,
    spool_weight_g: 1000,
    supplier_url: "https://supplier.example/products/example-petg",
  },
  source_summary: {
    official_product_page: "https://manufacturer.example/example-petg",
    official_tds: "https://manufacturer.example/example-petg-tds.pdf",
    official_sds: "",
    trusted_supplier_pages: [],
  },
  facts: {
    material: {
      value: "PETG",
      source_url: "https://manufacturer.example/example-petg",
      source_type: "official_product_page",
      confidence: 0.96,
    },
    recommended_nozzle_temp_c: {
      min: 230,
      max: 250,
      source_url: "https://manufacturer.example/example-petg-tds.pdf",
      source_type: "official_tds",
      confidence: 0.92,
      warning: "",
    },
    recommended_bed_temp_c: {
      min: 70,
      max: 85,
      source_url: "https://manufacturer.example/example-petg-tds.pdf",
      source_type: "official_tds",
      confidence: 0.9,
      warning: "",
    },
    requires_enclosure: {
      value: false,
      source_url: "https://manufacturer.example/example-petg",
      source_type: "official_product_page",
      confidence: 0.82,
    },
    drying_recommended: {
      value: true,
      source_url: "https://manufacturer.example/example-petg-tds.pdf",
      source_type: "official_tds",
      confidence: 0.88,
    },
  },
  draft_content: {
    short_description: "A source-backed PETG filament draft.",
    feature_bullets: ["1.75 mm PETG filament"],
    seo_title: "Example PETG Filament",
    seo_description: "Example PETG filament for functional 3D prints.",
    ai_search_keywords: ["petg filament"],
  },
  related_content_suggestions: [],
  sources: [
    {
      url: "https://manufacturer.example/example-petg",
      source_type: "manufacturer_official",
      title: "Example PETG",
      retrieved_at: "2026-06-28T00:00:00.000Z",
      notes: "Official product page.",
    },
  ],
  warnings: [],
}

const validV2Packet = {
  ...validPacket,
  packet_version: 2,
  request_id: "hermes:example-petg:2026-07-24",
  requested_operation: "auto",
  product_id: "",
  product_handle: "",
  product_input: {
    ...validPacket.product_input,
    manufacturer_part_number: "EX-PETG-BLK-175-1KG",
    gtin: "",
    supplier_sku: "SUP-123",
  },
}

function createResponse() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  }
}

function createRequest({
  body = {},
  params = {},
  query = {},
  token = "secret",
  draftModule,
  product = { id: "prod_123", handle: "example-petg", title: "Example PETG" },
  products,
  notificationModule = { createNotifications: jest.fn().mockResolvedValue([]) },
  logger = { warn: jest.fn() },
  productModule,
  fulfillmentModule,
  salesChannelModule,
  strapiModule,
}: {
  body?: Record<string, unknown>
  params?: Record<string, string>
  query?: Record<string, unknown>
  token?: string
  draftModule: Record<string, jest.Mock>
  product?: Record<string, unknown> | null
  products?: Record<string, unknown>[]
  notificationModule?: Record<string, jest.Mock>
  logger?: Record<string, jest.Mock>
  productModule?: Record<string, jest.Mock>
  fulfillmentModule?: Record<string, jest.Mock>
  salesChannelModule?: Record<string, jest.Mock>
  strapiModule?: Record<string, jest.Mock>
}) {
  const queryModule = {
    graph: jest
      .fn()
      .mockResolvedValue({ data: products ?? (product ? [product] : []) }),
  }

  return {
    body,
    params,
    query,
    headers: {
      "x-3db-hermes-product-draft-token": token,
    },
    auth_context: {
      actor_id: "user_1",
    },
    scope: {
      resolve: jest.fn((key: string) => {
        if (key === "aiProductDraft") return draftModule
        if (key === "query") return queryModule
        if (key === "notification") return notificationModule
        if (key === "logger") return logger
        if (key === "product" && productModule) return productModule
        if (key === "fulfillment" && fulfillmentModule) return fulfillmentModule
        if (key === "sales_channel" && salesChannelModule) {
          return salesChannelModule
        }
        if (key === "strapi" && strapiModule) return strapiModule
        throw new Error(`Unexpected module ${key}`)
      }),
    },
  }
}

const draft = {
  id: "aipd_1",
  status: "needs_review",
  resolved_operation: "enrich",
  product_id: "prod_123",
  product_handle: "example-petg",
  warnings: [],
  confidence_summary: { overall: 0.9 },
  created_at: "2026-06-28T00:00:00.000Z",
}

describe("AI product draft routes", () => {
  const originalToken = process.env.HERMES_PRODUCT_DRAFT_TOKEN

  beforeEach(() => {
    jest.clearAllMocks()
    mockCreateProductsRun.mockResolvedValue({ result: [] })
    mockUpdateProductsRun.mockResolvedValue({ result: [] })
    process.env.HERMES_PRODUCT_DRAFT_TOKEN = "secret"
  })

  afterEach(() => {
    process.env.HERMES_PRODUCT_DRAFT_TOKEN = originalToken
  })

  it("keeps Hermes intake outside the Admin-authenticated route", () => {
    expect(adminDraftRoutes).not.toHaveProperty("POST")
  })

  it("stores valid Hermes packets as needs_review drafts and notifies Admin", async () => {
    const draftModule = {
      createAiProductDrafts: jest.fn().mockResolvedValue(draft),
      createAiProductDraftEvents: jest.fn().mockResolvedValue({ id: "evt_1" }),
    }
    const notificationModule = {
      createNotifications: jest.fn().mockResolvedValue([{ id: "noti_1" }]),
    }
    const req = createRequest({
      body: validPacket,
      draftModule,
      notificationModule,
    })
    const res = createResponse()

    await intakeDraft(req as never, res as never)

    expect(draftModule.createAiProductDrafts).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "needs_review",
        product_id: "prod_123",
        product_handle: "example-petg",
        raw_packet: expect.objectContaining({ source_agent: "hermes" }),
        normalized_draft: expect.objectContaining({
          metadata: expect.objectContaining({ three_d_printing: expect.any(Object) }),
        }),
      })
    )
    expect(notificationModule.createNotifications).toHaveBeenCalledWith(
      expect.objectContaining({
        channel: "feed",
        template: "admin-ui",
      })
    )
    expect(res.status).toHaveBeenCalledWith(201)
  })

  it("stores a targetless v2 packet as a create draft", async () => {
    const createdDraft = {
      ...draft,
      request_id: validV2Packet.request_id,
      requested_operation: "auto",
      resolved_operation: "create",
      resolution_status: "resolved",
      product_id: null,
      product_handle: null,
    }
    const draftModule = {
      listAiProductDrafts: jest.fn().mockResolvedValue([]),
      createAiProductDrafts: jest.fn().mockResolvedValue(createdDraft),
      createAiProductDraftEvents: jest.fn().mockResolvedValue({ id: "evt_1" }),
    }
    const req = createRequest({
      body: validV2Packet,
      draftModule,
      product: null,
    })
    const res = createResponse()

    await intakeDraft(req as never, res as never)

    expect(draftModule.createAiProductDrafts).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "needs_review",
        request_id: validV2Packet.request_id,
        requested_operation: "auto",
        resolved_operation: "create",
        resolution_status: "resolved",
        identity_candidates: [],
        product_id: null,
        product_handle: null,
      })
    )
    expect(res.status).toHaveBeenCalledWith(201)
  })

  it("returns the existing draft for a duplicate v2 request id", async () => {
    const existingDraft = {
      ...draft,
      request_id: validV2Packet.request_id,
      resolved_operation: "create",
    }
    const draftModule = {
      listAiProductDrafts: jest.fn().mockResolvedValue([existingDraft]),
      createAiProductDrafts: jest.fn(),
      createAiProductDraftEvents: jest.fn(),
    }
    const req = createRequest({
      body: validV2Packet,
      draftModule,
      product: null,
    })
    const res = createResponse()

    await intakeDraft(req as never, res as never)

    expect(draftModule.createAiProductDrafts).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith({
      draft: existingDraft,
      duplicate: true,
    })
  })

  it("recovers the existing draft when concurrent v2 intake wins the unique key", async () => {
    const existingDraft = {
      ...draft,
      request_id: validV2Packet.request_id,
      resolved_operation: "create",
    }
    const duplicateError = Object.assign(new Error("duplicate key"), {
      code: "23505",
    })
    const draftModule = {
      listAiProductDrafts: jest
        .fn()
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([existingDraft]),
      createAiProductDrafts: jest.fn().mockRejectedValue(duplicateError),
      createAiProductDraftEvents: jest.fn(),
    }
    const req = createRequest({
      body: validV2Packet,
      draftModule,
      product: null,
    })
    const res = createResponse()

    await intakeDraft(req as never, res as never)

    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith({
      draft: existingDraft,
      duplicate: true,
    })
    expect(draftModule.createAiProductDraftEvents).not.toHaveBeenCalled()
  })

  it("requires admin resolution when a create request matches a product", async () => {
    const resolutionDraft = {
      ...draft,
      status: "needs_resolution",
      resolved_operation: null,
      resolution_status: "needs_resolution",
    }
    const draftModule = {
      listAiProductDrafts: jest.fn().mockResolvedValue([]),
      createAiProductDrafts: jest.fn().mockResolvedValue(resolutionDraft),
      createAiProductDraftEvents: jest.fn().mockResolvedValue({ id: "evt_1" }),
    }
    const req = createRequest({
      body: {
        ...validV2Packet,
        requested_operation: "create",
      },
      draftModule,
      products: [
        {
          id: "prod_123",
          handle: "example-petg",
          title: "Example PETG",
          metadata: {},
        },
      ],
    })
    const res = createResponse()

    await intakeDraft(req as never, res as never)

    expect(draftModule.createAiProductDrafts).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "needs_resolution",
        resolved_operation: null,
        resolution_status: "needs_resolution",
        identity_candidates: [
          expect.objectContaining({
            id: "prod_123",
            handle: "example-petg",
          }),
        ],
      })
    )
  })

  it("stores targetless v1 packets as actionable validation failures", async () => {
    const invalidDraft = {
      ...draft,
      status: "validation_failed",
    }
    const draftModule = {
      createAiProductDrafts: jest.fn().mockResolvedValue(invalidDraft),
      createAiProductDraftEvents: jest.fn().mockResolvedValue({ id: "evt_1" }),
    }
    const req = createRequest({
      body: {
        ...validPacket,
        product_id: "",
        product_handle: "",
      },
      draftModule,
      product: null,
    })
    const res = createResponse()

    await intakeDraft(req as never, res as never)

    expect(draftModule.createAiProductDrafts).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "validation_failed",
        validation_errors: [
          expect.objectContaining({
            path: "product",
            message: expect.stringContaining("packet_version 2"),
          }),
        ],
      })
    )
  })

  it("keeps Hermes intake successful when Admin feed notifications are unavailable", async () => {
    const draftModule = {
      createAiProductDrafts: jest.fn().mockResolvedValue(draft),
      createAiProductDraftEvents: jest.fn().mockResolvedValue({ id: "evt_1" }),
    }
    const notificationModule = {
      createNotifications: jest.fn().mockRejectedValue(
        new Error(
          "Could not find a notification provider for channel: feed for notification id noti_1"
        )
      ),
    }
    const logger = {
      warn: jest.fn(),
    }
    const req = createRequest({
      body: validPacket,
      draftModule,
      logger,
      notificationModule,
    })
    const res = createResponse()

    await intakeDraft(req as never, res as never)

    expect(draftModule.createAiProductDrafts).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "needs_review",
        raw_packet: expect.objectContaining({ source_agent: "hermes" }),
      })
    )
    expect(notificationModule.createNotifications).toHaveBeenCalledWith(
      expect.objectContaining({
        channel: "feed",
        template: "admin-ui",
      })
    )
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining("AI product draft Admin notification failed")
    )
    expect(res.status).toHaveBeenCalledWith(201)
  })

  it("persists invalid packets as validation_failed drafts", async () => {
    const draftModule = {
      createAiProductDrafts: jest.fn().mockResolvedValue({
        ...draft,
        status: "validation_failed",
      }),
      createAiProductDraftEvents: jest.fn().mockResolvedValue({ id: "evt_1" }),
    }
    const req = createRequest({
      body: { ...validPacket, packet_version: 999 },
      draftModule,
    })
    const res = createResponse()

    await intakeDraft(req as never, res as never)

    expect(draftModule.createAiProductDrafts).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "validation_failed",
        validation_errors: expect.any(Array),
      })
    )
    expect(res.status).toHaveBeenCalledWith(201)
  })

  it("rejects unauthorised Hermes intake without creating a draft", async () => {
    const draftModule = {
      createAiProductDrafts: jest.fn(),
      createAiProductDraftEvents: jest.fn(),
    }
    const req = createRequest({
      body: validPacket,
      token: "wrong",
      draftModule,
    })
    const res = createResponse()

    await intakeDraft(req as never, res as never)

    expect(draftModule.createAiProductDrafts).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(401)
  })

  it("rejects parsed packets over the configured payload limit", async () => {
    const originalLimit = process.env.AI_PRODUCT_DRAFT_MAX_BYTES
    process.env.AI_PRODUCT_DRAFT_MAX_BYTES = "10"
    const draftModule = {
      createAiProductDrafts: jest.fn(),
      createAiProductDraftEvents: jest.fn(),
    }
    const req = createRequest({
      body: validPacket,
      draftModule,
    })
    const res = createResponse()

    try {
      await intakeDraft(req as never, res as never)
    } finally {
      process.env.AI_PRODUCT_DRAFT_MAX_BYTES = originalLimit
    }

    expect(draftModule.createAiProductDrafts).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(413)
  })

  it("lists and retrieves drafts with events", async () => {
    const draftModule = {
      listAiProductDrafts: jest.fn().mockResolvedValue([draft]),
      listAiProductDraftEvents: jest.fn().mockResolvedValue([{ id: "evt_1" }]),
    }
    const listReq = createRequest({
      query: { status: "needs_review", limit: "10", offset: "0" },
      draftModule,
    })
    const detailReq = createRequest({
      params: { id: "aipd_1" },
      draftModule,
    })
    const listRes = createResponse()
    const detailRes = createResponse()

    await listDrafts(listReq as never, listRes as never)
    await getDraft(detailReq as never, detailRes as never)

    expect(listRes.json).toHaveBeenCalledWith({
      drafts: [draft],
      count: 1,
      limit: 10,
      offset: 0,
      status_counts: {
        needs_review: 1,
      },
    })
    expect(detailRes.json).toHaveBeenCalledWith({
      draft,
      events: [{ id: "evt_1" }],
    })
  })

  it("finds a draft by its submitted product name", async () => {
    const titleOnlyDraft = {
      ...draft,
      id: "aipd_title_only",
      product_id: null,
      product_handle: null,
      product_input: {
        product_name: "Polymaker PolyLite PETG",
      },
    }
    const draftModule = {
      listAiProductDrafts: jest.fn().mockResolvedValue([titleOnlyDraft]),
    }
    const req = createRequest({
      query: { q: "polylite", limit: "10", offset: "0" },
      draftModule,
    })
    const res = createResponse()

    await listDrafts(req as never, res as never)

    expect(res.json).toHaveBeenCalledWith({
      drafts: [titleOnlyDraft],
      count: 1,
      limit: 10,
      offset: 0,
      status_counts: {
        needs_review: 1,
      },
    })
  })

  it("sorts drafts before pagination and returns queue counts", async () => {
    const drafts = [
      {
        ...draft,
        id: "aipd_new",
        created_at: "2026-07-02T00:00:00.000Z",
      },
      {
        ...draft,
        id: "aipd_failed",
        status: "validation_failed",
        created_at: "2026-07-03T00:00:00.000Z",
      },
      {
        ...draft,
        id: "aipd_old",
        created_at: "2026-07-01T00:00:00.000Z",
      },
    ]
    const draftModule = {
      listAiProductDrafts: jest.fn().mockResolvedValue(drafts),
    }
    const req = createRequest({
      query: {
        status: "needs_review",
        order: "created_at",
        limit: "1",
        offset: "0",
      },
      draftModule,
    })
    const res = createResponse()

    await listDrafts(req as never, res as never)

    expect(res.json).toHaveBeenCalledWith({
      drafts: [expect.objectContaining({ id: "aipd_old" })],
      count: 2,
      limit: 1,
      offset: 0,
      status_counts: {
        needs_review: 2,
        validation_failed: 1,
      },
    })
  })

  it("rejects unsupported draft sort fields", async () => {
    const draftModule = {
      listAiProductDrafts: jest.fn(),
    }
    const req = createRequest({
      query: { order: "approved_by" },
      draftModule,
    })
    const res = createResponse()

    await listDrafts(req as never, res as never)

    expect(draftModule.listAiProductDrafts).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({
      error: expect.stringContaining("Unsupported AI product draft order"),
    })
  })

  it("soft-deletes a validation-failed draft without touching product data", async () => {
    const failedDraft = {
      ...draft,
      status: "validation_failed",
    }
    const draftModule = {
      listAiProductDrafts: jest.fn().mockResolvedValue([failedDraft]),
      softDeleteAiProductDrafts: jest.fn().mockResolvedValue([failedDraft.id]),
    }
    const req = createRequest({
      params: { id: failedDraft.id },
      draftModule,
    })
    const res = createResponse()

    await deleteDraft(req as never, res as never)

    expect(draftModule.softDeleteAiProductDrafts).toHaveBeenCalledWith(
      failedDraft.id
    )
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith({
      id: failedDraft.id,
      deleted: true,
    })
  })

  it("protects reviewable and imported drafts from cleanup", async () => {
    for (const status of ["needs_review", "approved", "imported"]) {
      const protectedDraft = { ...draft, status }
      const draftModule = {
        listAiProductDrafts: jest.fn().mockResolvedValue([protectedDraft]),
        softDeleteAiProductDrafts: jest.fn(),
      }
      const req = createRequest({
        params: { id: protectedDraft.id },
        draftModule,
      })
      const res = createResponse()

      await deleteDraft(req as never, res as never)

      expect(draftModule.softDeleteAiProductDrafts).not.toHaveBeenCalled()
      expect(res.status).toHaveBeenCalledWith(409)
    }
  })

  it("bulk-cleans validation failures only when the confirmed count is current", async () => {
    const failedDrafts = [
      { ...draft, id: "aipd_failed_1", status: "validation_failed" },
      { ...draft, id: "aipd_failed_2", status: "validation_failed" },
    ]
    const draftModule = {
      listAiProductDrafts: jest.fn().mockResolvedValue(failedDrafts),
      createAiProductDraftEvents: jest.fn().mockResolvedValue([]),
      softDeleteAiProductDrafts: jest
        .fn()
        .mockResolvedValue(failedDrafts.map(({ id }) => id)),
    }
    const req = createRequest({
      body: {
        status: "validation_failed",
        expected_count: failedDrafts.length,
      },
      draftModule,
    })
    const res = createResponse()

    await cleanupDrafts(req as never, res as never)

    expect(draftModule.listAiProductDrafts).toHaveBeenCalledWith(
      { status: "validation_failed" },
      expect.objectContaining({ take: 501 })
    )
    expect(draftModule.createAiProductDraftEvents).toHaveBeenCalledWith([
      expect.objectContaining({
        draft_id: "aipd_failed_1",
        type: "cleanup_requested",
        actor_type: "admin",
        actor_id: "user_1",
        from_status: "validation_failed",
        to_status: "validation_failed",
        metadata: expect.objectContaining({
          action: "soft_delete",
          bulk: true,
          expected_count: 2,
        }),
      }),
      expect.objectContaining({
        draft_id: "aipd_failed_2",
        type: "cleanup_requested",
      }),
    ])
    expect(
      draftModule.createAiProductDraftEvents.mock.invocationCallOrder[0]
    ).toBeLessThan(
      draftModule.softDeleteAiProductDrafts.mock.invocationCallOrder[0]
    )
    expect(draftModule.softDeleteAiProductDrafts).toHaveBeenCalledWith([
      "aipd_failed_1",
      "aipd_failed_2",
    ])
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith({
      count: 2,
      deleted_ids: ["aipd_failed_1", "aipd_failed_2"],
    })
  })

  it("exports the bounded validation-failed queue before cleanup", async () => {
    const failedDrafts = [
      {
        ...draft,
        id: "aipd_failed_1",
        status: "validation_failed",
        packet_version: 1,
        source_agent: "hermes",
        raw_packet: { product_input: { product_name: "Legacy draft" } },
        validation_errors: [{ path: "product_input", message: "Invalid" }],
      },
      {
        ...draft,
        id: "aipd_failed_2",
        status: "validation_failed",
        packet_version: 1,
        source_agent: "hermes",
        raw_packet: { product_input: { product_name: "Another draft" } },
        validation_errors: [{ path: "sources.0", message: "Invalid date" }],
      },
    ]
    const draftModule = {
      listAiProductDrafts: jest.fn().mockResolvedValue(failedDrafts),
    }
    const req = createRequest({
      query: {
        status: "validation_failed",
        expected_count: String(failedDrafts.length),
      },
      draftModule,
    })
    const res = createResponse()

    await exportFailedDrafts(req as never, res as never)

    expect(draftModule.listAiProductDrafts).toHaveBeenCalledWith(
      { status: "validation_failed" },
      expect.objectContaining({ take: 501 })
    )
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        export_version: 1,
        status: "validation_failed",
        count: 2,
        exported_at: expect.any(String),
        drafts: [
          expect.objectContaining({
            id: "aipd_failed_1",
            raw_packet: failedDrafts[0].raw_packet,
            validation_errors: failedDrafts[0].validation_errors,
          }),
          expect.objectContaining({
            id: "aipd_failed_2",
            raw_packet: failedDrafts[1].raw_packet,
            validation_errors: failedDrafts[1].validation_errors,
          }),
        ],
      })
    )
  })

  it("refuses an export when the validation-failed queue changes", async () => {
    const draftModule = {
      listAiProductDrafts: jest.fn().mockResolvedValue([
        { ...draft, id: "aipd_failed_1", status: "validation_failed" },
        { ...draft, id: "aipd_failed_2", status: "validation_failed" },
      ]),
    }
    const req = createRequest({
      query: { status: "validation_failed", expected_count: "1" },
      draftModule,
    })
    const res = createResponse()

    await exportFailedDrafts(req as never, res as never)

    expect(res.status).toHaveBeenCalledWith(409)
    expect(res.json).toHaveBeenCalledWith({
      error: expect.stringContaining("changed"),
    })
  })

  it("rejects an unbounded or actionable export request", async () => {
    const draftModule = {
      listAiProductDrafts: jest.fn(),
    }
    const req = createRequest({
      query: { status: "needs_review", expected_count: "501" },
      draftModule,
    })
    const res = createResponse()

    await exportFailedDrafts(req as never, res as never)

    expect(draftModule.listAiProductDrafts).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({
      error: expect.stringContaining("validation_failed"),
    })
  })

  it("refuses bulk cleanup when the queue changes after confirmation", async () => {
    const draftModule = {
      listAiProductDrafts: jest.fn().mockResolvedValue([
        { ...draft, id: "aipd_failed_1", status: "validation_failed" },
        { ...draft, id: "aipd_failed_2", status: "validation_failed" },
      ]),
      softDeleteAiProductDrafts: jest.fn(),
    }
    const req = createRequest({
      body: {
        status: "validation_failed",
        expected_count: 1,
      },
      draftModule,
    })
    const res = createResponse()

    await cleanupDrafts(req as never, res as never)

    expect(draftModule.softDeleteAiProductDrafts).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(409)
    expect(res.json).toHaveBeenCalledWith({
      error: expect.stringContaining("changed"),
    })
  })

  it("rejects attempts to bulk-clean actionable statuses", async () => {
    const draftModule = {
      listAiProductDrafts: jest.fn(),
      softDeleteAiProductDrafts: jest.fn(),
    }
    const req = createRequest({
      body: {
        status: "needs_review",
        expected_count: 1,
      },
      draftModule,
    })
    const res = createResponse()

    await cleanupDrafts(req as never, res as never)

    expect(draftModule.listAiProductDrafts).not.toHaveBeenCalled()
    expect(draftModule.softDeleteAiProductDrafts).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it("approves and rejects reviewable drafts with audit events", async () => {
    const draftModule = {
      listAiProductDrafts: jest.fn().mockResolvedValue([draft]),
      updateAiProductDrafts: jest.fn().mockResolvedValue({
        ...draft,
        status: "approved",
      }),
      createAiProductDraftEvents: jest.fn().mockResolvedValue({ id: "evt_1" }),
    }
    const approveReq = createRequest({
      body: { notes: "Looks good" },
      params: { id: "aipd_1" },
      draftModule,
    })
    const rejectReq = createRequest({
      body: { reason: "Wrong product" },
      params: { id: "aipd_1" },
      draftModule: {
        ...draftModule,
        updateAiProductDrafts: jest.fn().mockResolvedValue({
          ...draft,
          status: "rejected",
        }),
      },
    })
    const approveRes = createResponse()
    const rejectRes = createResponse()

    await approveDraft(approveReq as never, approveRes as never)
    await rejectDraft(rejectReq as never, rejectRes as never)

    expect(draftModule.updateAiProductDrafts).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "aipd_1",
        status: "approved",
        approved_by: "user_1",
      })
    )
    expect(rejectRes.status).toHaveBeenCalledWith(200)
  })

  it("refuses approval until a draft operation is resolved", async () => {
    const unresolvedDraft = {
      ...draft,
      resolved_operation: null,
    }
    const draftModule = {
      listAiProductDrafts: jest.fn().mockResolvedValue([unresolvedDraft]),
      updateAiProductDrafts: jest.fn(),
      createAiProductDraftEvents: jest.fn(),
    }
    const req = createRequest({
      body: {},
      params: { id: unresolvedDraft.id },
      draftModule,
    })
    const res = createResponse()

    await approveDraft(req as never, res as never)

    expect(draftModule.updateAiProductDrafts).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(409)
    expect(res.json).toHaveBeenCalledWith({
      error: expect.stringContaining("no resolved operation"),
    })
  })

  it("resolves an ambiguous draft to an existing product before review", async () => {
    const candidate = {
      id: "prod_123",
      handle: "example-petg",
      title: "Example PETG",
      metadata: {},
    }
    const ambiguousDraft = {
      ...draft,
      status: "needs_resolution",
      identity_candidates: [candidate],
      normalized_draft: {
        metadata: {},
        claim_evidence: [],
        target_product: {},
      },
    }
    const draftModule = {
      listAiProductDrafts: jest.fn().mockResolvedValue([ambiguousDraft]),
      updateAiProductDrafts: jest.fn().mockResolvedValue({
        ...ambiguousDraft,
        status: "needs_review",
        product_id: candidate.id,
      }),
      createAiProductDraftEvents: jest.fn().mockResolvedValue({ id: "evt_1" }),
    }
    const req = createRequest({
      body: { operation: "enrich", product_id: candidate.id },
      params: { id: "aipd_1" },
      draftModule,
    })
    const res = createResponse()

    await resolveDraft(req as never, res as never)

    expect(draftModule.updateAiProductDrafts).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "aipd_1",
        status: "needs_review",
        resolved_operation: "enrich",
        resolution_status: "resolved",
        product_id: "prod_123",
        product_handle: "example-petg",
        snapshot_hash: expect.any(String),
      })
    )
    expect(res.status).toHaveBeenCalledWith(200)
  })

  it("refreshes the product snapshot while resolving a stored candidate", async () => {
    const ambiguousDraft = {
      ...draft,
      status: "needs_resolution",
      identity_candidates: [
        {
          id: "prod_123",
          handle: "example-petg",
          title: "Example PETG",
          metadata: {
            three_d_printing: { material: "PLA" },
          },
        },
      ],
      normalized_draft: {
        metadata: {},
        claim_evidence: [],
        target_product: {},
      },
    }
    const draftModule = {
      listAiProductDrafts: jest.fn().mockResolvedValue([ambiguousDraft]),
      updateAiProductDrafts: jest.fn().mockImplementation(async (input) => input),
      createAiProductDraftEvents: jest.fn().mockResolvedValue({ id: "evt_1" }),
    }
    const req = createRequest({
      body: { operation: "enrich", product_id: "prod_123" },
      params: { id: "aipd_1" },
      draftModule,
      product: {
        id: "prod_123",
        handle: "example-petg",
        title: "Example PETG",
        metadata: {
          three_d_printing: { material: "PETG" },
        },
      },
    })
    const res = createResponse()

    await resolveDraft(req as never, res as never)

    expect(draftModule.updateAiProductDrafts).toHaveBeenCalledWith(
      expect.objectContaining({
        current_snapshot: expect.objectContaining({
          metadata: {
            three_d_printing: { material: "PETG" },
          },
        }),
      })
    )
  })

  it("binds approval to reviewed changes and import targets", async () => {
    const reviewDraft = {
      ...draft,
      snapshot_hash: "snapshot_1",
      proposed_changes: [
        {
          path: "metadata.three_d_printing.material",
          default_selected: true,
        },
        {
          path: "metadata.three_d_printing.diameter_mm",
          default_selected: false,
        },
      ],
    }
    const draftModule = {
      listAiProductDrafts: jest.fn().mockResolvedValue([reviewDraft]),
      updateAiProductDrafts: jest.fn().mockResolvedValue({
        ...reviewDraft,
        status: "approved",
      }),
      createAiProductDraftEvents: jest.fn().mockResolvedValue({ id: "evt_1" }),
    }
    const req = createRequest({
      body: {
        notes: "Use only reviewed material metadata.",
        selected_change_paths: ["metadata.three_d_printing.material"],
        import_targets: {
          medusa_metadata: true,
          strapi_description_draft: false,
          product_document_drafts: false,
        },
        snapshot_hash: "snapshot_1",
      },
      params: { id: "aipd_1" },
      draftModule,
    })
    const res = createResponse()

    await approveDraft(req as never, res as never)

    expect(draftModule.updateAiProductDrafts).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "aipd_1",
        approved_changes: [
          expect.objectContaining({
            path: "metadata.three_d_printing.material",
          }),
        ],
        approved_import_targets: {
          medusa_metadata: true,
          strapi_description_draft: false,
          product_document_drafts: false,
        },
        approved_snapshot_hash: "snapshot_1",
      })
    )
  })

  it("rejects an enrichment approval with no selected work", async () => {
    const reviewDraft = {
      ...draft,
      resolved_operation: "enrich",
      proposed_changes: [],
    }
    const draftModule = {
      listAiProductDrafts: jest.fn().mockResolvedValue([reviewDraft]),
      updateAiProductDrafts: jest.fn(),
      createAiProductDraftEvents: jest.fn(),
    }
    const req = createRequest({
      body: {
        selected_change_paths: [],
        import_targets: {
          medusa_metadata: false,
          strapi_description_draft: false,
          product_document_drafts: false,
        },
      },
      params: { id: "aipd_1" },
      draftModule,
    })
    const res = createResponse()

    await approveDraft(req as never, res as never)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(draftModule.updateAiProductDrafts).not.toHaveBeenCalled()
  })

  it("blocks import until a draft is approved", async () => {
    const draftModule = {
      listAiProductDrafts: jest.fn().mockResolvedValue([draft]),
      updateAiProductDrafts: jest.fn(),
      createAiProductDraftEvents: jest.fn(),
    }
    const req = createRequest({
      params: { id: "aipd_1" },
      draftModule,
    })
    const res = createResponse()

    await importDraft(req as never, res as never)

    expect(draftModule.updateAiProductDrafts).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(409)
  })

  it("imports approved drafts through the guarded import helper", async () => {
    const approvedDraft = {
      ...draft,
      status: "approved",
      approved_snapshot_hash: buildAiProductSnapshotHash({
        id: "prod_123",
        title: "Example PETG",
        handle: "example-petg",
        metadata: { legacy_flag: true },
      }),
      normalized_draft: {
        schema_version: 1,
        target_product: {
          product_id: "prod_123",
          product_handle: "example-petg",
        },
        metadata: {
          ai_core: {
            schema_version: 1,
            product_kind: "filament",
          },
        },
        content_draft: {
          short_description: "Source backed PETG.",
          feature_bullets: [],
          seo_title: "Example PETG",
          seo_description: "Source backed PETG.",
          ai_search_keywords: [],
        },
        related_content_suggestions: [],
        product_document_suggestions: [],
        claim_evidence: [],
        warnings: [],
        confidence_summary: {
          overall: 0.9,
          metadata: 0.9,
          content: 0.8,
          documents: 0,
        },
      },
    }
    const draftModule = {
      listAiProductDrafts: jest.fn().mockResolvedValue([approvedDraft]),
      updateAiProductDrafts: jest.fn().mockResolvedValue({
        ...approvedDraft,
        status: "imported",
      }),
      createAiProductDraftEvents: jest.fn().mockResolvedValue({ id: "evt_1" }),
    }
    const productModule = {
      listProducts: jest.fn().mockResolvedValue([
        {
          id: "prod_123",
          title: "Example PETG",
          handle: "example-petg",
          metadata: { legacy_flag: true },
        },
      ]),
      updateProducts: jest.fn().mockResolvedValue({ id: "prod_123" }),
    }
    const strapiModule = {
      upsertAiProductDescriptionDraft: jest.fn().mockResolvedValue({ id: 1 }),
      upsertAiProductDocumentDrafts: jest.fn().mockResolvedValue([]),
    }
    const req = createRequest({
      params: { id: "aipd_1" },
      draftModule,
      productModule,
      strapiModule,
    })
    const res = createResponse()

    await importDraft(req as never, res as never)

    expect(mockUpdateProductsRun).toHaveBeenCalled()
    expect(strapiModule.upsertAiProductDescriptionDraft).toHaveBeenCalled()
    expect(draftModule.updateAiProductDrafts).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "aipd_1",
        status: "imported",
        import_summary: expect.objectContaining({
          imported_targets: expect.arrayContaining(["medusa_metadata"]),
        }),
      })
    )
  })

  it("checkpoints a created product before continuing external imports", async () => {
    const approvedDraft = {
      ...draft,
      status: "approved",
      product_id: null,
      product_handle: null,
      resolved_operation: "create",
      product_input: {
        product_name: "Example PETG",
      },
      approved_changes: [],
      approved_import_targets: {
        medusa_metadata: true,
        strapi_description_draft: false,
        product_document_drafts: false,
      },
      normalized_draft: {
        schema_version: 1,
        target_product: {
          product_title: "Example PETG",
        },
        metadata: {},
        content_draft: {
          short_description: "Source backed PETG.",
          feature_bullets: [],
          seo_title: "Example PETG",
          seo_description: "Source backed PETG.",
          ai_search_keywords: [],
        },
        related_content_suggestions: [],
        product_document_suggestions: [],
        claim_evidence: [],
        warnings: [],
        confidence_summary: {
          overall: 0.9,
          metadata: 0.9,
          content: 0.8,
          documents: 0,
        },
      },
    }
    mockCreateProductsRun.mockResolvedValue({
      result: [
        {
          id: "prod_created",
          title: "Example PETG",
          handle: "example-petg-created",
          metadata: {},
        },
      ],
    })
    const draftModule = {
      listAiProductDrafts: jest.fn().mockResolvedValue([approvedDraft]),
      updateAiProductDrafts: jest.fn().mockImplementation(async (input) => ({
        ...approvedDraft,
        ...input,
      })),
      createAiProductDraftEvents: jest.fn().mockResolvedValue({ id: "evt_1" }),
    }
    const req = createRequest({
      params: { id: "aipd_1" },
      draftModule,
      productModule: {
        listProducts: jest.fn(),
      },
      fulfillmentModule: {
        listShippingProfiles: jest
          .fn()
          .mockResolvedValue([{ id: "sp_default" }]),
      },
      salesChannelModule: {
        listSalesChannels: jest
          .fn()
          .mockResolvedValue([{ id: "sc_web", name: "Web Store" }]),
      },
    })
    const res = createResponse()

    await importDraft(req as never, res as never)

    expect(draftModule.updateAiProductDrafts).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "aipd_1",
        product_id: "prod_created",
        product_handle: "example-petg-created",
        import_progress: expect.objectContaining({
          medusa_product: expect.objectContaining({
            status: "completed",
            product_id: "prod_created",
          }),
        }),
      })
    )
    expect(draftModule.updateAiProductDrafts).toHaveBeenLastCalledWith(
      expect.objectContaining({
        status: "imported",
        product_id: "prod_created",
        product_handle: "example-petg-created",
      })
    )
  })
})
