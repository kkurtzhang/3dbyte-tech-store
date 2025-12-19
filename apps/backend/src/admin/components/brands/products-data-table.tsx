import {
  createDataTableColumnHelper,
  createDataTableFilterHelper,
  DataTable,
  DataTableFilteringState,
  DataTablePaginationState,
  DataTableSortingState,
  useDataTable,
  Text,
  DataTableRowSelectionState,
  createDataTableCommandHelper,
  usePrompt,
  toast,
} from "@medusajs/ui";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { HttpTypes, ProductStatus } from "@medusajs/framework/types";
import {
  Pencil,
  SquareGreenSolid,
  SquareGreySolid,
  SquareOrangeSolid,
  SquareRedSolid,
  Trash,
} from "@medusajs/icons";
import { sdk } from "../../lib/sdk";
import NoResultsFound from "../no-result";
import { useNavigate } from "react-router-dom";
import { ActionMenu } from "../action-menu";
import { useRemoveProducts } from "../../hooks/brands";

const columnHelper = createDataTableColumnHelper<HttpTypes.AdminProduct>();

const columns = [
  columnHelper.select(),
  columnHelper.accessor("title", {
    header: "Product",
    // Enables sorting for the column.
    enableSorting: true,
    // If omitted, the header will be used instead if it's a string,
    // otherwise the accessor key (id) will be used.
    sortLabel: "Title",
    // If omitted the default value will be "A-Z"
    sortAscLabel: "A-Z",
    // If omitted the default value will be "Z-A"
    sortDescLabel: "Z-A",
    cell: ({ row }) => {
      const { thumbnail, title } = row.original;
      return (
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {thumbnail && (
            <img
              src={thumbnail}
              alt={title}
              style={{
                width: 32,
                height: 32,
                objectFit: "cover",
                borderRadius: 4,
              }}
            />
          )}
          <Text>{title}</Text>
        </div>
      );
    },
  }),
  columnHelper.accessor("collection", {
    header: "Collection",
    cell: ({ getValue }) => {
      const collection = getValue();
      return (
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Text>{collection?.title ?? "-"}</Text>
        </div>
      );
    },
  }),
  columnHelper.accessor("sales_channels", {
    header: "Sales Channels",
    cell: ({ getValue }) => {
      const sales_channels = getValue();
      return (
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Text>{sales_channels?.map((sc) => sc.name).join(",") ?? "-"}</Text>
        </div>
      );
    },
  }),
  columnHelper.accessor("variants", {
    header: "Variants",
    cell: ({ getValue }) => `${getValue()?.length} variants`,
  }),
  columnHelper.accessor("status", {
    header: "Status",
    cell: ({ getValue }) => {
      const status = getValue();
      let icon = <SquareGreenSolid />;
      switch (status) {
        case "draft":
          icon = <SquareGreySolid />;
          break;
        case "proposed":
          icon = <SquareOrangeSolid />;
          break;
        case "rejected":
          icon = <SquareRedSolid />;
          break;
        default:
          break;
      }
      return (
        <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
          {icon}
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </div>
      );
    },
  }),
  columnHelper.accessor("id", {
    header: "",
    cell: ({ row }) => {
      const { id, title, brand_id } = row.original;
      return (
        <ActionMenu
          groups={[
            {
              actions: [
                {
                  icon: <Pencil />,
                  label: "Edit",
                  to: `/products/${id}/edit`,
                },
                {
                  icon: <Trash />,
                  label: "Remove",
                  onClick: () => {},
                  prompt: true,
                  promptParam: {
                    title: "Are you sure?",
                    description: `You are about to remove ${title} from the brand. This action cannot be undone.`,
                  },
                  confirmedParam: {
                    brand_id: brand_id,
                    products: [id],
                  },
                },
              ],
            },
          ]}
        />
      );
    },
  }),
];

const filterHelper = createDataTableFilterHelper<HttpTypes.AdminProduct>();

const filters = [
  filterHelper.accessor("status", {
    type: "select",
    label: "Status",
    options: [
      {
        label: "Published",
        value: "published",
      },
      {
        label: "Draft",
        value: "draft",
      },
    ],
  }),
];

const limit = 15;

