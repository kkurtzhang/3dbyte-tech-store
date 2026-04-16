import { HttpTypes } from "@medusajs/framework/types";
import { useQueryClient } from "@tanstack/react-query";
import {
  Button,
  FocusModal,
  Heading,
  Input,
  Label,
  Text,
  toast,
} from "@medusajs/ui";
import { useState } from "react";
import BundledProductItem, {
  BundledProductDraftItem,
} from "./bundled-product-item";
import { useCreateBundledProduct } from "../hooks/bundled-products";

const INITIAL_ITEM: BundledProductDraftItem = {
  product_id: undefined,
  quantity: 1,
};

const CreateBundledProduct = () => {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [items, setItems] = useState<BundledProductDraftItem[]>([INITIAL_ITEM]);

  const queryClient = useQueryClient();

  const { mutateAsync: createBundledProduct, isPending: isCreating } =
    useCreateBundledProduct();

  const canCreate =
    title.trim().length > 0 &&
    items.length > 0 &&
    items.every((item) => item.product_id && item.quantity > 0);

  const handleItemChange = (index: number, nextItem: BundledProductDraftItem) => {
    setItems((currentItems) =>
      currentItems.map((item, itemIndex) =>
        itemIndex === index ? nextItem : item
      )
    );
  };

  const handleRemoveItem = (index: number) => {
    setItems((currentItems) => currentItems.filter((_, itemIndex) => itemIndex !== index));
  };

  const resetForm = () => {
    setOpen(false);
    setTitle("");
    setItems([INITIAL_ITEM]);
    queryClient.removeQueries({
      queryKey: ["bundled-products", "products"],
    });
    queryClient.removeQueries({
      queryKey: ["bundled-product-item-products"],
    });
  };

  const handleCreate = async () => {
    if (!canCreate) {
      toast.error("", {
        description: "Add a title and select products for all bundle items.",
      });
      return;
    }

    try {
      await createBundledProduct({
        title,
        product: {
          title,
          options: [
            {
              title: "Default",
              values: ["default"],
            },
          ],
          status: "published",
          variants: [
            {
              title,
              prices: [],
              options: {
                Default: "default",
              },
              manage_inventory: false,
            },
          ],
        },
        items: items.map((item) => ({
          product_id: item.product_id!,
          quantity: item.quantity,
        })),
      });

      toast.success("", {
        description: "Bundled product created successfully.",
      });

      resetForm();
    } catch (error) {
      toast.error("", {
        description: "Failed to create bundled product.",
      });
    }
  };

  return (
    <FocusModal
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          resetForm();
          return;
        }

        setOpen(nextOpen);
      }}
    >
      <FocusModal.Trigger asChild>
        <Button variant="secondary">Create</Button>
      </FocusModal.Trigger>
      <FocusModal.Content>
        <FocusModal.Header>
          <div className="flex items-center justify-between gap-x-2">
            <div>
              <Heading level="h1">Create Bundled Product</Heading>
              <Text size="small" className="text-ui-fg-subtle">
                Create a bundle and its associated Medusa product.
              </Text>
            </div>
          </div>
        </FocusModal.Header>
        <FocusModal.Body>
          <div className="flex flex-1 flex-col items-center overflow-y-auto">
            <div className="mx-auto flex w-full max-w-[720px] flex-col gap-y-8 px-2 py-16">
              <div className="flex flex-col gap-2">
                <Label htmlFor="bundle-title">Bundle Title</Label>
                <Input
                  id="bundle-title"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                />
              </div>

              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Heading level="h2">Bundle Items</Heading>
                    <Text size="small" className="text-ui-fg-subtle">
                      Choose the products and quantities included in the bundle.
                    </Text>
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() =>
                      setItems((currentItems) => [
                        ...currentItems,
                        { ...INITIAL_ITEM },
                      ])
                    }
                  >
                    Add Item
                  </Button>
                </div>

                {items.map((item, index) => (
                  <BundledProductItem
                    key={`${index}-${item.product_id ?? "empty"}`}
                    index={index}
                    item={item}
                    products={[] as HttpTypes.AdminProduct[]}
                    onChange={handleItemChange}
                    onRemove={handleRemoveItem}
                    canRemove={items.length > 1}
                  />
                ))}
              </div>
            </div>
          </div>
        </FocusModal.Body>
        <FocusModal.Footer>
          <div className="flex items-center justify-end gap-x-2">
            <Button type="button" variant="secondary" onClick={resetForm}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={handleCreate}
              isLoading={isCreating}
              disabled={!canCreate}
            >
              Create Bundle
            </Button>
          </div>
        </FocusModal.Footer>
      </FocusModal.Content>
    </FocusModal>
  );
};

export default CreateBundledProduct;
