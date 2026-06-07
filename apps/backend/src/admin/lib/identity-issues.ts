import type { Badge } from "@medusajs/ui";
import type React from "react";

type BadgeColor = React.ComponentProps<typeof Badge>["color"];

export type AdminIdentityIssue = {
  id: string;
  issue_type: string;
  status: string;
  provider: string | null;
  email: string | null;
  customer_id: string | null;
  occurred_at: string;
  summary: string;
};

export type AdminIdentityIssuesResponse = {
  identity_issues: AdminIdentityIssue[];
  count: number;
  limit: number;
  offset: number;
};

export type IdentityIssueFilters = {
  issueType: string;
  status: string;
  provider: string;
  email: string;
  dateFrom: string;
  dateTo: string;
  limit: number;
  offset: number;
};

export const buildIdentityIssuesQuery = (filters: IdentityIssueFilters) => ({
  ...(filters.issueType === "all" ? {} : { issue_type: filters.issueType }),
  ...(filters.status === "all" ? {} : { status: filters.status }),
  ...(filters.provider === "all" ? {} : { provider: filters.provider }),
  ...(filters.email.trim() ? { email: filters.email.trim() } : {}),
  ...(filters.dateFrom
    ? { date_from: `${filters.dateFrom}T00:00:00.000Z` }
    : {}),
  ...(filters.dateTo ? { date_to: `${filters.dateTo}T23:59:59.999Z` } : {}),
  limit: filters.limit,
  offset: filters.offset,
});

export const labelizeIdentityIssueValue = (value?: string | null): string =>
  value
    ? value
        .split("_")
        .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
        .join(" ")
    : "-";

export const getIdentityIssueStatusColor = (status: string): BadgeColor => {
  if (status === "resolved") return "green";
  if (status === "failed") return "red";
  if (status === "partial" || status === "stale") return "orange";
  return "orange";
};

export const getIdentityIssueCustomerPath = (
  customerId?: string | null,
): string | null => (customerId ? `/customers/${customerId}` : null);

export const formatIdentityIssueDate = (value?: string | null): string => {
  if (!value) return "-";

  return new Intl.DateTimeFormat("en-AU", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
};
