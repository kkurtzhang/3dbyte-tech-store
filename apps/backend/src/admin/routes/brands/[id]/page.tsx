import {
  LoaderFunctionArgs,
  UIMatch,
  useLoaderData,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { Container } from "../../../components/container";
import { sdk } from "../../../lib/sdk";
import { SingleColumnLayout } from "../../../layouts/single-column";
import { Header } from "../../../components/header";
import { SectionRow } from "../../../components/section-row";
import { Pencil, PlusMini, Trash } from "@medusajs/icons";
import { JsonViewSection } from "../../../components/json-view-section";
import ProductsDataTable from "../../../components/brands/products-data-table";
import { AdminBrandResponse } from "../../../types";
import { EditForm } from "../../../components/brands/edit-form";
import { toast, usePrompt, useToggleState } from "@medusajs/ui";
import { useEffect } from "react";
import { useDeleteBrand } from "../../../hooks/brands";

const BrandPage = () => {
  const { brand } = useLoaderData() as Awaited<AdminBrandResponse>;
  const location = useLocation();
  const { state } = location;
  const { id, name, handle, products } = brand;
  const [editOpen, showEdit, closeEdit] = useToggleState();
  useEffect(() => {
    if (state?.isEdit) {
      showEdit();
    }
  }, []);
  const navigate = useNavigate();
  const dialog = usePrompt();

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

  return (
    <SingleColumnLayout>
      <Container>
        <Header
          title={name}
          actions={[
            {
              type: "action-menu",
              props: {
                groups: [
                  {
                    actions: [
                      {
                        icon: <Pencil />,
                        label: "Edit",
                        onClick: () => {
                          showEdit();
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
                ],
              },
            },
          ]}
        />
        <SectionRow title="Handle" value={`/${handle}`} />
      </Container>
      <Container>
        <Header
          title="Products"
          actions={[
            {
              type: "action-menu",
              props: {
                groups: [
                  {
                    actions: [
                      {
                        icon: <PlusMini />,
                        label: "Add",
                        to: `/brands/${id}/products`,
                      },
                    ],
                  },
                ],
              },
            },
          ]}
        />
        <ProductsDataTable
          product_ids={products.map((p) => p.id)}
          brand_id={id!}
        />
      </Container>
      <Container>
        <JsonViewSection data={brand} />
      </Container>

      <EditForm
        id={id}
        name={name}
        handle={handle}
        editOpen={editOpen}
        showEdit={showEdit}
        closeEdit={closeEdit}
      />
    </SingleColumnLayout>
  );
};

export default BrandPage;

export async function loader({ params }: LoaderFunctionArgs) {
  const { id } = params;

  const { brand } = await sdk.client.fetch<AdminBrandResponse>(
    `/admin/brands/${id}`
  );

  return {
    brand,
  };
}

export const handle = {
  breadcrumb: ({ data }: UIMatch<AdminBrandResponse>) =>
    data.brand.name || "Brand",
};
