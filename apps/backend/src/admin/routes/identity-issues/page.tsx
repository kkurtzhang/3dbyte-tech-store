import { defineRouteConfig } from "@medusajs/admin-sdk";
import { ExclamationCircle } from "@medusajs/icons";
import {
  Badge,
  createDataTableColumnHelper,
  DataTable,
  type DataTablePaginationState,
  Input,
  Text,
  useDataTable,
} from "@medusajs/ui";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { Container } from "../../components/container";
import { Header } from "../../components/header";
import { useIdentityIssues } from "../../hooks/account-security";
import {
  type AdminIdentityIssue,
  formatIdentityIssueDate,
  getIdentityIssueCustomerPath,
  getIdentityIssueStatusColor,
  labelizeIdentityIssueValue,
} from "../../lib/identity-issues";

const limit = 15;
const issueTypes = [
  "all",
  "provider_identity_owned_by_other_customer",
  "duplicate_registered_customers",
  "orphan_auth_identity",
  "no_usable_login",
  "consolidation_failed",
  "consolidation_partial",
  "oauth_intent_stale",
  "oauth_intent_repeated_failures",
];
const statuses = ["all", "open", "failed", "partial", "stale", "resolved"];
const providers = ["all", "google", "emailpass"];
const columnHelper = createDataTableColumnHelper<AdminIdentityIssue>();

const columns = [
  columnHelper.accessor("issue_type", {
    header: "Issue",
    cell: ({ getValue }) => labelizeIdentityIssueValue(getValue()),
  }),
  columnHelper.accessor("email", {
    header: "Customer",
    cell: ({ row }) => {
      const path = getIdentityIssueCustomerPath(row.original.customer_id);
      const label = row.original.email || "Unowned identity";

      return path ? (
        <Link className="text-ui-fg-interactive" to={path}>
          {label}
        </Link>
      ) : (
        label
      );
    },
  }),
  columnHelper.accessor("provider", {
    header: "Provider",
    cell: ({ getValue }) => labelizeIdentityIssueValue(getValue()),
  }),
  columnHelper.accessor("status", {
    header: "Status",
    cell: ({ getValue }) => (
      <Badge color={getIdentityIssueStatusColor(getValue())} size="xsmall">
        {labelizeIdentityIssueValue(getValue())}
      </Badge>
    ),
  }),
  columnHelper.accessor("summary", {
    header: "Summary",
  }),
  columnHelper.accessor("occurred_at", {
    header: "Detected",
    cell: ({ getValue }) => formatIdentityIssueDate(getValue()),
  }),
];

const IdentityIssuesPage = () => {
  const [pagination, setPagination] = useState<DataTablePaginationState>({
    pageIndex: 0,
    pageSize: limit,
  });
  const [issueType, setIssueType] = useState("all");
  const [status, setStatus] = useState("all");
  const [provider, setProvider] = useState("all");
  const [email, setEmail] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const offset = pagination.pageIndex * pagination.pageSize;
  const filters = useMemo(
    () => ({
      issueType,
      status,
      provider,
      email,
      dateFrom,
      dateTo,
      limit,
      offset,
    }),
    [dateFrom, dateTo, email, issueType, offset, provider, status],
  );
  const { count, error, issues, isLoading } = useIdentityIssues(filters);
  const table = useDataTable({
    columns,
    data: issues,
    getRowId: (issue) => issue.id,
    isLoading,
    pagination: {
      state: pagination,
      onPaginationChange: setPagination,
    },
    rowCount: count,
  });
  const resetPage = () =>
    setPagination((current) => ({ ...current, pageIndex: 0 }));

  return (
    <Container>
      <Header
        title="Identity Issues"
        subtitle="Read-only review of login identity and guest-history exceptions."
      />
      <div className="grid gap-3 px-6 py-4 md:grid-cols-3 xl:grid-cols-6">
        <Input
          type="email"
          value={email}
          onChange={(event) => {
            resetPage();
            setEmail(event.target.value);
          }}
          placeholder="Customer email"
        />
        <select
          className="rounded-md border border-ui-border-base bg-ui-bg-field px-3 py-2 text-sm"
          value={issueType}
          onChange={(event) => {
            resetPage();
            setIssueType(event.target.value);
          }}
        >
          {issueTypes.map((value) => (
            <option key={value} value={value}>
              {value === "all"
                ? "All issue types"
                : labelizeIdentityIssueValue(value)}
            </option>
          ))}
        </select>
        <select
          className="rounded-md border border-ui-border-base bg-ui-bg-field px-3 py-2 text-sm"
          value={status}
          onChange={(event) => {
            resetPage();
            setStatus(event.target.value);
          }}
        >
          {statuses.map((value) => (
            <option key={value} value={value}>
              {value === "all"
                ? "All statuses"
                : labelizeIdentityIssueValue(value)}
            </option>
          ))}
        </select>
        <select
          className="rounded-md border border-ui-border-base bg-ui-bg-field px-3 py-2 text-sm"
          value={provider}
          onChange={(event) => {
            resetPage();
            setProvider(event.target.value);
          }}
        >
          {providers.map((value) => (
            <option key={value} value={value}>
              {value === "all"
                ? "All providers"
                : labelizeIdentityIssueValue(value)}
            </option>
          ))}
        </select>
        <Input
          aria-label="Detected from"
          type="date"
          value={dateFrom}
          onChange={(event) => {
            resetPage();
            setDateFrom(event.target.value);
          }}
        />
        <Input
          aria-label="Detected to"
          type="date"
          value={dateTo}
          onChange={(event) => {
            resetPage();
            setDateTo(event.target.value);
          }}
        />
      </div>
      {error ? (
        <div className="px-6 py-4">
          <Text size="small" className="text-ui-fg-error">
            Identity issues could not be loaded.
          </Text>
        </div>
      ) : null}
      {!isLoading && !error && issues.length === 0 ? (
        <div className="px-6 py-8 text-center">
          <Text size="small" className="text-ui-fg-subtle">
            No identity issues match these filters.
          </Text>
        </div>
      ) : null}
      <DataTable instance={table}>
        <DataTable.Table />
        <DataTable.Pagination />
      </DataTable>
    </Container>
  );
};

export const config = defineRouteConfig({
  label: "Identity Issues",
  icon: ExclamationCircle,
});

export default IdentityIssuesPage;
