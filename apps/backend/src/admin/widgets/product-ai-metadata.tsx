import { PencilSquare } from "@medusajs/icons";
import { defineWidgetConfig } from "@medusajs/admin-sdk";
import type { AdminProduct, DetailWidgetProps } from "@medusajs/framework/types";
import {
  Badge,
  Button,
  Container,
  Drawer,
  Heading,
  toast,
  usePrompt,
} from "@medusajs/ui";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";

import { ActionMenu } from "../components/action-menu";
import {
  AiCoreSection,
  RcModelBuildingSection,
  ThreeDPrintingSection,
} from "../components/ai-product-metadata-sections";
import { SectionRow } from "../components/section-row";
import {
  buildAiProductMetadataFormState,
  buildAiProductMetadataUpdatePayload,
  type AiProductMetadataFormState,
} from "../lib/ai-product-metadata";
import { sdk } from "../lib/sdk";

type AdminProductWithMetadata = AdminProduct & {
  metadata?: Record<string, unknown> | null;
};

type ProductResponse = {
  product: AdminProductWithMetadata;
};

const productMetadataQueryKey = (productId: string) => [
  "admin-product-ai-metadata",
  productId,
];

const getMetadata = (product?: AdminProductWithMetadata | null) =>
  product?.metadata && typeof product.metadata === "object"
    ? product.metadata
    : {};

const lineCount = (value: string) =>
  value
    .split(/\n+/)
    .map((item) => item.trim())
    .filter(Boolean).length;

const listSummary = (value: string) => {
  const count = lineCount(value);
  return count === 0 ? "-" : `${count} item${count === 1 ? "" : "s"}`;
};

const enabledCount = (state: AiProductMetadataFormState) =>
  [state.aiCore.enabled, state.threeDPrinting.enabled, state.rcModelBuilding.enabled].filter(Boolean).length;

const ProductAiMetadataWidget = ({
  data: product,
}: DetailWidgetProps<AdminProduct>) => {
  const [open, setOpen] = useState(false);
  const [formState, setFormState] = useState<AiProductMetadataFormState>(() =>
    buildAiProductMetadataFormState((product as AdminProductWithMetadata).metadata),
  );
  const [isSaving, setIsSaving] = useState(false);
  const dialog = usePrompt();
  const queryClient = useQueryClient();

  const { data } = useQuery<ProductResponse>({
    queryKey: productMetadataQueryKey(product.id),
    queryFn: () =>
      sdk.client.fetch<ProductResponse>(
        `/admin/products/${product.id}?fields=id,title,metadata`,
      ),
  });

  const productMetadata = useMemo(
    () => getMetadata(data?.product ?? (product as AdminProductWithMetadata)),
    [data?.product, product],
  );
  const persistedState = useMemo(
    () => buildAiProductMetadataFormState(productMetadata),
    [productMetadata],
  );
  const dirty =
    JSON.stringify(formState) !== JSON.stringify(persistedState);

  useEffect(() => {
    if (!open) {
      setFormState(persistedState);
    }
  }, [open, persistedState]);

  const updateAiCore = (
    patch: Partial<AiProductMetadataFormState["aiCore"]>,
  ) => {
    setFormState((current) => ({
      ...current,
      aiCore: { ...current.aiCore, ...patch },
    }));
  };

  const updateThreeDPrinting = (
    patch: Partial<AiProductMetadataFormState["threeDPrinting"]>,
  ) => {
    setFormState((current) => ({
      ...current,
      threeDPrinting: { ...current.threeDPrinting, ...patch },
    }));
  };

  const updateRcModelBuilding = (
    patch: Partial<AiProductMetadataFormState["rcModelBuilding"]>,
  ) => {
    setFormState((current) => ({
      ...current,
      rcModelBuilding: { ...current.rcModelBuilding, ...patch },
    }));
  };

  const handleOpenChange = async (nextOpen: boolean) => {
    if (!nextOpen && dirty) {
      const confirmed = await dialog({
        title: "Discard AI metadata changes?",
        description: "You have unsaved AI-ready metadata changes.",
      });

      if (!confirmed) {
        return;
      }

      setFormState(persistedState);
    }

    setOpen(nextOpen);
  };

  const handleSave = async () => {
    setIsSaving(true);

    try {
      const payload = buildAiProductMetadataUpdatePayload(
        productMetadata,
        formState,
      );

      await sdk.client.fetch(`/admin/products/${product.id}`, {
        method: "POST",
        body: payload,
      });
      await queryClient.invalidateQueries({
        queryKey: productMetadataQueryKey(product.id),
      });
      await queryClient.invalidateQueries({
        queryKey: [["product", product.id]],
      });
      toast.success("AI-ready metadata saved", {
        description: "Search and chatbot context will update through the normal product sync.",
      });
      setOpen(false);
    } catch (error) {
      toast.error("Failed to save AI-ready metadata", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const activeProfiles = enabledCount(persistedState);

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-x-2">
          <Heading level="h2">AI-ready metadata</Heading>
          <Badge size="2xsmall" rounded="full">
            {activeProfiles} active
          </Badge>
        </div>
        <ActionMenu
          groups={[
            {
              actions: [
                {
                  icon: <PencilSquare />,
                  label: "Edit",
                  onClick: () => setOpen(true),
                },
              ],
            },
          ]}
        />
      </div>

      <SectionRow
        title="AI Core"
        value={
          persistedState.aiCore.enabled
            ? persistedState.aiCore.productKind || listSummary(persistedState.aiCore.bestFor)
            : "Not configured"
        }
      />
      <SectionRow
        title="3D printing expert"
        value={
          persistedState.threeDPrinting.enabled
            ? persistedState.threeDPrinting.productKind ||
              persistedState.threeDPrinting.material ||
              "Configured"
            : "Not configured"
        }
      />
      <SectionRow
        title="RC model building expert"
        value={
          persistedState.rcModelBuilding.enabled
            ? persistedState.rcModelBuilding.componentRole ||
              persistedState.rcModelBuilding.connectorType ||
              "Configured"
            : "Not configured"
        }
      />

      <Drawer open={open} onOpenChange={handleOpenChange}>
        <Drawer.Content>
          <Drawer.Header>
            <Drawer.Title>Edit AI-ready metadata</Drawer.Title>
          </Drawer.Header>
          <Drawer.Body className="flex max-w-full flex-1 flex-col gap-y-8 overflow-y-auto">
            <AiCoreSection state={formState.aiCore} update={updateAiCore} />
            <ThreeDPrintingSection
              state={formState.threeDPrinting}
              update={updateThreeDPrinting}
            />
            <RcModelBuildingSection
              state={formState.rcModelBuilding}
              update={updateRcModelBuilding}
            />
          </Drawer.Body>
          <Drawer.Footer>
            <Drawer.Close asChild>
              <Button variant="secondary">Cancel</Button>
            </Drawer.Close>
            <Button isLoading={isSaving} disabled={!dirty} onClick={handleSave}>
              Save
            </Button>
          </Drawer.Footer>
        </Drawer.Content>
      </Drawer>
    </Container>
  );
};

export const config = defineWidgetConfig({
  zone: "product.details.after",
});

export default ProductAiMetadataWidget;
