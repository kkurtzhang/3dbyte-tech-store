/** Admin-only delivery view. Sent means provider acceptance, not inbox delivery. */
export type SupportDeliveryKind = "customer" | "internal";
export type SupportDeliveryStatus =
  | "pending"
  | "queued"
  | "sent"
  | "failed"
  | "unknown";
export type SupportDeliveryView = {
  kind: SupportDeliveryKind;
  recipient: string | null;
  status: SupportDeliveryStatus;
  version: number;
  attempt: number;
  key: string | null;
  notificationId: string | null;
  providerId: string | null;
  reviewAfter: number | null;
  canSend: boolean;
  canReconcile: boolean;
};
export type SupportDeliveryAction = {
  kind: SupportDeliveryKind;
  expectedVersion: number;
  confirmed: true;
} & (
  | { action: "send" }
  | {
      action: "reconcile";
      outcome: "accepted" | "not_accepted" | "unresolved";
      evidence: string;
      providerReference: string;
      senderStopped: boolean;
    }
);
