import { defineWidgetConfig } from "@medusajs/admin-sdk";
import {
  EllipsisHorizontal,
  Pencil,
  PlusMini,
  Trash,
} from "@medusajs/icons";
import type { DetailWidgetProps, AdminProductVariant } from "@medusajs/framework/types";
import {
  Badge,
  Button,
  clx,
  Container,
  Drawer,
  DropdownMenu,
  IconButton,
  Input,
  Label,
  Text,
  toast,
  usePrompt,
} from "@medusajs/ui";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { usePreorderVariant } from "../hooks/preorders";
import {
  type AdminMoneyAmount,
  type AdminProductVariantWithPreorder,
  buildPriceInputMap,
  formatPreorderDate,
  formatMoneyAmount,
  getCurrencyCodes,
  parsePriceInputs,
  toDateTimeLocalValue,
} from "../lib/preorders";

const PreorderVariantWidget = ({
  data: variant,
}: DetailWidgetProps<AdminProductVariant>) => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [availableDate, setAvailableDate] = useState(toDateTimeLocalValue());
  const [priceInputs, setPriceInputs] = useState<Record<string, string>>({});
  const dialog = usePrompt();

  const {
    preorderVariant,
    variantData,
    isLoading,
    error,
    upsertPreorder,
    disablePreorder,
    isUpserting,
    isDisabling,
  } = usePreorderVariant(variant);
  const regularPrices = useMemo(
    () =>
      ((variantData?.prices as AdminMoneyAmount[] | undefined) ??
        ((variant as AdminProductVariantWithPreorder).prices ?? [])) as AdminMoneyAmount[],
    [variant, variantData]
  );
  const preorderPrices = useMemo(
    () => preorderVariant?.prices ?? [],
    [preorderVariant]
  );
  const currencyCodes = useMemo(
    () => getCurrencyCodes(regularPrices, preorderPrices),
    [preorderPrices, regularPrices]
  );
  const regularPricesByCurrency = new Map(
    regularPrices.map((price) => [price.currency_code.toLowerCase(), price.amount])
  );

  useEffect(() => {
    setAvailableDate(
      preorderVariant
        ? toDateTimeLocalValue(new Date(preorderVariant.available_date))
        : toDateTimeLocalValue()
    );
    setPriceInputs(buildPriceInputMap(currencyCodes, preorderPrices));
  }, [currencyCodes, preorderPrices, preorderVariant]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!availableDate) {
      toast.error("Select an available date before saving");
      return;
    }

    if (currencyCodes.length === 0) {
      toast.error("Set variant prices before creating preorder pricing");
      return;
    }

    const { prices, missingCurrencyCodes } = parsePriceInputs(
      priceInputs,
      currencyCodes
    );

    if (missingCurrencyCodes.length > 0) {
      toast.error(
        `Enter preorder prices for ${missingCurrencyCodes
          .map((currencyCode) => currencyCode.toUpperCase())
          .join(", ")}`
      );
      return;
    }

    try {
      await upsertPreorder({
        available_date: new Date(availableDate).toISOString(),
        prices,
      });
      setIsDrawerOpen(false);
    } catch {
      // Error feedback is handled by the mutation hook.
    }
  };

  const handleDisable = async () => {
    const confirmed = await dialog({
      title: "Remove preorder configuration?",
      description:
        "This disables preorder sales for the variant. Existing preorder records are not automatically fulfilled.",
      variant: "danger",
    });

    if (confirmed) {
      try {
        await disablePreorder();
      } catch {
        // Error feedback is handled by the mutation hook.
      }
    }
  };

  const renderPriceList = (
    prices: AdminMoneyAmount[],
    emptyState: string,
    tone: "default" | "muted" = "default"
  ) => {
    if (!prices.length) {
      return (
        <Text
          size="small"
          className={tone === "muted" ? "text-ui-fg-muted" : "text-ui-fg-subtle"}
        >
          {emptyState}
        </Text>
      );
    }

    return (
      <div className="grid gap-2">
        {prices.map((price) => (
          <div
            key={price.currency_code}
            className="flex items-center justify-between rounded-md border border-ui-border-base px-3 py-2"
          >
            <Text size="small" weight="plus" className="uppercase">
              {price.currency_code}
            </Text>
            <Text size="small">
              {formatMoneyAmount(price.amount, price.currency_code)}
            </Text>
          </div>
        ))}
      </div>
    );
  };

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2">
          <Text size="small" weight="plus" className="uppercase tracking-wider">
            Pre-order
          </Text>
          {preorderVariant && (
            <Badge size="2xsmall" rounded="full" className="bg-green-100 text-green-800">
              Enabled
            </Badge>
          )}
        </div>
        <DropdownMenu>
          <DropdownMenu.Trigger asChild>
            <IconButton size="small" variant="transparent">
              <EllipsisHorizontal />
            </IconButton>
          </DropdownMenu.Trigger>
          <DropdownMenu.Content>
            <DropdownMenu.Item
              disabled={isUpserting || isDisabling}
              onClick={() => setIsDrawerOpen(true)}
              className={clx("[&_svg]:text-ui-fg-subtle flex items-center gap-x-2", {
                "[&_svg]:text-ui-fg-disabled": isUpserting || isDisabling,
              })}
            >
              {preorderVariant ? <Pencil /> : <PlusMini />}
              <span>
                {preorderVariant ? "Edit" : "Add"} Pre-order Configuration
              </span>
            </DropdownMenu.Item>
            <DropdownMenu.Item
              disabled={isUpserting || isDisabling || !preorderVariant}
              onClick={handleDisable}
              className={clx("[&_svg]:text-ui-fg-subtle flex items-center gap-x-2", {
                "[&_svg]:text-ui-fg-disabled":
                  isUpserting || isDisabling || !preorderVariant,
              })}
            >
              <Trash />
              <span>Remove Pre-order Configuration</span>
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu>
      </div>

      <div className="px-6 py-4">
        {isLoading ? (
          <Text className="text-ui-fg-subtle">Loading pre-order information...</Text>
        ) : error ? (
          <Text className="text-ui-fg-error">
            Failed to load preorder configuration.
          </Text>
        ) : preorderVariant ? (
          <div className="space-y-4">
            <div className="space-y-1">
              <Text className="text-ui-fg-subtle" size="small">
                Available on {formatPreorderDate(preorderVariant.available_date)}
              </Text>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Text size="small" weight="plus" className="uppercase tracking-wide">
                  Regular Prices
                </Text>
                {renderPriceList(
                  regularPrices,
                  "No regular variant prices were found for this variant.",
                  "muted"
                )}
              </div>
              <div className="space-y-2">
                <Text size="small" weight="plus" className="uppercase tracking-wide">
                  Pre-order Prices
                </Text>
                {renderPriceList(
                  preorderPrices,
                  "No preorder prices have been saved yet.",
                  "muted"
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <Text className="text-ui-fg-subtle">
              This variant is not configured for pre-order.
            </Text>
            <Text className="text-ui-fg-muted" size="small">
              Add a preorder configuration to let customers buy the variant before it is
              normally available.
            </Text>
            <div className="space-y-2">
              <Text size="small" weight="plus" className="uppercase tracking-wide">
                Current Variant Prices
              </Text>
              {renderPriceList(
                regularPrices,
                "No variant prices were found. Add regular variant prices first.",
                "muted"
              )}
            </div>
          </div>
        )}
      </div>

      <Drawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <Drawer.Content>
          <Drawer.Header>
            <Drawer.Title>
              {preorderVariant ? "Edit" : "Add"} Pre-order Configuration
            </Drawer.Title>
          </Drawer.Header>
          <Drawer.Body>
            <form
              id="preorder-variant-form"
              onSubmit={handleSubmit}
              className="flex flex-col gap-4"
            >
              <div className="space-y-2">
                <Label htmlFor="available-date">Available Date</Label>
                <Input
                  id="available-date"
                  type="datetime-local"
                  value={availableDate}
                  onChange={(event) => setAvailableDate(event.target.value)}
                  min={toDateTimeLocalValue()}
                  required
                />
                <Text size="small" className="text-ui-fg-subtle">
                  Customers can pre-order this variant until this date.
                </Text>
              </div>
              <div className="space-y-2">
                <Text size="small" weight="plus" className="uppercase tracking-wide">
                  Pre-order Prices
                </Text>
                <div className="grid gap-3">
                  {currencyCodes.length > 0 ? (
                    currencyCodes.map((currencyCode) => (
                      <div key={currencyCode} className="space-y-2">
                        <Label htmlFor={`preorder-price-${currencyCode}`}>
                          {currencyCode.toUpperCase()} Pre-order Price
                        </Label>
                        <Input
                          id={`preorder-price-${currencyCode}`}
                          type="number"
                          inputMode="decimal"
                          value={priceInputs[currencyCode] ?? ""}
                          onChange={(event) =>
                            setPriceInputs((currentInputs) => ({
                              ...currentInputs,
                              [currencyCode]: event.target.value,
                            }))
                          }
                          min={0}
                          step={0.01}
                          required
                        />
                        <Text size="small" className="text-ui-fg-subtle">
                          Regular price:{" "}
                          {regularPricesByCurrency.has(currencyCode)
                            ? formatMoneyAmount(
                                regularPricesByCurrency.get(currencyCode)!,
                                currencyCode
                              )
                            : "Not set"}
                        </Text>
                      </div>
                    ))
                  ) : (
                    <Text size="small" className="text-ui-fg-muted">
                      No variant prices were found for this variant. Add regular prices
                      before configuring preorder pricing.
                    </Text>
                  )}
                </div>
              </div>
            </form>
          </Drawer.Body>
          <Drawer.Footer>
            <Drawer.Close asChild>
              <Button variant="secondary" disabled={isUpserting}>
                Cancel
              </Button>
            </Drawer.Close>
            <Button
              type="submit"
              form="preorder-variant-form"
              isLoading={isUpserting}
            >
              Save
            </Button>
          </Drawer.Footer>
        </Drawer.Content>
      </Drawer>
    </Container>
  );
};

export const config = defineWidgetConfig({
  zone: "product_variant.details.side.after",
});

export default PreorderVariantWidget;
