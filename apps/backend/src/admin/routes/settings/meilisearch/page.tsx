import { Container, Button, toast, Text, usePrompt } from "@medusajs/ui";
import { useMutation, useQuery } from "@tanstack/react-query";
import { sdk } from "../../../lib/sdk";
import { defineRouteConfig } from "@medusajs/admin-sdk";
import { Header } from "../../../components/header";
import { MagnifyingGlass, ChatBubble } from "@medusajs/icons";

type SyncResponse = {
  message: string;
  indexed: number;
};

type AddressReindexStatus = {
  enabled: boolean;
  status: "idle" | "running" | "completed" | "failed" | "disabled";
  run_id?: string;
  started_at?: string;
  finished_at?: string;
  error?: string;
  message?: string;
  result?: {
    totalRows: number;
    localityRows: number;
    batchesProcessed: number;
    durationMs: number;
    indexName: string;
    localityIndexName: string;
  };
};

const MeilisearchPage = () => {
  const dialog = usePrompt();
  const {
    data: addressStatus,
    refetch: refetchAddressStatus,
  } = useQuery({
    queryKey: ["admin-meilisearch-address-status"],
    queryFn: async (): Promise<AddressReindexStatus> => {
      return sdk.client.fetch<AddressReindexStatus>(
        "/admin/meilisearch/sync-addresses",
      );
    },
    refetchInterval: (query) =>
      query.state.data?.status === "running" ? 10_000 : false,
  });

  const { mutate: mutateAddresses, isPending: isAddressesPending } =
    useMutation({
      mutationFn: async (): Promise<AddressReindexStatus> => {
        const response = await sdk.client.fetch<AddressReindexStatus>(
          "/admin/meilisearch/sync-addresses",
          { method: "POST" },
        );
        return response;
      },
      onSuccess: (data) => {
        void refetchAddressStatus();
        toast.success(data.message || "Address reindex started", {
          description:
            data.status === "running"
              ? "The address and locality indexes are rebuilding in the background."
              : `Current status: ${data.status}`,
        });
      },
      onError: (err) => {
        console.error(err);
        toast.error("Failed to start address reindex", {
          description: err instanceof Error ? err.message : "Unknown error",
        });
      },
    });

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

  const handleSyncAddresses = async () => {
    const userHasConfirmed = await dialog({
      title: "Start address reindex?",
      description:
        "This streams the latest OpenAddresses AU dataset and rebuilds the shared address and locality indexes through temporary indexes. It can take a long time.",
      confirmText: "Start reindex",
      cancelText: "Cancel",
    });

    if (userHasConfirmed) {
      mutateAddresses();
    }
  };

  const handleSyncCategories = () => {
    mutateCategories();
  };

  const handleSyncBrands = () => {
    mutateBrands();
  };

  const isAddressRunning = addressStatus?.status === "running";
  const isAddressDisabled =
    !addressStatus || addressStatus.enabled === false || isAddressRunning;
  const addressButtonLabel = isAddressRunning
    ? "Reindex running..."
    : addressStatus?.enabled === false
      ? "Manual trigger disabled"
      : "Start Address Reindex";

  return (
    <Container>
      <Header
        title="Meilisearch"
        subtitle="Manually trigger full re-index operations to Meilisearch."
      />
      <div className="px-6 py-8">
        {/* Addresses Index Section */}
        <div className="mb-10">
          <div className="border-b border-ui-border-base pb-6">
            <h3 className="text-lg font-semibold mb-4">Addresses Index</h3>
            <div className="flex flex-col gap-y-4">
              <div className="flex items-start gap-x-2">
                <MagnifyingGlass className="mt-0.5" />
                <Text>
                  Clicking the button below will stream the latest
                  OpenAddresses AU dataset into Meilisearch address and
                  locality indexes.
                </Text>
              </div>
              <div className="flex items-start gap-x-2">
                <ChatBubble className="mt-0.5" />
                <Text className="text-ui-fg-subtle">
                  This operation is intended for the shared address index and
                  should only be started when no other address reindex is
                  running.
                </Text>
              </div>
              <div className="flex items-start gap-x-2">
                <Text size="small" className="text-ui-fg-subtle">
                  Manual trigger:{" "}
                  {addressStatus?.enabled ? "enabled" : "disabled"} · Status:{" "}
                  {addressStatus?.status || "loading"}
                </Text>
              </div>
              {addressStatus?.result ? (
                <div className="flex items-start gap-x-2">
                  <Text size="small" className="text-ui-fg-subtle">
                    Last result:{" "}
                    {addressStatus.result.totalRows.toLocaleString()} addresses
                    and{" "}
                    {addressStatus.result.localityRows.toLocaleString()}{" "}
                    localities indexed.
                  </Text>
                </div>
              ) : null}
              {addressStatus?.error ? (
                <div className="flex items-start gap-x-2">
                  <Text size="small" className="text-ui-fg-error">
                    Last error: {addressStatus.error}
                  </Text>
                </div>
              ) : null}
              <div className="flex items-start gap-x-2">
                <Button
                  variant="secondary"
                  onClick={() => void handleSyncAddresses()}
                  isLoading={isAddressesPending}
                  disabled={isAddressesPending || isAddressDisabled}
                >
                  {isAddressesPending ? "Starting..." : addressButtonLabel}
                </Button>
              </div>
            </div>
          </div>
        </div>

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