const ProductsDataTable = (props: {
  product_ids: string[];
  brand_id: string;
}) => {
  const { product_ids, brand_id } = props;
  const navigate = useNavigate();
  const dialog = usePrompt();
  const [pagination, setPagination] = useState<DataTablePaginationState>({
    pageSize: limit,
    pageIndex: 0,
  });
  const [search, setSearch] = useState<string>("");
  const [filtering, setFiltering] = useState<DataTableFilteringState>({});
  const [sorting, setSorting] = useState<DataTableSortingState | null>({
    id: "title",
    desc: false,
  });
  const [rowSelection, setRowSelection] = useState<DataTableRowSelectionState>(
    {}
  );

  const offset = useMemo(() => {
    return pagination.pageIndex * limit;
  }, [pagination]);
  const statusFilters = useMemo(() => {
    return (filtering.status || []) as ProductStatus;
  }, [filtering]);

  const { data, isLoading } = useQuery({
    queryFn: () =>
      sdk.admin.product.list({
        id: product_ids,
        fields:
          "id,title,handle,status,collection.title,sales_channels.name,variants.id,thumbnail",
        limit,
        offset,
        q: search,
        status: statusFilters,
        order: sorting ? `${sorting.desc ? "-" : ""}${sorting.id}` : undefined,
      }),
    queryKey: [
      [
        "products",
        product_ids,
        limit,
        offset,
        search,
        statusFilters,
        sorting?.id,
        sorting?.desc,
      ],
    ],
    enabled: !!product_ids && product_ids.length > 0, // only run if productIds exist
  });

  const { mutateAsync: removeProducts } = useRemoveProducts(brand_id);

  const onRemoveProducts = async ({ products }: { products: string[] }) => {
    try {
      await removeProducts({
        products,
      });
      toast.success("", {
        description: `${products.length} products was successfully removed from the brand.`,
      });
    } catch (e) {
      toast.error("", { description: "Remove product failed!" });
    }
  };

  const commandHelper = createDataTableCommandHelper();

  const commands = [
    commandHelper.command({
      label: "Remove",
      shortcut: "R",
      action: async (selection) => {
        const productsToRemoveIds = Object.keys(selection);
        const userHasConfirmed = await dialog({
          title: "Are you sure?",
          description: `You are about to remove ${productsToRemoveIds.length} products from the brand. This action cannot be undone.`,
        });
        if (userHasConfirmed) {
          // Perform Delete
          onRemoveProducts({ products: productsToRemoveIds });
        }
      },
    }),
  ];

  const table = useDataTable({
    columns,
    data:
      product_ids.length > 0
        ? data?.products.map((p) => ({ brand_id, ...p })) || []
        : [],
    getRowId: (row) => row.id,
    rowCount: data?.count || 0,
    isLoading,
    commands,
    pagination: {
      state: pagination,
      onPaginationChange: setPagination,
    },
    search: {
      state: search,
      onSearchChange: setSearch,
    },
    filtering: {
      state: filtering,
      onFilteringChange: setFiltering,
    },
    filters,
    sorting: {
      // Pass the pagination state and updater to the table instance
      state: sorting,
      onSortingChange: setSorting,
    },
    rowSelection: {
      state: rowSelection,
      onRowSelectionChange: setRowSelection,
      //   enableRowSelection
    },
    onRowClick: (event, row) => {
      navigate(`/products/${row.id}`);
    },
  });

  return (
    <div>
      <DataTable instance={table}>
        <DataTable.Toolbar className="flex flex-col items-start justify-between gap-2 md:flex-row md:items-center">
          <DataTable.FilterMenu tooltip="Filter" />
          <div className="flex gap-2">
            <DataTable.Search placeholder="Search..." />
            <DataTable.SortingMenu tooltip="Sort" />
          </div>
        </DataTable.Toolbar>
        <DataTable.Table
          emptyState={{
            filtered: { custom: <NoResultsFound /> },
            empty: { custom: <NoResultsFound /> },
          }}
        />
        <DataTable.CommandBar selectedLabel={(count) => `${count} selected`} />
        <DataTable.Pagination />
      </DataTable>
    </div>
  );
};

export default ProductsDataTable;
