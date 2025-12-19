import { sdk } from "../lib/sdk";
import {
  QueryKey,
  useMutation,
  UseMutationOptions,
  useQuery,
  useQueryClient,
  UseQueryOptions,
} from "@tanstack/react-query";
import {
  AddProductToBrandParams,
  AdminBrandResponse,
  AdminBrandsResponse,
  AdminCreateBrand,
  AdminCreateBrandResponse,
  AdminUpdateBrand,
  AdminUpdateBrandResponse,
  BatchDismissLinksBrandsProductsParams,
  BrandQueryParams,
  RemoveProductFromBrandParams,
} from "../types";
import { ClientHeaders, FetchError } from "@medusajs/js-sdk";

export const useBrands = (
  query: BrandQueryParams,
  options?: UseQueryOptions<
    AdminBrandsResponse,
    FetchError,
    AdminBrandsResponse,
    QueryKey
  >
) => {
  const fetchBrands = (query: BrandQueryParams, headers?: ClientHeaders) =>
    sdk.client.fetch<AdminBrandsResponse>(`/admin/brands`, {
      query,
      headers,
    });

  const { data, ...rest } = useQuery({
    ...options,
    queryFn: () => fetchBrands(query)!,
    queryKey:
      query.limit && query.offset
        ? [["brand", "list", query.limit, query.offset]]
        : ["brand", "list"],
  });

  return { ...data, ...rest };
};

export const useBrand = (
  id: string,
  query?: BrandQueryParams,
  options?: UseQueryOptions<
    AdminBrandResponse,
    FetchError,
    AdminBrandResponse,
    QueryKey
  >
) => {
  const fetchBrand = (
    id: string,
    query?: BrandQueryParams,
    headers?: ClientHeaders
  ) =>
    sdk.client.fetch<AdminBrandResponse>(`/admin/brands/${id}`, {
      query,
      headers,
    });

  const { data, ...rest } = useQuery({
    queryFn: () => fetchBrand(id, query),
    queryKey: ["brand", id],
    ...options,
  });

  return { ...data, ...rest };
};

export const useCreateBrand = (
  options?: UseMutationOptions<
    AdminCreateBrandResponse,
    FetchError,
    AdminCreateBrand
  >
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: AdminCreateBrand) => {
      return sdk.client.fetch<AdminCreateBrandResponse>(`/admin/brands`, {
        method: "post",
        body: payload,
      });
    },
    onSuccess: (
      data: AdminCreateBrandResponse,
      variables: AdminCreateBrand,
      context: any
    ) => {
      queryClient.invalidateQueries({
        queryKey: ["brand"],
      });

      options?.onSuccess?.(data, variables, context);
    },
    ...options,
  });
};

export const useRemoveProducts = (
  id: string,
  options?: UseMutationOptions<
    unknown,
    FetchError,
    RemoveProductFromBrandParams
  >
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ products }: RemoveProductFromBrandParams) => {
      return sdk.client.fetch(`/admin/brands/${id}/products`, {
        method: "delete",
        body: { products },
      });
    },
    onSuccess: (data: any, variables: any, context: any) => {
      queryClient.invalidateQueries({
        queryKey: ["brand", id],
      });

      options?.onSuccess?.(data, variables, context);
    },
    ...options,
  });
};

export const useAddProducts = (
  id: string,
  options?: UseMutationOptions<unknown, FetchError, AddProductToBrandParams>
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: AddProductToBrandParams) => {
      return sdk.client.fetch(`/admin/brands/${id}/products`, {
        method: "post",
        body: payload,
      });
    },
    onSuccess: (data: any, variables: any, context: any) => {
      queryClient.invalidateQueries({
        queryKey: ["brand", ["products"]],
      });

      options?.onSuccess?.(data, variables, context);
    },
    ...options,
  });
};

export const useUpdateBrand = (
  id: string,
  options?: UseMutationOptions<
    AdminUpdateBrandResponse,
    FetchError,
    AdminUpdateBrand
  >
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: AdminUpdateBrand) => {
      return sdk.client.fetch<AdminUpdateBrandResponse>(`/admin/brands/${id}`, {
        method: "put",
        body: payload,
      });
    },
    onSuccess: (
      data: AdminUpdateBrandResponse,
      variables: AdminUpdateBrand,
      context: any
    ) => {
      queryClient.invalidateQueries({
        queryKey: ["brand"],
      });

      options?.onSuccess?.(data, variables, context);
    },
    ...options,
  });
};

export const useDeleteBrand = (
  options?: UseMutationOptions<unknown, FetchError, string>
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => {
      return sdk.client.fetch(`/admin/brands/${id}`, {
        method: "delete",
      });
    },
    onSuccess: (data: any, variables: any, context: any) => {
      queryClient.invalidateQueries({
        queryKey: ["brand", ["products"], ["brand"]],
      });

      options?.onSuccess?.(data, variables, context);
    },
    ...options,
  });
};

export const useBatchDismissLinks = (
  options?: UseMutationOptions<
    unknown,
    FetchError,
    BatchDismissLinksBrandsProductsParams
  >
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ ids }: BatchDismissLinksBrandsProductsParams) => {
      return sdk.client.fetch(`/admin/brands/products`, {
        method: "delete",
        body: { ids },
      });
    },
    onSuccess: (data: any, variables: any, context: any) => {
      queryClient.invalidateQueries({
        queryKey: ["brand", ["products"]],
      });

      options?.onSuccess?.(data, variables, context);
    },
    ...options,
  });
};
