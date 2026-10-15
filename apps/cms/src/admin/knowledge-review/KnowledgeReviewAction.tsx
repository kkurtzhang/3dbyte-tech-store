import { useCallback, useEffect, useState } from "react";
import { useFetchClient, useRBAC } from "@strapi/strapi/admin";
import {
  Box,
  Button,
  Field,
  Flex,
  Modal,
  Textarea,
  TextInput,
  Typography,
} from "@strapi/design-system";
import type { DocumentActionComponent } from "@strapi/content-manager/strapi-admin";
import type { KnowledgeDocumentBody } from "@3dbyte-tech-store/shared-types";
import {
  DOCUMENT_UID,
  REVIEW_ACTION,
  isPilotDocument,
} from "../../knowledge-review/constants";

type Decision = {
  decision: "approved" | "rejected";
  content_revision: string;
  decided_at: string;
  valid_until: string;
  actor_type: string;
  actor_id: string;
};
type Packet = {
  document: KnowledgeDocumentBody;
  revision_hash: string;
  status: "draft" | "published";
  current_decision: Decision | null;
};
function DecisionDetails({ decision }: { decision: Decision }) {
  return (
    <Typography tag="p">
      {decision.decision === "approved" ? "Approved" : "Rejected"} revision{" "}
      {decision.content_revision}. Recorded by {decision.actor_type}{" "}
      {decision.actor_id} at {decision.decided_at}; valid until{" "}
      {decision.valid_until}.
    </Typography>
  );
}
function ReviewPacket({ document: d, revision_hash, status }: Packet) {
  return (
    <Flex direction="column" alignItems="stretch" gap={4}>
      <Typography tag="h2" variant="beta">
        {d.document_title}
      </Typography>
      <Typography tag="p">
        Saved {status} revision. Unsaved editor changes are not included.
      </Typography>
      <Box
        background="neutral100"
        padding={4}
        borderRadius="4px"
        style={{ overflowWrap: "anywhere" }}
      >
        <Typography tag="p">
          Product: {d.product_title} ({d.product_handle})
        </Typography>
        <Typography tag="p">Product ID: {d.product_id}</Typography>
        <Typography tag="p">Document ID: {d.document_id}</Typography>
        <Typography tag="p">
          Scope: {d.binding_scope ?? "variant"}; variant:{" "}
          {d.variant_id ?? "Not specified (product scope)"}
        </Typography>
        <Typography tag="p">Revision SHA-256: {revision_hash}</Typography>
      </Box>
      <Typography tag="h3" variant="delta">
        Source evidence
      </Typography>
      <Typography tag="p">
        <a href={d.source_url} target="_blank" rel="noopener noreferrer">
          {d.source_url}
        </a>
      </Typography>
      <Typography tag="p">
        {d.source_kind}; version: {d.source_version}; checked:{" "}
        {d.source_checked_at}
      </Typography>
      <Typography tag="p" style={{ overflowWrap: "anywhere" }}>
        Source SHA-256: {d.source_sha256}
      </Typography>
      <Typography tag="h3" variant="delta">
        Cleaned source content
      </Typography>
      <Box
        padding={4}
        background="neutral100"
        style={{
          whiteSpace: "pre-wrap",
          overflowWrap: "anywhere",
          maxHeight: 280,
          overflowY: "auto",
        }}
      >
        <Typography>{d.text}</Typography>
      </Box>
      <Typography tag="h3" variant="delta">
        Facts and unknowns
      </Typography>
      {d.facts.map((fact, index) => (
        <Box key={`${fact.field}-${index}`} padding={3} background="neutral100">
          <Typography tag="p" fontWeight="bold">
            {fact.label} ({fact.field})
          </Typography>
          <Typography tag="p">
            {fact.value ?? "Unknown — no supported value"}
          </Typography>
          <Typography tag="p">
            Evidence: {fact.evidence_excerpt || "None recorded"}
            {fact.page ? ` (page ${fact.page})` : ""}
          </Typography>
        </Box>
      ))}
    </Flex>
  );
}
function ReviewModal({
  documentId,
  status,
  onClose,
}: {
  documentId: string;
  status: "draft" | "published";
  onClose: () => void;
}) {
  const { get, post } = useFetchClient();
  const [packet, setPacket] = useState<Packet | null>(null);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [note, setNote] = useState(""),
    [expires, setExpires] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const endpoint = `/knowledge-review/${encodeURIComponent(documentId)}`;
  useEffect(() => {
    let active = true;
    setPacket(null);
    setError("");
    setAcknowledged(false);
    setBusy(true);
    void get<{ data: Packet }>(`${endpoint}?status=${status}`)
      .then(({ data }) => {
        if (active) setPacket(data.data);
      })
      .catch(() => {
        if (active)
          setError(
            "Review packet unavailable. Check your review and content permissions, and that this saved revision contains valid knowledge content.",
          );
      })
      .finally(() => {
        if (active) setBusy(false);
      });
    return () => {
      active = false;
    };
  }, [endpoint, status, get]);
  const submit = useCallback(
    async (decision: Decision["decision"]) => {
      if (
        !packet ||
        busy ||
        !acknowledged ||
        !note.trim() ||
        !Number.isFinite(Date.parse(expires))
      )
        return;
      setBusy(true);
      setError("");
      try {
        const { data } = await post<{ data: Decision }>(endpoint, {
          status: packet.status,
          revision_hash: packet.revision_hash,
          decision,
          valid_until: new Date(expires).toISOString(),
          evidence_policy: "official_or_two_independent",
          review_note: note.trim(),
        });
        setPacket({ ...packet, current_decision: data.data });
        setAcknowledged(false);
      } catch {
        // A failed/stale write never reuses or silently refreshes an approved packet.
        setPacket(null);
        setAcknowledged(false);
        setError(
          "Decision not confirmed. Close and reopen to inspect the saved revision and any existing decision before trying again.",
        );
      } finally {
        setBusy(false);
      }
    },
    [packet, busy, acknowledged, note, expires, endpoint, post],
  );
  const disabled =
    busy ||
    !packet ||
    !!packet.current_decision ||
    !acknowledged ||
    !note.trim() ||
    !Number.isFinite(Date.parse(expires)) ||
    Date.parse(expires) <= Date.now();
  return (
    <>
      <Modal.Body>
        <Flex direction="column" alignItems="stretch" gap={5}>
          {busy && (
            <Typography tag="p" role="status">
              Loading…
            </Typography>
          )}
          {error && (
            <Typography tag="p" role="alert" textColor="danger600">
              {error}
            </Typography>
          )}
          {packet && <ReviewPacket {...packet} />}
          {packet?.current_decision ? (
            <Box padding={4} background="neutral100">
              <DecisionDetails decision={packet.current_decision} />
              <Typography tag="p">
                Decisions are immutable for this revision. Publishing and
                indexing are separate operations.
              </Typography>
            </Box>
          ) : (
            packet && (
              <>
                <Typography tag="p">
                  Check the product association, source and each supported fact
                  against official evidence or two independent sources. Leave
                  unsupported facts unknown. This records your account as the
                  reviewer; disclose any agent assistance in the note.
                </Typography>
                <Field.Root name="knowledge-review-note" required>
                  <Field.Label>Review note</Field.Label>
                  <Textarea
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    maxLength={2000}
                    disabled={busy}
                  />
                </Field.Root>
                <Field.Root name="knowledge-review-expiry" required>
                  <Field.Label>Valid until (your local time)</Field.Label>
                  <TextInput
                    type="datetime-local"
                    value={expires}
                    onChange={(event) => setExpires(event.target.value)}
                    disabled={busy}
                  />
                </Field.Root>
                <label>
                  <input
                    type="checkbox"
                    checked={acknowledged}
                    onChange={(event) => setAcknowledged(event.target.checked)}
                    disabled={busy}
                  />{" "}
                  I checked this exact revision and its evidence policy.
                </label>
                <Typography tag="p">
                  Recording a decision does not save editor changes, publish
                  content or request indexing.
                </Typography>
              </>
            )
          )}
        </Flex>
      </Modal.Body>
      <Modal.Footer>
        <Flex gap={2} justifyContent="space-between" width="100%">
          <Button
            type="button"
            variant="tertiary"
            onClick={onClose}
            disabled={busy}
          >
            Close
          </Button>
          <Flex gap={2}>
            <Button
              type="button"
              variant="danger-light"
              disabled={disabled}
              onClick={() => void submit("rejected")}
            >
              Reject revision
            </Button>
            <Button
              type="button"
              disabled={disabled}
              onClick={() => void submit("approved")}
            >
              Approve revision
            </Button>
          </Flex>
        </Flex>
      </Modal.Footer>
    </>
  );
}
export const KnowledgeReviewAction: DocumentActionComponent = ({
  model,
  documentId,
  activeTab,
}) => {
  const { allowedActions, isLoading } = useRBAC([
    { action: REVIEW_ACTION, subject: DOCUMENT_UID },
  ]);
  if (
    model !== DOCUMENT_UID ||
    !isPilotDocument(documentId) ||
    !activeTab ||
    isLoading ||
    !allowedActions.canReview
  )
    return null;
  return {
    label: "Review knowledge",
    position: "panel",
    dialog: {
      type: "modal",
      title: "Review product knowledge",
      content: ({ onClose }) => (
        <ReviewModal
          key={`${documentId}-${activeTab}`}
          documentId={documentId}
          status={activeTab}
          onClose={onClose}
        />
      ),
    },
  };
};
KnowledgeReviewAction.position = "panel";
