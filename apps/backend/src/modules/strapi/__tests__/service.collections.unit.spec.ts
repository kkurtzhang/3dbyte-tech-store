import StrapiModuleService, { type SyncCollectionData } from "../service"

describe("StrapiModuleService collection sync", () => {
  const logger = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  } as any

  const baseConfig = {
    apiUrl: "http://localhost:1337",
    apiToken: "test-token",
  }

  beforeEach(() => {
    jest.resetAllMocks()
    global.fetch = jest.fn()
  })

  function createService(config = baseConfig) {
    return new StrapiModuleService({ logger }, config as any)
  }

  const collection: SyncCollectionData = {
    id: "pcol_123",
    title: "Motion Systems",
    handle: "motion-systems",
  }

  it("finds collection descriptions by medusa_collection_id", async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        data: [{ id: 1, documentId: "doc_1", medusa_collection_id: "pcol_123" }],
      }),
    })

    const service = createService()
    const result = await service.findCollectionDescription("pcol_123")

    expect(result).toEqual({
      id: 1,
      documentId: "doc_1",
      medusa_collection_id: "pcol_123",
    })
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining(
        "/api/collections?status=published&filters[medusa_collection_id][$eq]=pcol_123"
      ),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer test-token",
        }),
      })
    )
  })

  it("creates a collection description keyed by medusa_collection_id", async () => {
    const nowSpy = jest
      .spyOn(Date.prototype, "toISOString")
      .mockReturnValue("2026-03-27T00:00:00.000Z")

    ;(global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: [] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: { documentId: "doc_1" } }),
      })

    const service = createService()
    await service.createCollectionDescription(collection)

    expect(global.fetch).toHaveBeenNthCalledWith(
      2,
      "http://localhost:1337/api/collections",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          data: {
            medusa_collection_id: "pcol_123",
            Title: "Motion Systems",
            Handle: "motion-systems",
            last_synced: "2026-03-27T00:00:00.000Z",
            sync_status: "synced",
          },
        }),
      })
    )

    nowSpy.mockRestore()
  })

  it("updates an existing collection description with sync metadata", async () => {
    const nowSpy = jest
      .spyOn(Date.prototype, "toISOString")
      .mockReturnValue("2026-03-27T01:00:00.000Z")

    ;(global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          data: [
            {
              id: 1,
              documentId: "doc_1",
              medusa_collection_id: "pcol_123",
            },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: { documentId: "doc_1" } }),
      })

    const service = createService()
    await service.updateCollectionDescription({
      ...collection,
      title: "Updated Motion Systems",
      handle: "updated-motion-systems",
    })

    expect(global.fetch).toHaveBeenNthCalledWith(
      2,
      "http://localhost:1337/api/collections/doc_1",
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify({
          data: {
            medusa_collection_id: "pcol_123",
            Title: "Updated Motion Systems",
            Handle: "updated-motion-systems",
            last_synced: "2026-03-27T01:00:00.000Z",
            sync_status: "synced",
          },
        }),
      })
    )

    nowSpy.mockRestore()
  })

  it("deletes a collection description by medusa_collection_id", async () => {
    ;(global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          data: [
            {
              id: 1,
              documentId: "doc_1",
              medusa_collection_id: "pcol_123",
            },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 204,
        json: async () => ({}),
        text: async () => "",
      })

    const service = createService()
    await service.deleteCollectionDescription("pcol_123")

    expect(global.fetch).toHaveBeenNthCalledWith(
      2,
      "http://localhost:1337/api/collections/doc_1",
      expect.objectContaining({
        method: "DELETE",
      })
    )
  })

  it("soft deletes the collection description by updating sync metadata only", async () => {
    ;(global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          data: [
            {
              id: 33,
              documentId: "doc_1",
              medusa_collection_id: "pcol_123",
              publishedAt: "2026-03-27T01:00:00.000Z",
            },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          data: [
            {
              id: 19,
              documentId: "doc_1",
              medusa_collection_id: "pcol_123",
              publishedAt: null,
            },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: { documentId: "doc_1" } }),
      })

    const service = createService()
    await service.markCollectionDescriptionDeleted("pcol_123")

    expect(global.fetch).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("/api/collections?status=draft"),
      expect.any(Object)
    )
    expect(global.fetch).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("/api/collections?status=published"),
      expect.any(Object)
    )
    expect(global.fetch).toHaveBeenNthCalledWith(
      3,
      "http://localhost:1337/api/collections/doc_1/unpublish",
      expect.objectContaining({
        method: "POST",
      })
    )
  })

  it("creates a collection description without image and description fields", async () => {
    const nowSpy = jest
      .spyOn(Date.prototype, "toISOString")
      .mockReturnValue("2026-03-27T02:00:00.000Z")

    ;(global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: [] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: { documentId: "doc_2" } }),
      })

    const service = createService({
      apiUrl: "http://localhost:1337",
      apiToken: "test-token",
    })

    await service.createCollectionDescription(collection)

    expect(global.fetch).toHaveBeenNthCalledWith(
      2,
      "http://localhost:1337/api/collections",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          data: {
            medusa_collection_id: "pcol_123",
            Title: "Motion Systems",
            Handle: "motion-systems",
            last_synced: "2026-03-27T02:00:00.000Z",
            sync_status: "synced",
          },
        }),
      })
    )

    nowSpy.mockRestore()
  })

  it("marks a collection description as outdated", async () => {
    const nowSpy = jest
      .spyOn(Date.prototype, "toISOString")
      .mockReturnValue("2026-03-27T03:00:00.000Z")

    ;(global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          data: [
            {
              id: 1,
              documentId: "doc_1",
              medusa_collection_id: "pcol_123",
            },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: { documentId: "doc_1" } }),
      })

    const service = createService()
    await service.markCollectionDescriptionOutdated("pcol_123")

    expect(global.fetch).toHaveBeenNthCalledWith(
      2,
      "http://localhost:1337/api/collections/doc_1",
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify({
          data: {
            sync_status: "outdated",
            last_synced: "2026-03-27T03:00:00.000Z",
          },
        }),
      })
    )

    nowSpy.mockRestore()
  })
})
