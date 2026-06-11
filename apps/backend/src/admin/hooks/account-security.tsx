import type { FetchError } from "@medusajs/js-sdk";
import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryKey,
  type UseQueryOptions,
} from "@tanstack/react-query";

import { type AccountSecurityResponse } from "../lib/account-security";
import {
  type AdminIdentityIssuesResponse,
  type IdentityIssueFilters,
  type ResolveIdentityIssueResponse,
  buildIdentityIssuesQuery,
} from "../lib/identity-issues";
import { sdk } from "../lib/sdk";

export const accountSecurityQueryKeys = {
  customer: (customerId: string) =>
    ["account-security", "customer", customerId] as const,
  issues: (filters: IdentityIssueFilters) =>
    ["account-security", "identity-issues", filters] as const,
};

export const useCustomerAccountSecurity = (
  customerId: string,
  options?: UseQueryOptions<
    AccountSecurityResponse,
    FetchError,
    AccountSecurityResponse,
    QueryKey
  >,
) =>
  useQuery({
    ...options,
    enabled: Boolean(customerId) && options?.enabled !== false,
    queryFn: () =>
      sdk.client.fetch<AccountSecurityResponse>(
        `/admin/customers/${customerId}/account-security`,
      ),
    queryKey: accountSecurityQueryKeys.customer(customerId),
  });

export const useIdentityIssues = (
  filters: IdentityIssueFilters,
  options?: UseQueryOptions<
    AdminIdentityIssuesResponse,
    FetchError,
    AdminIdentityIssuesResponse,
    QueryKey
  >,
) => {
  const { data, ...rest } = useQuery({
    ...options,
    queryFn: () =>
      sdk.client.fetch<AdminIdentityIssuesResponse>("/admin/identity-issues", {
        query: buildIdentityIssuesQuery(filters),
      }),
    queryKey: accountSecurityQueryKeys.issues(filters),
  });

  return {
    count: data?.count || 0,
    issues: data?.identity_issues || [],
    ...rest,
  };
};

export const useResolveIdentityIssue = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (issueId: string) =>
      sdk.client.fetch<ResolveIdentityIssueResponse>(
        "/admin/identity-issues/resolve",
        {
          method: "POST",
          body: { issue_id: issueId },
        },
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["account-security"],
      });
    },
  });
};
