import {
  SquareGreenSolid,
  SquareGreySolid,
  SquareOrangeSolid,
  SquareRedSolid,
} from "@medusajs/icons";
import {
  Button,
  createDataTableColumnHelper,
  createDataTableFilterHelper,
  DataTable,
  DataTableFilteringState,
  DataTablePaginationState,
  DataTableSortingState,
  FocusModal,
  useDataTable,
  Text,
  DataTableRowSelectionState,
  toast,
  usePrompt,
} from "@medusajs/ui";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { AdminProduct, ProductStatus } from "@medusajs/framework/types";
import { useNavigate, useParams } from "react-router-dom";
import { sdk } from "../../../../lib/sdk";
import { Container } from "../../../../components/container";
import NoResultsFound from "../../../../components/no-result";
import { useAddProducts, useBatchDismissLinks } from "../../../../hooks/brands";
import { AdminBrand } from "../../../../types";

interface AdminProductBrand extends AdminProduct {
  brand: AdminBrand;
}

const columnHelper = createDataTableColumnHelper<AdminProductBrand>();

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
  columnHelper.accessor("brand", {
    header: "Brand",
    cell: ({ getValue }) => getValue()?.name || "-",
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
];

const filterHelper = createDataTableFilterHelper<AdminProductBrand>();

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

const LinkProductsToBrandPage = () => {
  const { id } = useParams();
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
  const [saveLoading, setSaveLoading] = useState(false);
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
        fields:
          "id,title,handle,status,collection.title,sales_channels.name,variants.id,thumbnail,brand.*",
        limit,
        offset,
        q: search,
        status: statusFilters,
        order: sorting ? `${sorting.desc ? "-" : ""}${sorting.id}` : undefined,
      }),
    queryKey: [
      [
        "products",
        limit,
        offset,
        search,
        statusFilters,
        sorting?.id,
        sorting?.desc,
      ],
    ],
  });
  // console.log("Data:: ", data);
  const navigate = useNavigate();
  const goToBrandDetailpage = () => {
    navigate(`/brands/${id}`);
  };

  const table = useDataTable({
    columns,
    data: (data?.products as unknown as AdminProductBrand[]) || [],
    getRowId: (row) => row.id,
    rowCount: data?.count || 0,
    isLoading,
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
      enableRowSelection: (row) => {
        const { brand } = row.original;
        return brand ? brand.id !== id : true;
      },
    },
  });

  const { mutateAsync: addProducts } = useAddProducts(id!);
  const { mutateAsync: onUnlinkProductBrand } = useBatchDismissLinks();

  const handleSave = async () => {
    try {
      setSaveLoading(true);
      const selectedProductIDs = Object.keys(rowSelection);
      const linkedProducts: AdminProductBrand[] = [];
      const selectedProducts = (data?.products as unknown as AdminProductBrand[]).filter((p) =>
        selectedProductIDs.includes(p.id)
      );
      selectedProducts?.forEach((p) => {
        if (p.brand) {
          linkedProducts.push(p);
        }
      });
      // unlink the products that have a link with other brand
      if (linkedProducts.length > 0) {
        const userHasConfirmed = await dialog({
          title: "Are you sure?",
          description: `You are about to add products that are belong to other brands.`,
        });
        if (userHasConfirmed) {
          console.log("linkedProducts: ", linkedProducts);
          console.log("selectedProductIDs: ", selectedProductIDs);

          await onUnlinkProductBrand({
            ids: linkedProducts.map((p) => ({
              product_id: p.id,
              brand_id: p.brand.id,
            })),
          });
          await addProducts({ products: selectedProductIDs });
          toast.success("", {
            description: "Product was successfully added to the brand.",
          });
          goToBrandDetailpage();
        }
      } else {
        await addProducts({ products: selectedProductIDs });
        toast.success("", {
          description: "Product was successfully added to the brand.",
        });
        goToBrandDetailpage();
      }
    } catch (error) {
      toast.error("", { description: "Add products failed!" });
    } finally {
      setSaveLoading(false);
    }
  };

  return (
    <Container>
      <FocusModal defaultOpen={true}>
        <FocusModal.Content
          onEscapeKeyDown={goToBrandDetailpage}
          onCloseAutoFocus={goToBrandDetailpage}
        >
          <FocusModal.Header>
            <div className="flex items-center justify-end gap-x-2">
              <FocusModal.Close asChild>
                <Button size="small" variant="secondary">
                  Cancel
                </Button>
              </FocusModal.Close>
              <Button
                type="submit"
                size="small"
                isLoading={saveLoading}
                onClick={handleSave}
              >
                Save
              </Button>
            </div>
          </FocusModal.Header>
          <FocusModal.Body>
            <DataTable instance={table}>
              <DataTable.Toolbar className="flex flex-col items-start justify-between gap-2 md:flex-row md:items-center">
                <DataTable.FilterMenu tooltip="Add Filter" />
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
              <DataTable.Pagination />
            </DataTable>
          </FocusModal.Body>
        </FocusModal.Content>
      </FocusModal>
    </Container>
  );
};

export default LinkProductsToBrandPage;
