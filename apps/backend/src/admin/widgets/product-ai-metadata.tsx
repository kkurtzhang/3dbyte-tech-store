import { PencilSquare } from "@medusajs/icons";
import { defineWidgetConfig } from "@medusajs/admin-sdk";
import type { AdminProduct, DetailWidgetProps } from "@medusajs/framework/types";
import {
  Badge,
  Button,
  Container,
  Drawer,
  Heading,
  Input,
  Label,
  Select,
  Switch,
  Text,
  Textarea,
  toast,
  usePrompt,
} from "@medusajs/ui";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";

import { ActionMenu } from "../components/action-menu";
import { SectionRow } from "../components/section-row";
import {
  buildAiProductMetadataFormState,
  buildAiProductMetadataUpdatePayload,
  type AiProductMetadataFormState,
  type BooleanFormValue,
} from "../lib/ai-product-metadata";
import { sdk } from "../lib/sdk";

type AdminProductWithMetadata = AdminProduct & {
  metadata?: Record<string, unknown> | null;
};

type ProductResponse = {
  product: AdminProductWithMetadata;
};

type SectionToggleProps = {
  checked: boolean;
  description: string;
  onCheckedChange: (checked: boolean) => void;
  title: string;
};

type TextFieldProps = {
  label: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: "number" | "text";
  value: string;
};

type TextAreaFieldProps = {
  label: string;
  onChange: (value: string) => void;
  placeholder?: string;
  value: string;
};

