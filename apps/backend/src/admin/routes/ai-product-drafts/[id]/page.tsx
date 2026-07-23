import { Badge, Button, Heading, Text, Textarea, toast } from "@medusajs/ui"
import { useState } from "react"
import { Link, useParams } from "react-router-dom"

import { Container } from "../../../components/container"
import { Header } from "../../../components/header"
import { JsonViewSection } from "../../../components/json-view-section"
import {
  useAiProductDraft,
  useApproveAiProductDraft,
  useImportAiProductDraft,
  useRejectAiProductDraft,
} from "../../../hooks/ai-product-drafts"
import {
  formatAiProductDraftDate,
  getAiProductDraftDisplayName,
  getAiProductDraftStatusBadgeColor,
  labelizeAiProductDraftValue,
} from "../../../lib/ai-product-drafts"

const asObject = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}

const AiProductDraftDetailPage = () => {
  const { id = "" } = useParams()
  const { draft, events, isLoading } = useAiProductDraft(id)
  const [rejectionReason, setRejectionReason] = useState("")
  const { mutateAsync: approveDraft, isPending: isApproving } =
    useApproveAiProductDraft(id)
  const { mutateAsync: rejectDraft, isPending: isRejecting } =
    useRejectAiProductDraft(id)
  const { mutateAsync: importDraft, isPending: isImporting } =
    useImportAiProductDraft(id)

  if (isLoading) {
    return (
      <Container>
        <Header title="AI Product Draft" subtitle="Loading draft details..." />
      </Container>
    )
  }

  if (!draft) {
    return (
      <Container>
        <Header
          title="AI Product Draft"
          subtitle="The requested draft could not be found."
          actions={[
            {
              type: "custom",
              children: (
                <Button asChild size="small" variant="secondary">
                  <Link to="/ai-product-drafts">Back to drafts</Link>
                </Button>
              ),
            },
          ]}
        />
      </Container>
    )
  }

  const normalizedDraft = asObject(draft.normalized_draft)

  return (
    <div className="flex flex-col gap-y-3">
      <Container>
        <Header
          title={getAiProductDraftDisplayName(draft)}
          subtitle={`Draft ${draft.id}`}
          actions={[
            {
              type: "custom",
              children: (
                <Button asChild size="small" variant="secondary">
                  <Link to="/ai-product-drafts">Back</Link>
                </Button>
              ),
            },
          ]}
        />
        <div className="grid gap-4 px-6 py-4 md:grid-cols-4">
          <div>
            <Text size="small" className="text-ui-fg-subtle">
              Status
            </Text>
            <Badge
              color={getAiProductDraftStatusBadgeColor(draft.status)}
              size="xsmall"
            >
              {labelizeAiProductDraftValue(draft.status)}
            </Badge>
          </div>
          <div>
            <Text size="small" className="text-ui-fg-subtle">
              Source
            </Text>
            <Text>{draft.source_agent || "hermes"}</Text>
          </div>
          <div>
            <Text size="small" className="text-ui-fg-subtle">
              Confidence
            </Text>
            <Text>
              {typeof draft.confidence_summary?.overall === "number"
                ? `${Math.round(draft.confidence_summary.overall * 100)}%`
                : "-"}
            </Text>
          </div>
          <div>
            <Text size="small" className="text-ui-fg-subtle">
              Created
            </Text>
            <Text>{formatAiProductDraftDate(draft.created_at)}</Text>
          </div>
        </div>
      </Container>

      <Container>
        <Header title="Review Actions" subtitle="Approve, reject, or import this draft." />
        <div className="flex flex-wrap gap-3 px-6 py-4">
          <Button
            disabled={draft.status !== "needs_review"}
            isLoading={isApproving}
            size="small"
            onClick={async () => {
              await approveDraft({ notes: "Approved from Admin review." })
              toast.success("AI product draft approved")
            }}
          >
            Approve
          </Button>
          <Button
            disabled={draft.status !== "approved"}
            isLoading={isImporting}
            size="small"
            variant="secondary"
            onClick={async () => {
              await importDraft()
              toast.success("AI product draft imported")
            }}
          >
            Import
          </Button>
        </div>
        <div className="flex flex-col gap-3 px-6 py-4">
          <Textarea
            value={rejectionReason}
            onChange={(event) => setRejectionReason(event.target.value)}
            placeholder="Reason for rejection"
            rows={3}
          />
          <Button
            className="w-fit"
            disabled={draft.status === "imported" || !rejectionReason.trim()}
            isLoading={isRejecting}
            size="small"
            variant="danger"
            onClick={async () => {
              await rejectDraft({ reason: rejectionReason })
              setRejectionReason("")
              toast.success("AI product draft rejected")
            }}
          >
            Reject
          </Button>
        </div>
      </Container>

      <Container>
        <Header title="Draft Summary" subtitle="Normalized metadata, content, and warnings." />
        <div className="grid gap-4 px-6 py-4 md:grid-cols-2">
          <div>
            <Heading level="h3">Metadata</Heading>
            <pre className="mt-2 max-h-80 overflow-auto rounded-md bg-ui-bg-subtle p-3 text-xs">
              {JSON.stringify(asObject(normalizedDraft.metadata), null, 2)}
            </pre>
          </div>
          <div>
            <Heading level="h3">Content</Heading>
            <pre className="mt-2 max-h-80 overflow-auto rounded-md bg-ui-bg-subtle p-3 text-xs">
              {JSON.stringify(asObject(normalizedDraft.content_draft), null, 2)}
            </pre>
          </div>
        </div>
        <div className="px-6 py-4">
          <Heading level="h3">Warnings</Heading>
          <div className="mt-2 flex flex-col gap-2">
            {(draft.warnings || []).length === 0 ? (
              <Text className="text-ui-fg-subtle">No warnings.</Text>
            ) : (
              (draft.warnings || []).map((warning, index) => (
                <Text key={`${warning}-${index}`}>{warning}</Text>
              ))
            )}
          </div>
        </div>
      </Container>

      <Container>
        <Header title="Events" subtitle="Audit trail for this draft." />
        <div className="flex flex-col gap-2 px-6 py-4">
          {events.length === 0 ? (
            <Text className="text-ui-fg-subtle">No events yet.</Text>
          ) : (
            events.map((event) => (
              <div className="flex items-center justify-between gap-3" key={event.id}>
                <Text>{labelizeAiProductDraftValue(event.type)}</Text>
                <Text className="text-ui-fg-subtle" size="small">
                  {formatAiProductDraftDate(event.created_at)}
                </Text>
              </div>
            ))
          )}
        </div>
      </Container>

      <JsonViewSection data={asObject(draft.raw_packet)} />
    </div>
  )
}

export default AiProductDraftDetailPage
