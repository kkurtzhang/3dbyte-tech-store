import { defineWidgetConfig } from "@medusajs/admin-sdk";
import type {
  AdminCustomer,
  DetailWidgetProps,
} from "@medusajs/framework/types";
import { ExclamationCircle, ShieldCheck } from "@medusajs/icons";
import { Badge, Container, Heading, Text } from "@medusajs/ui";
import { Link } from "react-router-dom";

import { useCustomerAccountSecurity } from "../hooks/account-security";
import {
  formatAccountSecurityDate,
  getAccountSecurityProviderRows,
  getAccountSecurityWarningLabel,
  getProviderBadgeColor,
} from "../lib/account-security";

const CustomerAccountSecurityWidget = ({
  data: customer,
}: DetailWidgetProps<AdminCustomer>) => {
  const { data, error, isLoading } = useCustomerAccountSecurity(customer.id);
  const summary = data?.account_security;
  const providerRows = getAccountSecurityProviderRows(summary?.providers || []);

  return (
    <Container className="divide-y p-0">
      <div className="flex items-start justify-between gap-4 px-6 py-4">
        <div className="space-y-1">
          <Heading level="h2">Account & Login Security</Heading>
          <Text size="small" className="text-ui-fg-subtle">
            Verified ownership, login methods, and guest-history status.
          </Text>
        </div>
        <ShieldCheck className="text-ui-fg-subtle" />
      </div>

      {isLoading ? (
        <div className="px-6 py-4">
          <Text size="small" className="text-ui-fg-subtle">
            Loading account security...
          </Text>
        </div>
      ) : null}

      {error ? (
        <div className="flex items-start gap-2 px-6 py-4 text-ui-fg-error">
          <ExclamationCircle className="mt-0.5 shrink-0" />
          <Text size="small">
            Account security details could not be loaded.
          </Text>
        </div>
      ) : null}

      {summary ? (
        <>
          {summary.warnings.length ? (
            <div className="flex flex-wrap gap-2 px-6 py-4">
              {summary.warnings.map((warning) => (
                <Badge key={warning} color="orange" size="xsmall">
                  {getAccountSecurityWarningLabel(warning)}
                </Badge>
              ))}
              <Link
                className="text-ui-fg-interactive text-sm"
                to="/identity-issues"
              >
                Review identity issues
              </Link>
            </div>
          ) : null}

          <div className="grid gap-4 px-6 py-4 md:grid-cols-2">
            <div className="space-y-2">
              <Text size="small" weight="plus">
                Customer account
              </Text>
              <div className="flex flex-wrap gap-2">
                <Badge
                  color={
                    summary.account_type === "registered" ? "blue" : "grey"
                  }
                  size="xsmall"
                >
                  {summary.account_type === "registered"
                    ? "Registered"
                    : "Guest"}
                </Badge>
                <Badge
                  color={
                    summary.email.verification_status === "verified"
                      ? "green"
                      : "orange"
                  }
                  size="xsmall"
                >
                  Email {summary.email.verification_status}
                </Badge>
              </div>
              <Text size="small" className="break-all text-ui-fg-subtle">
                {summary.email.value || "No canonical email"}
              </Text>
              {summary.email.verified_at ? (
                <Text size="xsmall" className="text-ui-fg-muted">
                  Verified{" "}
                  {formatAccountSecurityDate(summary.email.verified_at)}
                </Text>
              ) : null}
            </div>

            <div className="space-y-2">
              <Text size="small" weight="plus">
                Guest-history consolidation
              </Text>
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  color={
                    summary.consolidation.status === "completed"
                      ? "green"
                      : summary.consolidation.status === "failed"
                        ? "red"
                        : "grey"
                  }
                  size="xsmall"
                >
                  {summary.consolidation.status.split("_").join(" ")}
                </Badge>
                <Text size="small" className="text-ui-fg-subtle">
                  {summary.consolidation.transferred_order_count} orders
                  transferred
                </Text>
              </div>
              {summary.consolidation.completed_at ? (
                <Text size="xsmall" className="text-ui-fg-muted">
                  Completed{" "}
                  {formatAccountSecurityDate(
                    summary.consolidation.completed_at,
                  )}
                </Text>
              ) : null}
            </div>
          </div>

          <div className="space-y-3 px-6 py-4">
            <Text size="small" weight="plus">
              Login methods
            </Text>
            <div className="grid gap-3 md:grid-cols-2">
              {providerRows.map((provider) => (
                <div
                  key={provider.key}
                  className="flex items-start justify-between gap-3 rounded-md border border-ui-border-base px-3 py-3"
                >
                  <div>
                    <Text size="small" weight="plus">
                      {provider.label}
                    </Text>
                    <Text size="xsmall" className="text-ui-fg-muted">
                      {provider.linkedAt
                        ? `Linked ${formatAccountSecurityDate(provider.linkedAt)}`
                        : "Not linked"}
                    </Text>
                  </div>
                  <Badge
                    color={getProviderBadgeColor(provider.linked)}
                    size="xsmall"
                  >
                    {provider.linked ? "Linked" : "Not linked"}
                  </Badge>
                </div>
              ))}
            </div>
          </div>

          <div className="px-6 py-4">
            <Text size="small" weight="plus">
              Last security event
            </Text>
            {summary.last_security_event ? (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Badge
                  color={
                    summary.last_security_event.severity === "error"
                      ? "red"
                      : "grey"
                  }
                  size="xsmall"
                >
                  {summary.last_security_event.event_type.split("_").join(" ")}
                </Badge>
                {summary.last_security_event.provider ? (
                  <Text size="small" className="capitalize text-ui-fg-subtle">
                    {summary.last_security_event.provider}
                  </Text>
                ) : null}
                <Text size="small" className="text-ui-fg-muted">
                  {formatAccountSecurityDate(
                    summary.last_security_event.created_at,
                  )}
                </Text>
              </div>
            ) : (
              <Text size="small" className="mt-2 text-ui-fg-subtle">
                No security activity recorded.
              </Text>
            )}
          </div>
        </>
      ) : null}
    </Container>
  );
};

export const config = defineWidgetConfig({
  zone: "customer.details.before",
});

export default CustomerAccountSecurityWidget;
