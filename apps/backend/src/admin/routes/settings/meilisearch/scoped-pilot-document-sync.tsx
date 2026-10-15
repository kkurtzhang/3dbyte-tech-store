import { Button, Text, usePrompt } from "@medusajs/ui";
import { useRef, useState } from "react";
import { PILOT_DOCUMENTS, syncPilotDocuments } from "../../../lib/pilot-document-sync";
import { sdk } from "../../../lib/sdk";

type Stage = "idle" | "confirming" | "pending" | "succeeded" | "unconfirmed";

export const ScopedPilotDocumentSync = () => {
  const prompt = usePrompt();
  const inFlight = useRef(false);
  const [stage, setStage] = useState<Stage>("idle");

  const handleSync = async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setStage("confirming");
    try {
      const confirmed = await prompt({
        title: "Sync two pilot documents?",
        description: `Submit only ${PILOT_DOCUMENTS.map((document) => document.id).join(" and ")}. Check staging settings approval, published revisions, and review freshness first. A failed request may have partially updated these two records; inspect index state before retrying.`,
        confirmText: "Sync these two documents",
        cancelText: "Cancel",
      });
      if (!confirmed) {
        inFlight.current = false;
        setStage("idle");
        return;
      }
      setStage("pending");
      await syncPilotDocuments((documentIds) => sdk.client.fetch(
        "/admin/meilisearch/sync-product-documents/scoped",
        { method: "POST", body: { document_ids: documentIds } },
      ));
      setStage("succeeded");
    } catch {
      // Do not retry, expose server details, or imply that failed writes rolled back.
      setStage("unconfirmed");
    }
  };

  return (
    <section aria-label="Two-document pilot" className="mb-10 border-b border-ui-border-base pb-6">
      <h3 className="mb-4 text-lg font-semibold">Two-document pilot</h3>
      <div className="flex flex-col gap-y-4">
        <Text size="small" className="text-ui-fg-subtle">
          Run after staging settings approval and readiness checks. Uses the current
          published, approved knowledge for these two document IDs. Verify the
          returned index revisions against the approved pilot revisions afterwards.
        </Text>
        <ul className="list-disc pl-5 text-sm">
          {PILOT_DOCUMENTS.map((document) => (
            <li key={document.id}>{document.title}: <code>{document.id}</code></li>
          ))}
        </ul>
        <Text size="small" className="text-ui-fg-subtle">
          This action does not configure the index. The server rejects an unready
          index. Other records remain outside this request's scope.
        </Text>
        <div>
          <Button variant="secondary" disabled={stage !== "idle"}
            isLoading={stage === "pending"} onClick={() => void handleSync()}>
            Sync two pilot documents
          </Button>
        </div>
        {stage === "succeeded" && (
          <p role="status" className="text-sm">
            Server confirmed 2 indexed documents, 0 deletions, and 2 approved knowledge projections.
            Verify task history and both revision hashes before using retrieval results.
          </p>
        )}
        {stage === "unconfirmed" && (
          <p role="alert" className="text-sm text-ui-fg-error">
            Sync outcome unconfirmed. Check index state before another attempt;
            these two records may have changed. No automatic retry was made.
            Resolve authentication or readiness errors through the existing Admin
            workflow, then reload only after checking the outcome.
          </p>
        )}
      </div>
    </section>
  );
};
