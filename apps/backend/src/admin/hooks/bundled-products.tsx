import { sdk } from "../lib/sdk";
import {
  QueryKey,
  useMutation,
  UseMutationOptions,
  useQuery,
  useQueryClient,
  UseQueryOptions,
} from "@tanstack/react-query";
import { ClientHeaders, FetchError } from "@medusajs/js-sdk";
import {
  AdminBundledProductsResponse,
  BundledProductQueryParams,
  AdminBundledProduct,
} from "../types";

export type CreateBundledProductItemInput = {
  product_id: string;
  quantity: number;
};

export type CreateBundledProductInput = {
  title: string;
  product: {
    title: string;
    options: {
      title: string;
      values: string[];
    }[];
    status: "published";
    variants: {
      title: string;
      prices: Array<{
        currency_code: string;
        amount: number;
      }>;
      options: Record<string, string>;
      manage_inventory: boolean;
    }[];
  };
  items: CreateBundledProductItemInput[];
};

const normalizeLinkedEntity = <T,>(
  value: T | T[] | null | undefined
): T | null => {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
};

const normalizeBundledProduct = (
  bundledProduct: AdminBundledProduct
): AdminBundledProduct => {
  return {
    ...bundledProduct,
    product: normalizeLinkedEntity(bundledProduct.product),
    items: (bundledProduct.items ?? []).map((item) => ({
      ...item,
      product: normalizeLinkedEntity(item.product),
    })),
  };
};

export const useBundledProducts = (
  query: BundledProductQueryParams,
  options?: UseQueryOptions<
    AdminBundledProductsResponse,
    FetchError,
    AdminBundledProductsResponse,
    QueryKey
  >
) => {
  const fetchBundledProducts = (
    nextQuery: BundledProductQueryParams,
    headers?: ClientHeaders
  ) =>
    sdk.client.fetch<AdminBundledProductsResponse>("/admin/bundled-products", {
      query: nextQuery,
      headers,
    });

  const { data, ...rest } = useQuery({
    ...options,
    queryFn: () => fetchBundledProducts(query),
    queryKey: ["bundled-products", query.limit, query.offset, query.order],
  });

  return {
    ...data,
    bundled_products: (data?.bundled_products ?? []).map(normalizeBundledProduct),
    ...rest,
  };
};

export const useCreateBundledProduct = (
  options?: UseMutationOptions<unknown, FetchError, CreateBundledProductInput>
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateBundledProductInput) => {
      return sdk.client.fetch("/admin/bundled-products", {
        method: "post",
        body: payload,
      });
    },
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({
        queryKey: ["bundled-products"],
      });

      options?.onSuccess?.(data, variables, context);
    },
    ...options,
  });
};
