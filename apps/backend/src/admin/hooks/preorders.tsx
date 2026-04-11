import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@medusajs/ui";
import type { AdminProductVariant } from "@medusajs/framework/types";
import { sdk } from "../lib/sdk";
import type {
  AdminProductVariantWithPreorder,
  CreatePreorderVariantData,
  PreorderVariantResponse,
} from "../lib/preorders";
import { isEnabledPreorderVariant } from "../lib/preorders";

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Something went wrong";
};

export const usePreorderVariant = (variant: AdminProductVariant) => {
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery<PreorderVariantResponse>({
    queryKey: ["preorder-variant", variant.id],
    enabled: Boolean(variant.product_id),
    queryFn: async () => {
      return sdk.admin.product.retrieveVariant(variant.product_id!, variant.id, {
        fields: "*prices,*preorder_variant,*preorder_variant.prices",
      }) as Promise<PreorderVariantResponse>;
    },
  });

  const invalidateVariant = () => {
    queryClient.invalidateQueries({
      queryKey: ["preorder-variant", variant.id],
    });
  };

  const upsertMutation = useMutation({
    mutationFn: async (payload: CreatePreorderVariantData) => {
      return sdk.client.fetch(`/admin/variants/${variant.id}/preorders`, {
        method: "POST",
        body: payload,
      }) as Promise<{ preorder_variant: AdminProductVariantWithPreorder["preorder_variant"] }>;
    },
    onSuccess: () => {
      invalidateVariant();
      toast.success("Preorder configuration saved successfully");
    },
    onError: (mutationError) => {
      toast.error(`Failed to save preorder configuration: ${getErrorMessage(mutationError)}`);
    },
  });

  const disableMutation = useMutation({
    mutationFn: async () => {
      return sdk.client.fetch(`/admin/variants/${variant.id}/preorders`, {
        method: "DELETE",
      }) as Promise<{ preorder_variant: AdminProductVariantWithPreorder["preorder_variant"] }>;
    },
    onSuccess: () => {
      invalidateVariant();
      toast.success("Preorder configuration removed successfully");
    },
    onError: (mutationError) => {
      toast.error(`Failed to remove preorder configuration: ${getErrorMessage(mutationError)}`);
    },
  });

  return {
    preorderVariant: isEnabledPreorderVariant(data?.variant.preorder_variant)
      ? data.variant.preorder_variant
      : null,
    variantData: data?.variant,
    isLoading,
    error,
    upsertPreorder: upsertMutation.mutateAsync,
    disablePreorder: disableMutation.mutateAsync,
    isUpserting: upsertMutation.isPending,
    isDisabling: disableMutation.isPending,
  };
};
