import {
  Badge,
  Button,
  Heading,
  Text,
  Textarea,
  toast,
  usePrompt,
} from "@medusajs/ui"
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
  getAiProductDraftActionAvailability,
  getAiProductDraftDisplayName,
  getAiProductDraftReviewIssues,
  getAiProductDraftStatusBadgeColor,
  labelizeAiProductDraftValue,
} from "../../../lib/ai-product-drafts"

const asObject = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}

function DraftReviewIssues({ issues }: { issues: string[] }) {
  return (
    <Container>
      <Header
        title="Review Warnings"
        subtitle={
          issues.length
            ? "Resolve or consciously accept these issues before approving."
            : "No warnings or validation issues were reported."
        }
      />
      <div className="flex flex-col gap-2 px-6 py-4">
        {issues.length === 0 ? (
          <Text className="text-ui-fg-subtle">
            No review warnings for this draft.
          </Text>
        ) : (
          issues.map((issue, index) => (
            <div
              className="bg-ui-bg-subtle flex items-start gap-3 rounded-md p-3"
              key={`${issue}-${index}`}
            >
              <Badge color="orange" size="xsmall">
                Review
              </Badge>
              <Text className="min-w-0 break-words">{issue}</Text>
            </div>
          ))
        )}
      </div>
    </Container>
  )
}

const AiProductDraftDetailPage = () => {
  const { id = "" } = useParams()
  const { draft, events, isLoading } = useAiProductDraft(id)
  const [rejectionReason, setRejectionReason] = useState("")
  const prompt = usePrompt()
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
  const actionAvailability = getAiProductDraftActionAvailability(draft.status)
  const reviewIssues = getAiProductDraftReviewIssues(draft)

  const handleApprove = async () => {
    try {
      await approveDraft({ notes: "Approved from Admin review." })
      toast.success("AI product draft approved")
    } catch {
      toast.error("Could not approve AI product draft")
    }
  }

  const handleImport = async () => {
    const confirmed = await prompt({
      title: "Import approved draft?",
      description:
        "This updates the target product metadata and creates related Strapi drafts. Review the warnings and proposed content first.",
    })

    if (!confirmed) {
      return
    }

    try {
      await importDraft()
      toast.success("AI product draft imported")
    } catch {
      toast.error("Could not import AI product draft")
    }
  }

  const handleReject = async () => {
    try {
      await rejectDraft({ reason: rejectionReason.trim() })
      setRejectionReason("")
      toast.success("AI product draft rejected")
    } catch {
      toast.error("Could not reject AI product draft")
    }
  }

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

      <DraftReviewIssues issues={reviewIssues} />

      <Container>
        <Header title="Review Actions" subtitle="Approve, reject, or import this draft." />
        <div className="flex flex-wrap gap-3 px-6 py-4">
          <Button
            disabled={!actionAvailability.canApprove || isRejecting || isImporting}
            isLoading={isApproving}
            size="small"
            onClick={handleApprove}
          >
            Approve
          </Button>
          <Button
            disabled={!actionAvailability.canImport || isApproving || isRejecting}
            isLoading={isImporting}
            size="small"
            variant="secondary"
            onClick={handleImport}
          >
            Import
          </Button>
        </div>
        {actionAvailability.canReject ? (
          <div className="flex flex-col gap-3 px-6 py-4">
            <Textarea
              aria-label="Reason for rejecting this AI product draft"
              value={rejectionReason}
              onChange={(event) => setRejectionReason(event.target.value)}
              placeholder="Reason for rejection"
              rows={3}
            />
            <Button
              className="w-fit"
              disabled={
                !rejectionReason.trim() || isApproving || isImporting
              }
              isLoading={isRejecting}
              size="small"
              variant="danger"
              onClick={handleReject}
            >
              Reject
            </Button>
          </div>
        ) : (
          <div className="px-6 py-4">
            <Text className="text-ui-fg-subtle">
              This draft has reached a terminal state.
            </Text>
          </div>
        )}
      </Container>

      <Container>
        <Header
          title="Draft Summary"
          subtitle="Normalized metadata and content proposed by this draft."
        />
        <div className="grid gap-4 px-6 py-4 md:grid-cols-2">
          <div className="min-w-0">
            <Heading level="h3">Metadata</Heading>
            <pre className="bg-ui-bg-subtle mt-2 max-h-80 max-w-full overflow-auto whitespace-pre-wrap break-words rounded-md p-3 text-xs">
              {JSON.stringify(asObject(normalizedDraft.metadata), null, 2)}
            </pre>
          </div>
          <div className="min-w-0">
            <Heading level="h3">Content</Heading>
            <pre className="bg-ui-bg-subtle mt-2 max-h-80 max-w-full overflow-auto whitespace-pre-wrap break-words rounded-md p-3 text-xs">
              {JSON.stringify(asObject(normalizedDraft.content_draft), null, 2)}
            </pre>
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
