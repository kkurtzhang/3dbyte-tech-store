import { CheckCircle, ShieldCheck } from "lucide-react";

import type {
  AccountSecurityEvent,
  CustomerAccountSecurity,
} from "@/app/actions/account-security";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

const EVENT_LABELS: Record<string, string> = {
  "login_method.emailpass.added": "Password login added",
  "login_method.google.disconnected": "Google login disconnected",
  "login_method.google.linked": "Google login connected",
  "guest_history.consolidated": "Previous order history connected",
};

function formatEvent(event: AccountSecurityEvent) {
  return EVENT_LABELS[event.event_type] || "Account security updated";
}

function formatEventDate(value: string | null) {
  if (!value) return null;

  return new Intl.DateTimeFormat("en-AU", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function AccountSecurityOverview({
  accountSecurity,
}: {
  accountSecurity?: CustomerAccountSecurity | null;
}) {
  if (!accountSecurity) return null;

  const orderCount = accountSecurity.consolidation.transferred_order_count;

  return (
    <div className="space-y-3 rounded-md border p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-emerald-600" />
          <div>
            <p className="font-medium">Verified email</p>
            <p className="text-sm text-muted-foreground">
              {accountSecurity.email.value}
            </p>
          </div>
        </div>
        <Badge
          variant={
            accountSecurity.email.verification_status === "verified"
              ? "secondary"
              : "outline"
          }
        >
          {accountSecurity.email.verification_status === "verified"
            ? "Verified"
            : "Verification pending"}
        </Badge>
      </div>

      {accountSecurity.consolidation.status === "completed" &&
        orderCount > 0 && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              Account ready. We connected {orderCount} previous{" "}
              {orderCount === 1 ? "order" : "orders"}.
            </AlertDescription>
          </Alert>
        )}

      {accountSecurity.recent_security_events.length > 0 && (
        <div>
          <p className="mb-2 text-sm font-medium">Recent security activity</p>
          <ul className="space-y-2">
            {accountSecurity.recent_security_events.slice(0, 3).map((event) => (
              <li
                className="flex flex-wrap justify-between gap-2 text-sm"
                key={`${event.event_type}-${event.created_at}`}
              >
                <span>{formatEvent(event)}</span>
                <span className="text-muted-foreground">
                  {formatEventDate(event.created_at)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
