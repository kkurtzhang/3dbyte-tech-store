import { defineRouteConfig } from "@medusajs/admin-sdk";
import {
  InformationCircleSolid,
  Pencil,
  TagSolid,
  Trash,
} from "@medusajs/icons";
import {
  Button,
  createDataTableColumnHelper,
  DataTable,
  DataTablePaginationState,
  FocusModal,
  Heading,
  Input,
  Label,
  toast,
  Tooltip,
  useDataTable,
  usePrompt,
  Text,
  useToggleState,
} from "@medusajs/ui";
import { useMemo, useState } from "react";
import { Header } from "../../components/header";
import { Container } from "../../components/container";
import { useNavigate } from "react-router-dom";
import { ActionMenu } from "../../components/action-menu";
import { useBrands, useCreateBrand, useDeleteBrand } from "../../hooks/brands";
import { AdminBrand } from "../../types";
import * as zod from "zod";
import { Controller, FormProvider, useForm } from "react-hook-form";
import { HandleInput } from "../../components/handle-input";

const columnHelper = createDataTableColumnHelper<AdminBrand>();

const columns = [
  columnHelper.accessor("name", {
    header: "Name",
  }),
  columnHelper.accessor("handle", {
    header: "Handle",
  }),
  columnHelper.accessor("products", {
    header: "Products",
    cell: ({ getValue }) => getValue()?.length || 0,
  }),
  columnHelper.accessor("id", {
    header: "",
    cell: ({ row }) => {
      const { id, name } = row.original;
      const { mutateAsync: deleteBrand } = useDeleteBrand();
      const onDeleteBrand = async (id: string) => {
        try {
          await deleteBrand(id);
          toast.success("", {
            description: `Brand ${name} was successfully deleted.`,
          });
        } catch (e) {
          toast.error("", { description: "Delete brand failed!" });
        }
      };
      const dialog = usePrompt();
      const navigate = useNavigate();
      return (
        <div>
          <ActionMenu
            groups={[
              {
                actions: [
                  {
                    icon: <Pencil />,
                    label: "Edit",
                    onClick: () => {
                      navigate(`/brands/${id}`, { state: { isEdit: true } });
                    },
                  },
                  {
                    icon: <Trash />,
                    label: "Delete",
                    onClick: async () => {
                      const userHasConfirmed = await dialog({
                        title: "Are you sure?",
                        description: `You are about to delete the brand ${name}. This action cannot be undone.`,
                      });
                      if (userHasConfirmed) {
                        onDeleteBrand(id);
                        navigate("/brands");
                      }
                    },
                  },
                ],
              },
            ]}
          />
        </div>
      );
    },
  }),
];
const limit = 10;

const schema = zod.object({
  name: zod.string(),
  handle: zod.string().optional(), // Optional field
});
const BrandsPage = () => {
  const [pagination, setPagination] = useState<DataTablePaginationState>({
    pageSize: limit,
    pageIndex: 0,
  });
  const offset = useMemo(() => {
    return pagination.pageIndex * limit;
  }, [pagination]);

  const navigate = useNavigate();

  const form = useForm<zod.infer<typeof schema>>({
    defaultValues: {
      name: "",
      handle: "",
    },
  });

  const [saveLoading, setSaveLoading] = useState(false);
  const [createOpen, showCreate, closeCreate] = useToggleState();

  const {
    brands = [],
    count = 0,
    isLoading,
  } = useBrands({
    limit: limit,
    offset: offset,
    order: "-created_at",
  });

  const table = useDataTable({
    columns,
    data: brands,
    getRowId: (row) => row.id,
    onRowClick: (event, row) => {
      navigate(`/brands/${row.id}`);
    },
    rowCount: count,
    isLoading,
    pagination: {
      state: pagination,
      onPaginationChange: setPagination,
    },
  });

  const { mutateAsync: onCreateBrand } = useCreateBrand();
  const onSave = form.handleSubmit(async ({ name, handle }) => {
    try {
      setSaveLoading(true);
      const newHandle = handle ? handle.toLowerCase() : name.toLowerCase();
      const { id } = await onCreateBrand({ name, handle: newHandle });
      toast.success("", {
        description: `Brand ${name} was successfully created.`,
      });
      navigate(`/brands/${id}`);
    } catch (error) {
      toast.error("", { description: "Create brand failed!" });
    } finally {
      setSaveLoading(false);
      closeCreate();
    }
  });

  return (
    <Container>
      <Header
        title="Brands"
        subtitle="Organize products into brands."
        actions={[
          {
            type: "button",
            props: {
              children: "Create",
              variant: "secondary",
              onClick: () => {
                showCreate();
              },
            },
          },
        ]}
      />
      <DataTable instance={table}>
        <DataTable.Table />
        <DataTable.Pagination />
      </DataTable>

      <FocusModal
        open={createOpen}
        onOpenChange={(modalOpened) => {
          if (!modalOpened) {
            closeCreate();
          }
        }}
      >
        <FocusModal.Content onEscapeKeyDown={closeCreate}>
          <FormProvider {...form}>
            <form
              onSubmit={onSave}
              className="flex h-full flex-col overflow-hidden"
            >
              <FocusModal.Header>
                <div className="flex items-center justify-end gap-x-2">
                  <FocusModal.Close asChild>
                    <Button
                      size="small"
                      variant="secondary"
                      onClick={closeCreate}
                    >
                      Cancel
                    </Button>
                  </FocusModal.Close>
                  <Button type="submit" size="small" isLoading={saveLoading}>
                    Save
                  </Button>
                </div>
              </FocusModal.Header>
              <FocusModal.Body>
                <div className="flex flex-1 flex-col items-center overflow-y-auto">
                  <div className="mx-auto flex w-full max-w-[720px] flex-col gap-y-8 px-2 py-16">
                    <div>
                      <Heading className="capitalize">Create Brand</Heading>
                      <Text className="text-ui-fg-subtle" size="small">
                        Create a new brand to organize your products.
                      </Text>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <Controller
                        control={form.control}
                        name="name"
                        render={({ field }) => {
                          return (
                            <div className="flex flex-col space-y-2">
                              <div className="flex items-center gap-x-1">
                                <Label size="small" weight="plus">
                                  Name
                                </Label>
                              </div>
                              <Input {...field} />
                            </div>
                          );
                        }}
                      />
                      <Controller
                        control={form.control}
                        name="handle"
                        render={({ field }) => (
                          <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-1">
                              <Label htmlFor="hanlde">Handle</Label>
                              <Label>
                                <Tooltip content="The handle is used to reference the brand in your storefront. If not specified, the handle will be generated from the brand name.">
                                  <InformationCircleSolid />
                                </Tooltip>
                              </Label>
                              <Label>(Optional)</Label>
                            </div>
                            <HandleInput {...field} />
                          </div>
                        )}
                      />
                    </div>
                  </div>
                </div>
              </FocusModal.Body>
            </form>
          </FormProvider>
        </FocusModal.Content>
      </FocusModal>
    </Container>
  );
};

export const config = defineRouteConfig({
  label: "Brands",
  icon: TagSolid,
});

export const handle = {
  breadcrumb: () => "Brands",
};

export default BrandsPage;
