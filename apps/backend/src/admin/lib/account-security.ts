export type AccountSecurityProvider = {
  provider: string;
  linked: boolean;
  linked_at?: string | null;
};

export type AccountSecurityEvent = {
  event_type: string;
  provider?: string | null;
  severity: string;
  created_at?: string | null;
};

export type AccountSecuritySummary = {
  customer_id: string;
  account_type: "guest" | "registered";
  email: {
    value: string | null;
    verification_status: string;
    verified_at: string | null;
  };
  providers: AccountSecurityProvider[];
  consolidation: {
    status: string;
    transferred_order_count: number;
    completed_at: string | null;
  };
  last_security_event: AccountSecurityEvent | null;
  recent_security_events: AccountSecurityEvent[];
  warnings: string[];
};

export type AccountSecurityResponse = {
  account_security: AccountSecuritySummary;
};

export const getProviderBadgeColor = (linked: boolean): "green" | "grey" =>
  linked ? "green" : "grey";

export const getAccountSecurityProviderRows = (
  providers: AccountSecurityProvider[],
) => {
  const linkedByProvider = new Map(
    providers.map((provider) => [provider.provider.toLowerCase(), provider]),
  );

  return [
    { key: "emailpass", label: "Email/password" },
    { key: "google", label: "Google" },
  ].map(({ key, label }) => ({
    key,
    label,
    linked: linkedByProvider.get(key)?.linked === true,
    linkedAt: linkedByProvider.get(key)?.linked_at || null,
  }));
};

export const getAccountSecurityWarningLabel = (warning: string): string => {
  const labels: Record<string, string> = {
    no_usable_login: "No usable login method",
    identity_conflict: "Identity conflict",
    consolidation_failed: "Consolidation failed",
    consolidation_partial: "Consolidation incomplete",
  };

  return labels[warning] || warning.split("_").join(" ");
};

export const formatAccountSecurityDate = (value?: string | null): string => {
  if (!value) return "-";

  return new Intl.DateTimeFormat("en-AU", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
};
