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
  AdminSupportTicketMessageResponse,
  AdminSupportTicketResponse,
  AdminSupportTicketsResponse,
  AdminSupportTicketStatusResponse,
  CreateSupportTicketMessageParams,
  SupportTicketQueryParams,
  UpdateSupportTicketStatusParams,
} from "../types"

export const supportTicketQueryKeys = {
  all: ["support-tickets"] as const,
  list: (query: SupportTicketQueryParams) =>
    ["support-tickets", "list", query] as const,
  detail: (id: string) => ["support-tickets", "detail", id] as const,
}

export const useSupportTickets = (
  query: SupportTicketQueryParams,
  options?: UseQueryOptions<
    AdminSupportTicketsResponse,
    FetchError,
    AdminSupportTicketsResponse,
    QueryKey
  >,
) => {
  const fetchTickets = (headers?: ClientHeaders) =>
    sdk.client.fetch<AdminSupportTicketsResponse>("/admin/support-tickets", {
      query,
      headers,
    })

  const { data, ...rest } = useQuery({
    ...options,
    queryFn: () => fetchTickets(),
    queryKey: supportTicketQueryKeys.list(query),
  })

  return {
    count: data?.count || 0,
    limit: data?.limit || query.limit,
    offset: data?.offset || query.offset,
    tickets: data?.tickets || [],
    ...rest,
  }
}

export const useSupportTicket = (
  id: string,
  options?: UseQueryOptions<
    AdminSupportTicketResponse,
    FetchError,
    AdminSupportTicketResponse,
    QueryKey
  >,
) => {
  const { data, ...rest } = useQuery({
    ...options,
    enabled: Boolean(id) && options?.enabled !== false,
    queryFn: () =>
      sdk.client.fetch<AdminSupportTicketResponse>(
        `/admin/support-tickets/${id}`,
      ),
    queryKey: supportTicketQueryKeys.detail(id),
  })

  return {
    events: data?.events || [],
    messages: data?.messages || [],
    ticket: data?.ticket,
    ...rest,
  }
}

const useInvalidateSupportTickets = (id?: string) => {
  const queryClient = useQueryClient()

  return () => {
    queryClient.invalidateQueries({ queryKey: supportTicketQueryKeys.all })

    if (id) {
      queryClient.invalidateQueries({
        queryKey: supportTicketQueryKeys.detail(id),
      })
    }
  }
}

export const useUpdateSupportTicketStatus = (
  id: string,
  options?: UseMutationOptions<
    AdminSupportTicketStatusResponse,
    FetchError,
    UpdateSupportTicketStatusParams
  >,
) => {
  const invalidate = useInvalidateSupportTickets(id)

  return useMutation({
    mutationFn: (payload: UpdateSupportTicketStatusParams) =>
      sdk.client.fetch<AdminSupportTicketStatusResponse>(
        `/admin/support-tickets/${id}/status`,
        {
          method: "post",
          body: payload,
        },
      ),
    onSuccess: (data, variables, context) => {
      invalidate()
      options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}

export const useCreateSupportTicketMessage = (
  id: string,
  options?: UseMutationOptions<
    AdminSupportTicketMessageResponse,
    FetchError,
    CreateSupportTicketMessageParams
  >,
) => {
  const invalidate = useInvalidateSupportTickets(id)

  return useMutation({
    mutationFn: (payload: CreateSupportTicketMessageParams) =>
      sdk.client.fetch<AdminSupportTicketMessageResponse>(
        `/admin/support-tickets/${id}/messages`,
        {
          method: "post",
          body: payload,
        },
      ),
    onSuccess: (data, variables, context) => {
      invalidate()
      options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}
