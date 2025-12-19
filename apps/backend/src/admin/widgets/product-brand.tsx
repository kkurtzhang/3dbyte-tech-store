import { defineWidgetConfig } from "@medusajs/admin-sdk";
import { DetailWidgetProps, AdminProduct } from "@medusajs/framework/types";
import {
  Button,
  clx,
  Container,
  Drawer,
  Heading,
  Label,
  Select,
  Text,
  toast,
  usePrompt,
} from "@medusajs/ui";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { sdk } from "../lib/sdk";
import { ActionMenu } from "../components/action-menu";
import { PencilSquare } from "@medusajs/icons";
import { useEffect, useState } from "react";
import { useAddProducts, useBrands, useRemoveProducts } from "../hooks/brands";

type AdminProductBrand = AdminProduct & {
  brand?: {
    id: string;
    name: string;
    handle: string;
  };
};

const ProductBrandWidget = ({
  data: product,
}: DetailWidgetProps<AdminProduct>) => {
  const [open, setOpen] = useState(false);
  const [savePending, setSavePending] = useState(false);

  const { data: queryResult } = useQuery({
    queryFn: () =>
      sdk.admin.product.retrieve(product.id, {
        fields: "+brand.*",
      }),
    queryKey: [["product", product.id]],
  });
  const { brands = [] } = useBrands({
    fields: "id,name",
  });
  const brandName =
    (queryResult?.product as AdminProductBrand)?.brand?.name ?? "-";
  const brandId = (queryResult?.product as AdminProductBrand)?.brand?.id ?? "";
  const productId = (queryResult?.product as AdminProductBrand)?.id;
  const productTitle = (queryResult?.product as AdminProductBrand)?.title;
  const [value, setValue] = useState<string>("");
  const dialog = usePrompt();
  const queryClient = useQueryClient();

  const handleOpenChange = async (open: boolean) => {
    if (brandId !== value) {
      const userHasConfirmed = await dialog({
        title: "Are you sure you want to leave this form?",
        description: `You have unsaved changes that will be lost if you exit this form.`,
      });
      if (userHasConfirmed) {
        setValue(brandId);
        setOpen(open);
      }
    } else {
      setOpen(open);
    }
  };

  useEffect(() => {
    setValue(brandId);
  }, [queryResult]);
  const { mutateAsync: onLinkProductBrand } = useAddProducts(value);

  const { mutateAsync: onUnlinkProductBrand } = useRemoveProducts(brandId);

  const handleSave = async () => {
    if (value !== "") {
      setSavePending(true);
      try {
        if (brandName !== "-") {
          //dismiss old link
          await onUnlinkProductBrand({ products: [productId] });
        }
        //add product to brand
        await onLinkProductBrand({ products: [productId] });
        toast.success("", {
          description: `Product ${productTitle} was successfully updated.`,
        });
        queryClient.invalidateQueries({
          queryKey: [["product", productId]],
        });
      } catch (error) {
        toast.error("", { description: "Update product failed!" });
      } finally {
        setSavePending(false);
        setOpen(false);
      }
    }
  };

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <Heading level="h2">Brand</Heading>
        </div>
        <ActionMenu
          groups={[
            {
              actions: [
                {
                  icon: <PencilSquare />,
                  label: "Edit",
                  onClick: () => {
                    setOpen(true);
                  },
                },
              ],
            },
          ]}
        />
      </div>
      <div
        className={clx(
          `text-ui-fg-subtle grid grid-cols-2 items-center px-6 py-4`
        )}
      >
        <Text size="small" weight="plus" leading="compact">
          Name
        </Text>

        <Text
          size="small"
          leading="compact"
          className="whitespace-pre-line text-pretty"
        >
          {brandName}
        </Text>
      </div>
      <Drawer open={open} onOpenChange={handleOpenChange}>
        <Drawer.Content>
          <Drawer.Header>
            <Drawer.Title>Edit Brand</Drawer.Title>
          </Drawer.Header>
          <Drawer.Body className="flex max-w-full flex-1 flex-col gap-y-8 overflow-y-auto">
            <div className="flex flex-col space-y-2">
              <div className="flex items-center gap-x-1">
                <Label size="small" weight="plus">
                  Name
                </Label>
              </div>
              <Select onValueChange={setValue} value={value}>
                <Select.Trigger>
                  <Select.Value placeholder="Select a brand" />
                </Select.Trigger>
                <Select.Content>
                  {brands.map((item) => (
                    <Select.Item key={item.id} value={item.id}>
                      {item.name}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select>
            </div>
          </Drawer.Body>
          <Drawer.Footer>
            <Drawer.Close asChild>
              <Button variant="secondary">Cancel</Button>
            </Drawer.Close>
            <Button isLoading={savePending} onClick={handleSave}>
              Save
            </Button>
          </Drawer.Footer>
        </Drawer.Content>
      </Drawer>
    </Container>
  );
};

export const config = defineWidgetConfig({
  zone: "product.details.before",
});

export default ProductBrandWidget;
