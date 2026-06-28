import { ClientHeaders, FetchError } from "@medusajs/js-sdk"
import {
  QueryKey,
  useMutation,
  UseMutationOptions,
  useQuery,
  UseQueryOptions,
  useQueryClient,
} from "@tanstack/react-query"

import { sdk } from "../lib/sdk"
import type {
  AdminAiProductDraftActionResponse,
  AdminAiProductDraftImportParams,
  AdminAiProductDraftRejectParams,
  AdminAiProductDraftResponse,
  AdminAiProductDraftsResponse,
  AiProductDraftQueryParams,
} from "../types"

export const aiProductDraftQueryKeys = {
  all: ["ai-product-drafts"] as const,
  list: (query: AiProductDraftQueryParams) =>
    ["ai-product-drafts", "list", query] as const,
  detail: (id: string) => ["ai-product-drafts", "detail", id] as const,
}

export const useAiProductDrafts = (
  query: AiProductDraftQueryParams,
  options?: UseQueryOptions<
    AdminAiProductDraftsResponse,
    FetchError,
    AdminAiProductDraftsResponse,
    QueryKey
  >
) => {
  const fetchDrafts = (headers?: ClientHeaders) =>
    sdk.client.fetch<AdminAiProductDraftsResponse>(
      "/admin/ai-product-drafts",
      {
        query,
        headers,
      }
    )

  const { data, ...rest } = useQuery({
    ...options,
    queryFn: () => fetchDrafts(),
    queryKey: aiProductDraftQueryKeys.list(query),
  })

  return {
    count: data?.count || 0,
    drafts: data?.drafts || [],
    limit: data?.limit || query.limit,
    offset: data?.offset || query.offset,
    ...rest,
  }
}

export const useAiProductDraft = (
  id: string,
  options?: UseQueryOptions<
    AdminAiProductDraftResponse,
    FetchError,
    AdminAiProductDraftResponse,
    QueryKey
  >
) => {
  const { data, ...rest } = useQuery({
    ...options,
    enabled: Boolean(id) && options?.enabled !== false,
    queryFn: () =>
      sdk.client.fetch<AdminAiProductDraftResponse>(
        `/admin/ai-product-drafts/${id}`
      ),
    queryKey: aiProductDraftQueryKeys.detail(id),
  })

  return {
    draft: data?.draft,
    events: data?.events || [],
    ...rest,
  }
}

const useInvalidateAiProductDrafts = (id?: string) => {
  const queryClient = useQueryClient()

  return () => {
    queryClient.invalidateQueries({ queryKey: aiProductDraftQueryKeys.all })

    if (id) {
      queryClient.invalidateQueries({
        queryKey: aiProductDraftQueryKeys.detail(id),
      })
    }
  }
}

export const useApproveAiProductDraft = (
  id: string,
  options?: UseMutationOptions<
    AdminAiProductDraftActionResponse,
    FetchError,
    { notes?: string }
  >
) => {
  const invalidate = useInvalidateAiProductDrafts(id)

  return useMutation({
    mutationFn: (payload: { notes?: string }) =>
      sdk.client.fetch<AdminAiProductDraftActionResponse>(
        `/admin/ai-product-drafts/${id}/approve`,
        {
          method: "post",
          body: payload,
        }
      ),
    onSuccess: (data, variables, context) => {
      invalidate()
      options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}

export const useRejectAiProductDraft = (
  id: string,
  options?: UseMutationOptions<
    AdminAiProductDraftActionResponse,
    FetchError,
    AdminAiProductDraftRejectParams
  >
) => {
  const invalidate = useInvalidateAiProductDrafts(id)

  return useMutation({
    mutationFn: (payload: AdminAiProductDraftRejectParams) =>
      sdk.client.fetch<AdminAiProductDraftActionResponse>(
        `/admin/ai-product-drafts/${id}/reject`,
        {
          method: "post",
          body: payload,
        }
      ),
    onSuccess: (data, variables, context) => {
      invalidate()
      options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}

export const useImportAiProductDraft = (
  id: string,
  options?: UseMutationOptions<
    AdminAiProductDraftActionResponse,
    FetchError,
    AdminAiProductDraftImportParams | undefined
  >
) => {
  const invalidate = useInvalidateAiProductDrafts(id)

  return useMutation({
    mutationFn: (payload?: AdminAiProductDraftImportParams) =>
      sdk.client.fetch<AdminAiProductDraftActionResponse>(
        `/admin/ai-product-drafts/${id}/import`,
        {
          method: "post",
          body: payload || {},
        }
      ),
    onSuccess: (data, variables, context) => {
      invalidate()
      options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}
