import { defineRouteConfig } from "@medusajs/admin-sdk";
import { CubeSolid } from "@medusajs/icons";
import {
  createDataTableColumnHelper,
  DataTable,
  DataTablePaginationState,
  Heading,
  Text,
  useDataTable,
} from "@medusajs/ui";
import { useMemo, useState } from "react";
import CreateBundledProduct from "../../components/create-bundled-product";
import { Container } from "../../components/container";
import { useBundledProducts } from "../../hooks/bundled-products";
import { AdminBundledProduct } from "../../types";

const getAdminProductPath = (productId: string) => `/app/products/${productId}`;

const columnHelper = createDataTableColumnHelper<AdminBundledProduct>();

const columns = [
  columnHelper.accessor("id", {
    header: "ID",
    cell: ({ getValue }) => (
      <Text size="small" className="font-mono">
        {getValue()}
      </Text>
    ),
  }),
  columnHelper.accessor("title", {
    header: "Title",
  }),
  columnHelper.accessor("items", {
    header: "Items",
    cell: ({ row }) => {
      const items = row.original.items ?? [];

      if (items.length === 0) {
        return <Text size="small">No items</Text>;
      }

      return (
        <div className="flex flex-col gap-1">
          {items.map((item) => (
            <div key={item.id}>
              {item.product?.id ? (
                <a
                  href={getAdminProductPath(item.product.id)}
                  className="text-ui-fg-interactive hover:text-ui-fg-interactive-hover"
                >
                  {item.product.title}
                </a>
              ) : (
                <span>{item.product?.title || "Unknown product"}</span>
              )}{" "}
              x {item.quantity}
            </div>
          ))}
        </div>
      );
    },
  }),
  columnHelper.accessor("product", {
    header: "Product",
    cell: ({ row }) => {
      if (!row.original.product?.id) {
        return <Text size="small">Unavailable</Text>;
      }

      return (
        <a
          href={getAdminProductPath(row.original.product.id)}
          className="text-ui-fg-interactive hover:text-ui-fg-interactive-hover"
        >
          View Product
        </a>
      );
    },
  }),
];

const limit = 15;

const BundledProductsPage = () => {
  const [pagination, setPagination] = useState<DataTablePaginationState>({
    pageIndex: 0,
    pageSize: limit,
  });

  const offset = useMemo(() => {
    return pagination.pageIndex * limit;
  }, [pagination.pageIndex]);

  const {
    bundled_products: bundledProducts = [],
    count = 0,
    isLoading,
    isError,
  } = useBundledProducts({
    limit,
    offset,
    order: "-created_at",
  });

  const table = useDataTable({
    columns,
    data: bundledProducts,
    getRowId: (row) => row.id,
    rowCount: count,
    isLoading,
    pagination: {
      state: pagination,
      onPaginationChange: setPagination,
    },
  });

  return (
    <Container>
      <DataTable instance={table}>
        <DataTable.Toolbar className="flex flex-col items-start justify-between gap-2 md:flex-row md:items-center">
          <div>
            <Heading>Bundled Products</Heading>
            <Text size="small" className="text-ui-fg-subtle">
              Create and review the bundle definitions linked to Medusa products.
            </Text>
            {isError ? (
              <Text size="small" className="mt-2 text-ui-fg-error">
                Failed to load bundled products. Refresh after checking the backend logs.
              </Text>
            ) : null}
          </div>
          <CreateBundledProduct />
        </DataTable.Toolbar>
        <DataTable.Table />
        <DataTable.Pagination />
      </DataTable>
    </Container>
  );
};

export const config = defineRouteConfig({
  label: "Bundled Products",
  icon: CubeSolid,
});

export const handle = {
  breadcrumb: () => "Bundled Products",
};

export default BundledProductsPage;
