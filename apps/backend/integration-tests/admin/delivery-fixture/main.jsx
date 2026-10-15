import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import "@medusajs/dashboard/css";
import { SupportDeliveries } from "../../../src/admin/components/support-deliveries";
const initial = new URLSearchParams(location.search).get("status") || "unknown";
function App() {
  const [calls, setCalls] = useState([]),
    [refreshes, setRefreshes] = useState(0);
  const [record, setRecord] = useState({
    kind: "internal",
    recipient: "confirmed@example.invalid",
    status: initial,
    version: 2,
    attempt: 1,
    key: "synthetic-original-key",
    notificationId: null,
    providerId: null,
    reviewAfter: null,
    canSend: ["pending", "failed"].includes(initial),
    canReconcile: initial === "unknown",
  });
  async function action(input) {
    setCalls((old) => [...old, input]);
    if (new URLSearchParams(location.search).has("error"))
      throw new Error("Synthetic unavailable");
    const status =
      input.action === "send"
        ? "sent"
        : input.outcome === "accepted"
          ? "sent"
          : input.outcome === "not_accepted"
            ? "failed"
            : "unknown";
    setRecord((old) => ({
      ...old,
      status,
      version: old.version + 1,
      canSend: status === "failed",
      canReconcile: status === "unknown",
    }));
  }
  return (
    <main style={{ maxWidth: 900, margin: "20px auto" }}>
      <SupportDeliveries
        deliveries={[record]}
        onAction={action}
        onRefresh={() => setRefreshes((n) => n + 1)}
      />
      <pre aria-label="Recorded actions">{JSON.stringify(calls)}</pre>
      <output aria-label="Refresh count">{refreshes}</output>
    </main>
  );
}
createRoot(document.getElementById("root")).render(<App />);
