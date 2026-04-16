import { HttpTypes } from "@medusajs/framework/types";
import { useQuery } from "@tanstack/react-query";
import { Button, Input, Label, Select, Text } from "@medusajs/ui";
import { useEffect, useMemo, useState } from "react";
import { sdk } from "../lib/sdk";

export type BundledProductDraftItem = {
  product_id?: string;
  quantity: number;
};

type BundledProductItemProps = {
  index: number;
  item: BundledProductDraftItem;
  products: HttpTypes.AdminProduct[];
  onChange: (index: number, nextItem: BundledProductDraftItem) => void;
  onRemove: (index: number) => void;
  canRemove: boolean;
};

const BundledProductItem = ({
  index,
  item,
  products,
  onChange,
  onRemove,
  canRemove,
}: BundledProductItemProps) => {
  const [search, setSearch] = useState("");
  const [searchPage, setSearchPage] = useState(0);
  const searchLimit = 20;

  useEffect(() => {
    setSearchPage(0);
  }, [search]);

  const { data, isLoading } = useQuery({
    queryKey: ["bundled-product-item-products", search, searchPage],
    queryFn: () =>
      sdk.admin.product.list({
        q: search || undefined,
        limit: searchLimit,
        offset: searchPage * searchLimit,
      }),
  });

  const availableProducts = useMemo(() => {
    const mergedProducts = [...products];

    (data?.products ?? []).forEach((product) => {
      if (!mergedProducts.some((currentProduct) => currentProduct.id === product.id)) {
        mergedProducts.push(product);
      }
    });

    return mergedProducts;
  }, [data?.products, products]);

  const hasNextPage = data ? searchPage * searchLimit + data.products.length < data.count : false;
  const selectedProduct = availableProducts.find((product) => product.id === item.product_id);

  return (
    <div className="rounded-lg border p-4">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <Label size="small" weight="plus">
            Item {index + 1}
          </Label>
        </div>
        {canRemove ? (
          <Button
            type="button"
            variant="transparent"
            size="small"
            onClick={() => onRemove(index)}
          >
            Remove
          </Button>
        ) : null}
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_140px]">
        <div className="flex flex-col gap-2">
          <Label htmlFor={`bundle-product-search-${index}`}>Search Product</Label>
          <Input
            id={`bundle-product-search-${index}`}
            placeholder="Search by product title"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          {selectedProduct ? (
            <Text size="small" className="text-ui-fg-subtle">
              Selected: {selectedProduct.title}
            </Text>
          ) : null}
          <Label htmlFor={`bundle-product-${index}`}>Product</Label>
          <Select
            value={item.product_id}
            onValueChange={(value) =>
              onChange(index, {
                ...item,
                product_id: value,
              })
            }
          >
            <Select.Trigger id={`bundle-product-${index}`}>
              <Select.Value placeholder="Select a product" />
            </Select.Trigger>
            <Select.Content>
              {availableProducts.map((product) => (
                <Select.Item key={product.id} value={product.id}>
                  {product.title}
                </Select.Item>
              ))}
            </Select.Content>
          </Select>
          {isLoading ? (
            <Text size="small" className="text-ui-fg-subtle">
              Loading products...
            </Text>
          ) : null}
          {hasNextPage ? (
            <div>
              <Button
                type="button"
                variant="secondary"
                size="small"
                onClick={() => setSearchPage((currentPage) => currentPage + 1)}
              >
                Load More Results
              </Button>
            </div>
          ) : null}
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor={`bundle-quantity-${index}`}>Quantity</Label>
          <Input
            id={`bundle-quantity-${index}`}
            type="number"
            min={1}
            value={String(item.quantity)}
            onChange={(event) =>
              onChange(index, {
                ...item,
                quantity: Math.max(1, Number(event.target.value) || 1),
              })
            }
          />
        </div>
      </div>
    </div>
  );
};

export default BundledProductItem;
