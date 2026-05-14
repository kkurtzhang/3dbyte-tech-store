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
  AdminWaitlistDemandResponse,
  AdminWaitlistEntriesResponse,
  SendWaitlistTestNotificationParams,
  WaitlistQueryParams,
} from "../types"

export const waitlistQueryKeys = {
  all: ["waitlist"] as const,
  demand: (query: WaitlistQueryParams) =>
    ["waitlist", "demand", query] as const,
  entries: (query: WaitlistQueryParams) =>
    ["waitlist", "entries", query] as const,
}

export const useWaitlistDemand = (
  query: WaitlistQueryParams,
  options?: UseQueryOptions<
    AdminWaitlistDemandResponse,
    FetchError,
    AdminWaitlistDemandResponse,
    QueryKey
  >,
) => {
  const fetchDemand = (headers?: ClientHeaders) =>
    sdk.client.fetch<AdminWaitlistDemandResponse>("/admin/waitlist/demand", {
      query,
      headers,
    })

  const { data, ...rest } = useQuery({
    ...options,
    queryFn: () => fetchDemand(),
    queryKey: waitlistQueryKeys.demand(query),
  })

  return { demand: data?.demand || [], ...rest }
}

export const useWaitlistEntries = (
  query: WaitlistQueryParams,
  options?: UseQueryOptions<
    AdminWaitlistEntriesResponse,
    FetchError,
    AdminWaitlistEntriesResponse,
    QueryKey
  >,
) => {
  const fetchEntries = (headers?: ClientHeaders) =>
    sdk.client.fetch<AdminWaitlistEntriesResponse>("/admin/waitlist/entries", {
      query,
      headers,
    })

  const { data, ...rest } = useQuery({
    ...options,
    queryFn: () => fetchEntries(),
    queryKey: waitlistQueryKeys.entries(query),
  })

  return {
    count: data?.count || 0,
    entries: data?.entries || [],
    limit: data?.limit || query.limit,
    offset: data?.offset || query.offset,
    ...rest,
  }
}

const useInvalidateWaitlist = () => {
  const queryClient = useQueryClient()

  return () => {
    queryClient.invalidateQueries({ queryKey: waitlistQueryKeys.all })
  }
}

export const useMarkWaitlistNotified = (
  options?: UseMutationOptions<unknown, FetchError, string>,
) => {
  const invalidate = useInvalidateWaitlist()

  return useMutation({
    mutationFn: (id: string) =>
      sdk.client.fetch(`/admin/waitlist/${id}/mark-notified`, {
        method: "post",
      }),
    onSuccess: (data, variables, context) => {
      invalidate()
      options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}

export const useResendWaitlistNotification = (
  options?: UseMutationOptions<unknown, FetchError, string>,
) => {
  const invalidate = useInvalidateWaitlist()

  return useMutation({
    mutationFn: (id: string) =>
      sdk.client.fetch(`/admin/waitlist/${id}/resend`, {
        method: "post",
      }),
    onSuccess: (data, variables, context) => {
      invalidate()
      options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}

export const useSendWaitlistTestNotification = (
  options?: UseMutationOptions<
    unknown,
    FetchError,
    SendWaitlistTestNotificationParams
  >,
) =>
  useMutation({
    mutationFn: (payload: SendWaitlistTestNotificationParams) =>
      sdk.client.fetch("/admin/waitlist/test", {
        method: "post",
        body: payload,
      }),
    ...options,
  })
