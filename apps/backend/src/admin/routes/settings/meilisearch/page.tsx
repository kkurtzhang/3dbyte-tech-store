import { Container, Heading, Button, toast, Text } from "@medusajs/ui"
import { useMutation } from "@tanstack/react-query"
import { sdk } from "../../../lib/sdk"
import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Header } from "../../../components/header"
import { MagnifyingGlass, ChatBubble } from "@medusajs/icons"

type SyncResponse = {
  message: string
  indexed: number
}

const MeilisearchPage = () => {
  const { mutate, isPending } = useMutation({
    mutationFn: async (): Promise<SyncResponse> => {
      const response = await sdk.client.fetch<SyncResponse>(
        "/admin/meilisearch/sync-products",
        { method: "POST" }
      )
      return response
    },
    onSuccess: (data) => {
      toast.success("Meilisearch sync completed", {
        description: `Successfully indexed ${data.indexed} products`,
      })
    },
    onError: (err) => {
      console.error(err)
      toast.error("Failed to sync products to Meilisearch", {
        description: err instanceof Error ? err.message : "Unknown error",
      })
    },
  })

  const handleSync = () => {
    mutate()
  }

  return (
    <Container>
      <Header
        title="Meilisearch"
        subtitle="Manually trigger a full re-index of all products to Meilisearch."
      />
      <div className="px-6 py-8">
        <div className="flex flex-col gap-y-4">
          <div className="flex items-start gap-x-2">
            <MagnifyingGlass className="mt-0.5" />
            <Text>
              Clicking the button below will sync all products from Medusa to
              Meilisearch, including enriched content from Strapi (if available).
            </Text>
          </div>
          <div className="flex items-start gap-x-2">
            <ChatBubble className="mt-0.5" />
            <Text className="text-ui-fg-subtle">
              Tip: Products are automatically synced when created or updated. Use
              this manual sync to re-index all products after bulk changes or
              Meilisearch configuration updates.
            </Text>
          </div>
          <div className="flex items-start gap-x-2">
            <Text size="small" className="text-ui-fg-subtle">
              This operation may take several minutes depending on the number of
              products in your catalog.
            </Text>
          </div>
          <div className="flex items-start gap-x-2">
            <Button
              variant="primary"
              onClick={handleSync}
              isLoading={isPending}
              disabled={isPending}
            >
              {isPending ? "Syncing..." : "Sync Products to Meilisearch"}
            </Button>
          </div>
        </div>
      </div>
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "Meilisearch",
})

export default MeilisearchPage
