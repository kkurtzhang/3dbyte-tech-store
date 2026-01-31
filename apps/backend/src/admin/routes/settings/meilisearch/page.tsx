import { Container, Button, toast, Text } from "@medusajs/ui";
import { useMutation } from "@tanstack/react-query";
import { sdk } from "../../../lib/sdk";
import { defineRouteConfig } from "@medusajs/admin-sdk";
import { Header } from "../../../components/header";
import { MagnifyingGlass, ChatBubble } from "@medusajs/icons";

type SyncResponse = {
  message: string;
  indexed: number;
};

const MeilisearchPage = () => {
  const { mutate: mutateProducts, isPending: isProductsPending } = useMutation({
    mutationFn: async (): Promise<SyncResponse> => {
      const response = await sdk.client.fetch<SyncResponse>(
        "/admin/meilisearch/sync-products",
        { method: "POST" },
      );
      return response;
    },
    onSuccess: (data) => {
      toast.success("Products synced to Meilisearch", {
        description: `Successfully indexed ${data.indexed} products`,
      });
    },
    onError: (err) => {
      console.error(err);
      toast.error("Failed to sync products to Meilisearch", {
        description: err instanceof Error ? err.message : "Unknown error",
      });
    },
  });

  const { mutate: mutateCategories, isPending: isCategoriesPending } =
    useMutation({
      mutationFn: async (): Promise<SyncResponse> => {
        const response = await sdk.client.fetch<SyncResponse>(
          "/admin/meilisearch/sync-categories",
          { method: "POST" },
        );
        return response;
      },
      onSuccess: (data) => {
        toast.success("Meilisearch sync completed", {
          description: `Successfully indexed ${data.indexed} categories`,
        });
      },
      onError: (err) => {
        console.error(err);
        toast.error("Failed to sync categories to Meilisearch", {
          description: err instanceof Error ? err.message : "Unknown error",
        });
      },
    });

  const { mutate: mutateBrands, isPending: isBrandsPending } = useMutation({
    mutationFn: async (): Promise<SyncResponse> => {
      const response = await sdk.client.fetch<SyncResponse>(
        "/admin/meilisearch/sync-brands",
        { method: "POST" },
      );
      return response;
    },
    onSuccess: (data) => {
      toast.success("Brands synced to Meilisearch", {
        description: `Successfully indexed ${data.indexed} brands`,
      });
    },
    onError: (err) => {
      console.error(err);
      toast.error("Failed to sync brands to Meilisearch", {
        description: err instanceof Error ? err.message : "Unknown error",
      });
    },
  });

  const handleSyncProducts = () => {
    mutateProducts();
  };

  const handleSyncCategories = () => {
    mutateCategories();
  };

  const handleSyncBrands = () => {
    mutateBrands();
  };

  return (
    <Container>
      <Header
        title="Meilisearch"
        subtitle="Manually trigger a full re-index of products, categories and brands to Meilisearch."
      />
      <div className="px-6 py-8">
        {/* Products Index Section */}
        <div className="mb-10">
          <div className="border-b border-ui-border-base pb-6">
            <h3 className="text-lg font-semibold mb-4">Products Index</h3>
            <div className="flex flex-col gap-y-4">
              <div className="flex items-start gap-x-2">
                <MagnifyingGlass className="mt-0.5" />
                <Text>
                  Clicking the button below will sync all products from Medusa
                  to Meilisearch, including enriched content from Strapi (if
                  available).
                </Text>
              </div>
              <div className="flex items-start gap-x-2">
                <ChatBubble className="mt-0.5" />
                <Text className="text-ui-fg-subtle">
                  Tip: Products are automatically synced when created or
                  updated. Use this manual sync to re-index all products after
                  bulk changes or Meilisearch configuration updates.
                </Text>
              </div>
              <div className="flex items-start gap-x-2">
                <Text size="small" className="text-ui-fg-subtle">
                  This operation may take several minutes depending on the
                  number of products in your catalog.
                </Text>
              </div>
              <div className="flex items-start gap-x-2">
                <Button
                  variant="secondary"
                  onClick={handleSyncProducts}
                  isLoading={isProductsPending}
                  disabled={isProductsPending}
                >
                  {isProductsPending
                    ? "Syncing..."
                    : "Sync Products to Meilisearch"}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Categories Index Section */}
        <div className="mb-10">
          <div className="border-b border-ui-border-base pb-6">
            <h3 className="text-lg font-semibold mb-4">Categories Index</h3>
            <div className="flex flex-col gap-y-4">
              <div className="flex items-start gap-x-2">
                <MagnifyingGlass className="mt-0.5" />
                <Text>
                  Clicking the button below will sync all categories from Medusa
                  to Meilisearch. Categories help organize products in search
                  results and filtering.
                </Text>
              </div>
              <div className="flex items-start gap-x-2">
                <ChatBubble className="mt-0.5" />
                <Text className="text-ui-fg-subtle">
                  Tip: Categories are automatically synced when created or
                  updated. Use this manual sync to re-index all categories after
                  bulk changes or Meilisearch configuration updates.
                </Text>
              </div>
              <div className="flex items-start gap-x-2">
                <Text size="small" className="text-ui-fg-subtle">
                  This operation may take several seconds depending on the
                  number of categories in your catalog.
                </Text>
              </div>
              <div className="flex items-start gap-x-2">
                <Button
                  variant="secondary"
                  onClick={handleSyncCategories}
                  isLoading={isCategoriesPending}
                  disabled={isCategoriesPending}
                >
                  {isCategoriesPending
                    ? "Syncing..."
                    : "Sync Categories to Meilisearch"}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Brands Index Section */}
        <div className="mb-10">
          <div className="border-b border-ui-border-base pb-6">
            <h3 className="text-lg font-semibold mb-4">Brands Index</h3>
            <div className="flex flex-col gap-y-4">
              <div className="flex items-start gap-x-2">
                <MagnifyingGlass className="mt-0.5" />
                <Text>
                  Clicking the button below will sync all brands from Medusa to
                  Meilisearch. Brands help organize products in search results
                  and filtering.
                </Text>
              </div>
              <div className="flex items-start gap-x-2">
                <ChatBubble className="mt-0.5" />
                <Text className="text-ui-fg-subtle">
                  Tip: Brands are automatically synced when created or updated.
                  Use this manual sync to re-index all brands after bulk changes
                  or Meilisearch configuration updates.
                </Text>
              </div>
              <div className="flex items-start gap-x-2">
                <Text size="small" className="text-ui-fg-subtle">
                  This operation may take several seconds depending on the
                  number of brands in your system.
                </Text>
              </div>
              <div className="flex items-start gap-x-2">
                <Button
                  variant="secondary"
                  onClick={handleSyncBrands}
                  isLoading={isBrandsPending}
                  disabled={isBrandsPending}
                >
                  {isBrandsPending
                    ? "Syncing..."
                    : "Sync Brands to Meilisearch"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Container>
  );
};

export const config = defineRouteConfig({
  label: "Meilisearch",
});

export default MeilisearchPage;
