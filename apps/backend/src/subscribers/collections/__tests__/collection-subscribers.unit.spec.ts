jest.mock("../../../workflows/strapi/sync-collection-to-strapi", () => ({
  syncCollectionToStrapiWorkflow: jest.fn(),
}))

jest.mock("../../../workflows/strapi/update-collection-to-strapi", () => ({
  updateCollectionToStrapiWorkflow: jest.fn(),
}))

import collectionCreatedHandler, { config as createdConfig } from "../collection-created"
import collectionUpdatedHandler, { config as updatedConfig } from "../collection-updated"
import collectionDeletedHandler, { config as deletedConfig } from "../collection-deleted"
import { syncCollectionToStrapiWorkflow } from "../../../workflows/strapi/sync-collection-to-strapi"
import { updateCollectionToStrapiWorkflow } from "../../../workflows/strapi/update-collection-to-strapi"
import { STRAPI_MODULE } from "../../../modules/strapi"

describe("collection subscribers", () => {
  const run = jest.fn()
  const deleteCollectionDescription = jest.fn()
  const markCollectionDescriptionDeleted = jest.fn()
  const logger = {
    info: jest.fn(),
    error: jest.fn(),
  }

  const container = {
    resolve: jest.fn(),
  } as any

  beforeEach(() => {
    jest.resetAllMocks()
    ;(syncCollectionToStrapiWorkflow as jest.Mock).mockReturnValue({ run })
    ;(updateCollectionToStrapiWorkflow as jest.Mock).mockReturnValue({ run })
    container.resolve.mockImplementation((name: string) => {
      if (name === "logger") return logger
      if (name === STRAPI_MODULE) {
        return {
          deleteCollectionDescription,
          markCollectionDescriptionDeleted,
        }
      }
      throw new Error(`Unexpected resolve: ${name}`)
    })
  })

  it("subscribes to product-collection.created", () => {
    expect(createdConfig.event).toBe("product-collection.created")
  })

  it("subscribes to product-collection.updated", () => {
    expect(updatedConfig.event).toBe("product-collection.updated")
  })

  it("subscribes to product-collection.deleted", () => {
    expect(deletedConfig.event).toBe("product-collection.deleted")
  })

  it("runs the create workflow for created collections", async () => {
    await collectionCreatedHandler({
      event: { data: { id: "pcol_123" } },
      container,
    } as any)

    expect(syncCollectionToStrapiWorkflow).toHaveBeenCalledWith(container)
    expect(run).toHaveBeenCalledWith({
      input: { id: "pcol_123" },
    })
  })

  it("runs the update workflow for updated collections", async () => {
    await collectionUpdatedHandler({
      event: { data: { id: "pcol_123" } },
      container,
    } as any)

    expect(updateCollectionToStrapiWorkflow).toHaveBeenCalledWith(container)
    expect(run).toHaveBeenCalledWith({
      input: { id: "pcol_123" },
    })
  })

  it("soft deletes the Strapi collection description for deleted collections", async () => {
    await collectionDeletedHandler({
      event: { data: { id: "pcol_123" } },
      container,
    } as any)

    expect(markCollectionDescriptionDeleted).toHaveBeenCalledWith("pcol_123")
  })
})