type BooleanFieldProps = {
  label: string;
  onChange: (value: BooleanFormValue) => void;
  value: BooleanFormValue;
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

const SectionToggle = ({
  checked,
  description,
  onCheckedChange,
  title,
}: SectionToggleProps) => (
  <div className="flex items-start justify-between gap-x-4 border-b border-ui-border-base pb-4">
    <div>
      <Heading level="h3">{title}</Heading>
      <Text size="small" className="text-ui-fg-subtle">
        {description}
      </Text>
    </div>
    <Switch checked={checked} onCheckedChange={onCheckedChange} />
  </div>
);

const TextField = ({
  label,
  onChange,
  placeholder,
  type = "text",
  value,
}: TextFieldProps) => (
  <div className="flex flex-col gap-y-2">
    <Label size="small" weight="plus">
      {label}
    </Label>
    <Input
      type={type}
      value={value}
      placeholder={placeholder}
      onChange={(event) => onChange(event.target.value)}
    />
  </div>
);

const TextAreaField = ({
  label,
  onChange,
  placeholder,
  value,
}: TextAreaFieldProps) => (
  <div className="flex flex-col gap-y-2">
    <Label size="small" weight="plus">
      {label}
    </Label>
    <Textarea
      value={value}
      placeholder={placeholder}
      rows={3}
      onChange={(event) => onChange(event.target.value)}
    />
  </div>
);

const BooleanField = ({ label, onChange, value }: BooleanFieldProps) => (
  <div className="flex flex-col gap-y-2">
    <Label size="small" weight="plus">
      {label}
    </Label>
    <Select
      value={value || "unset"}
      onValueChange={(nextValue) =>
        onChange(nextValue === "unset" ? "" : (nextValue as BooleanFormValue))
      }
    >
      <Select.Trigger>
        <Select.Value placeholder="Unset" />
      </Select.Trigger>
      <Select.Content>
        <Select.Item value="unset">Unset</Select.Item>
        <Select.Item value="true">Yes</Select.Item>
        <Select.Item value="false">No</Select.Item>
      </Select.Content>
    </Select>
  </div>
);

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
            <div className="flex flex-col gap-y-4">
              <SectionToggle
                title="AI Core"
                description="General product facts for any category."
                checked={formState.aiCore.enabled}
                onCheckedChange={(enabled) => updateAiCore({ enabled })}
              />
              {formState.aiCore.enabled && (
                <div className="grid gap-4 md:grid-cols-2">
                  <TextField
                    label="Product kind"
                    value={formState.aiCore.productKind}
                    placeholder="soldering_station"
                    onChange={(productKind) => updateAiCore({ productKind })}
                  />
                  <TextAreaField
                    label="Audience"
                    value={formState.aiCore.audience}
                    placeholder="One audience per line"
                    onChange={(audience) => updateAiCore({ audience })}
                  />
                  <TextAreaField
                    label="Best for"
                    value={formState.aiCore.bestFor}
                    placeholder="One use case per line"
                    onChange={(bestFor) => updateAiCore({ bestFor })}
                  />
                  <TextAreaField
                    label="Not recommended for"
                    value={formState.aiCore.notRecommendedFor}
                    placeholder="One caveat per line"
                    onChange={(notRecommendedFor) =>
                      updateAiCore({ notRecommendedFor })
                    }
                  />
                  <TextAreaField
                    label="Compatibility notes"
                    value={formState.aiCore.compatibilityNotes}
                    placeholder="One compatibility fact per line"
                    onChange={(compatibilityNotes) =>
                      updateAiCore({ compatibilityNotes })
                    }
                  />
                  <TextAreaField
                    label="Care or safety notes"
                    value={formState.aiCore.careOrSafetyNotes}
                    placeholder="One care or safety note per line"
                    onChange={(careOrSafetyNotes) =>
                      updateAiCore({ careOrSafetyNotes })
                    }
                  />
                  <TextAreaField
                    label="AI search keywords"
                    value={formState.aiCore.aiSearchKeywords}
                    placeholder="One keyword per line"
                    onChange={(aiSearchKeywords) =>
                      updateAiCore({ aiSearchKeywords })
                    }
                  />
                </div>
              )}
            </div>

            <div className="flex flex-col gap-y-4">
              <SectionToggle
                title="3D printing expert"
                description="Print-process facts for filament, nozzles, hotends, build surfaces, drying, and maintenance products."
                checked={formState.threeDPrinting.enabled}
                onCheckedChange={(enabled) =>
                  updateThreeDPrinting({ enabled })
                }
              />
              {formState.threeDPrinting.enabled && (
                <div className="grid gap-4 md:grid-cols-2">
                  <TextField
                    label="Product kind"
                    value={formState.threeDPrinting.productKind}
                    placeholder="filament"
                    onChange={(productKind) =>
                      updateThreeDPrinting({ productKind })
                    }
                  />
                  <TextField
                    label="Material"
                    value={formState.threeDPrinting.material}
                    placeholder="PETG"
                    onChange={(material) => updateThreeDPrinting({ material })}
                  />
                  <TextField
                    label="Diameter mm"
                    type="number"
                    value={formState.threeDPrinting.diameterMm}
                    onChange={(diameterMm) =>
                      updateThreeDPrinting({ diameterMm })
                    }
                  />
                  <TextField
                    label="Nozzle diameter mm"
                    type="number"
                    value={formState.threeDPrinting.nozzleDiameterMm}
                    onChange={(nozzleDiameterMm) =>
                      updateThreeDPrinting({ nozzleDiameterMm })
                    }
                  />
                  <TextField
                    label="Nozzle temp min C"
                    type="number"
                    value={formState.threeDPrinting.nozzleTempMinC}
                    onChange={(nozzleTempMinC) =>
                      updateThreeDPrinting({ nozzleTempMinC })
                    }
                  />
                  <TextField
                    label="Nozzle temp max C"
                    type="number"
                    value={formState.threeDPrinting.nozzleTempMaxC}
                    onChange={(nozzleTempMaxC) =>
                      updateThreeDPrinting({ nozzleTempMaxC })
                    }
                  />
                  <TextField
                    label="Bed temp min C"
                    type="number"
                    value={formState.threeDPrinting.bedTempMinC}
                    onChange={(bedTempMinC) =>
                      updateThreeDPrinting({ bedTempMinC })
                    }
                  />
                  <TextField
                    label="Bed temp max C"
                    type="number"
                    value={formState.threeDPrinting.bedTempMaxC}
                    onChange={(bedTempMaxC) =>
                      updateThreeDPrinting({ bedTempMaxC })
                    }
                  />
                  <TextField
                    label="Max temperature C"
                    type="number"
                    value={formState.threeDPrinting.maxTemperatureC}
                    onChange={(maxTemperatureC) =>
                      updateThreeDPrinting({ maxTemperatureC })
                    }
                  />
                  <BooleanField
                    label="Requires enclosure"
                    value={formState.threeDPrinting.requiresEnclosure}
                    onChange={(requiresEnclosure) =>
                      updateThreeDPrinting({ requiresEnclosure })
                    }
                  />
                  <BooleanField
                    label="Requires hardened nozzle"
                    value={formState.threeDPrinting.requiresHardenedNozzle}
                    onChange={(requiresHardenedNozzle) =>
                      updateThreeDPrinting({ requiresHardenedNozzle })
                    }
                  />
                  <BooleanField
                    label="Drying recommended"
                    value={formState.threeDPrinting.dryingRecommended}
                    onChange={(dryingRecommended) =>
                      updateThreeDPrinting({ dryingRecommended })
                    }
                  />
                  <TextAreaField
                    label="Compatible printers"
                    value={formState.threeDPrinting.compatiblePrinters}
                    placeholder="One printer per line"
                    onChange={(compatiblePrinters) =>
                      updateThreeDPrinting({ compatiblePrinters })
                    }
                  />
                  <TextAreaField
                    label="Compatible build surfaces"
                    value={formState.threeDPrinting.compatibleBuildSurfaces}
                    placeholder="One surface per line"
                    onChange={(compatibleBuildSurfaces) =>
                      updateThreeDPrinting({ compatibleBuildSurfaces })
                    }
                  />
                  <TextAreaField
                    label="Best for"
                    value={formState.threeDPrinting.bestFor}
                    placeholder="One use case per line"
                    onChange={(bestFor) => updateThreeDPrinting({ bestFor })}
                  />
                  <TextAreaField
                    label="Not recommended for"
                    value={formState.threeDPrinting.notRecommendedFor}
                    placeholder="One caveat per line"
                    onChange={(notRecommendedFor) =>
                      updateThreeDPrinting({ notRecommendedFor })
                    }
                  />
                  <TextAreaField
                    label="Common issues"
                    value={formState.threeDPrinting.commonIssues}
                    placeholder="One issue per line"
                    onChange={(commonIssues) =>
                      updateThreeDPrinting({ commonIssues })
                    }
                  />
                  <TextAreaField
                    label="AI search keywords"
                    value={formState.threeDPrinting.aiSearchKeywords}
                    placeholder="One keyword per line"
                    onChange={(aiSearchKeywords) =>
                      updateThreeDPrinting({ aiSearchKeywords })
                    }
                  />
                </div>
              )}
            </div>

            <div className="flex flex-col gap-y-4">
              <SectionToggle
                title="RC model building expert"
                description="3DSets-style RC component, electronics, connector, voltage, hardware, and assembly facts."
                checked={formState.rcModelBuilding.enabled}
                onCheckedChange={(enabled) =>
                  updateRcModelBuilding({ enabled })
                }
              />
              {formState.rcModelBuilding.enabled && (
                <div className="grid gap-4 md:grid-cols-2">
                  <TextField
                    label="Component role"
                    value={formState.rcModelBuilding.componentRole}
                    placeholder="esc"
                    onChange={(componentRole) =>
                      updateRcModelBuilding({ componentRole })
                    }
                  />
                  <TextField
                    label="Voltage"
                    value={formState.rcModelBuilding.voltage}
                    placeholder="7.4V"
                    onChange={(voltage) => updateRcModelBuilding({ voltage })}
                  />
                  <TextField
                    label="Connector type"
                    value={formState.rcModelBuilding.connectorType}
                    placeholder="XT60"
                    onChange={(connectorType) =>
                      updateRcModelBuilding({ connectorType })
                    }
                  />
                  <TextAreaField
                    label="Compatible project types"
                    value={formState.rcModelBuilding.compatibleProjectTypes}
                    placeholder="One project type per line"
                    onChange={(compatibleProjectTypes) =>
                      updateRcModelBuilding({ compatibleProjectTypes })
                    }
                  />
                  <TextAreaField
                    label="Used for"
                    value={formState.rcModelBuilding.usedFor}
                    placeholder="One use per line"
                    onChange={(usedFor) => updateRcModelBuilding({ usedFor })}
                  />
                  <TextAreaField
                    label="Best for"
                    value={formState.rcModelBuilding.bestFor}
                    placeholder="One use case per line"
                    onChange={(bestFor) => updateRcModelBuilding({ bestFor })}
                  />
                  <TextAreaField
                    label="AI search keywords"
                    value={formState.rcModelBuilding.aiSearchKeywords}
                    placeholder="One keyword per line"
                    onChange={(aiSearchKeywords) =>
                      updateRcModelBuilding({ aiSearchKeywords })
                    }
                  />
                </div>
              )}
            </div>
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
