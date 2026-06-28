import { POST as intakeDraft } from "../../../integrations/hermes/product-drafts/route"
import * as adminDraftRoutes from "../route"
import { GET as listDrafts } from "../route"
import { GET as getDraft } from "../[id]/route"
import { POST as approveDraft } from "../[id]/approve/route"
import { POST as rejectDraft } from "../[id]/reject/route"
import { POST as importDraft } from "../[id]/import/route"

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
  notificationModule = { createNotifications: jest.fn().mockResolvedValue([]) },
  productModule,
  strapiModule,
}: {
  body?: Record<string, unknown>
  params?: Record<string, string>
  query?: Record<string, unknown>
  token?: string
  draftModule: Record<string, jest.Mock>
  product?: Record<string, unknown> | null
  notificationModule?: Record<string, jest.Mock>
  productModule?: Record<string, jest.Mock>
  strapiModule?: Record<string, jest.Mock>
}) {
  const queryModule = {
    graph: jest.fn().mockResolvedValue({ data: product ? [product] : [] }),
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
        if (key === "product" && productModule) return productModule
        if (key === "strapi" && strapiModule) return strapiModule
        throw new Error(`Unexpected module ${key}`)
      }),
    },
  }
}

const draft = {
  id: "aipd_1",
  status: "needs_review",
  product_id: "prod_123",
  product_handle: "example-petg",
  warnings: [],
  confidence_summary: { overall: 0.9 },
  created_at: "2026-06-28T00:00:00.000Z",
}

describe("AI product draft routes", () => {
  const originalToken = process.env.HERMES_PRODUCT_DRAFT_TOKEN

  beforeEach(() => {
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
    })
    expect(detailRes.json).toHaveBeenCalledWith({
      draft,
      events: [{ id: "evt_1" }],
    })
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

    expect(productModule.updateProducts).toHaveBeenCalled()
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
})
