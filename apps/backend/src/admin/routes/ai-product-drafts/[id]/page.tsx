import {
  Badge,
  Button,
  Checkbox,
  Heading,
  Label,
  Text,
  Textarea,
  toast,
  usePrompt,
} from "@medusajs/ui"
import { useState } from "react"
import { Link, useParams } from "react-router-dom"
import { DraftReviewActions } from "./review-actions"
import { DraftQualityPanel } from "./quality-panel"

import { Container } from "../../../components/container"
import { Header } from "../../../components/header"
import { JsonViewSection } from "../../../components/json-view-section"
import {
  useAiProductDraft,
  useApproveAiProductDraft,
  useImportAiProductDraft,
  useRejectAiProductDraft,
  useResolveAiProductDraft,
} from "../../../hooks/ai-product-drafts"
import {
  formatAiProductDraftDate,
  getAiProductDraftActionAvailability,
  getAiProductDraftDisplayName,
  getAiProductDraftErrorMessage,
  getAiProductDraftReviewIssues,
  getAiProductDraftStatusBadgeColor,
  labelizeAiProductDraftValue,
} from "../../../lib/ai-product-drafts"
import type {
  AdminAiProductDraft,
  AdminAiProductDraftChange,
  AdminAiProductDraftEvent,
  AdminAiProductDraftImportTargets,
} from "../../../types"

const asObject = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}

const formatReviewValue = (value: unknown) => {
  if (value === undefined) return "Not set"
  if (typeof value === "string") return value || "Empty"
  return JSON.stringify(value, null, 2)
}

const AiProductDraftDetailPage = () => {
  const { id = "" } = useParams()
  const { draft, events, error, isError, isLoading, refetch } =
    useAiProductDraft(id)

  if (isLoading) {
    return (
      <Container>
        <Header title="AI Product Draft" subtitle="Loading draft details..." />
      </Container>
    )
  }

  if (isError) {
    return (
      <Container>
        <Header title="AI Product Draft" subtitle={`Draft ${id}`} />
        <div className="m-6 rounded-lg border border-ui-border-error bg-ui-bg-subtle p-4" role="alert">
          <Text weight="plus">Could not load this draft.</Text>
          <Text className="text-ui-fg-subtle" size="small">
            {getAiProductDraftErrorMessage(
              error,
              "Refresh the page or return to the draft queue."
            )}
          </Text>
          <Button className="mt-3" onClick={() => refetch()} size="small" variant="secondary">
            Try again
          </Button>
        </div>
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
  const reviewIssues = getAiProductDraftReviewIssues(draft)
  const operation = draft.resolved_operation

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
        <div className="grid gap-4 px-6 py-4 sm:grid-cols-2 lg:grid-cols-5">
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
              Operation
            </Text>
            <Text>
              {labelizeAiProductDraftValue(
                operation || draft.requested_operation || "pending"
              )}
            </Text>
          </div>
          <div>
            <Text size="small" className="text-ui-fg-subtle">
              Source
            </Text>
            <Text>{draft.source_agent || "hermes"}</Text>
          </div>
          <div>
            <Text size="small" className="text-ui-fg-subtle">
              Research quality
            </Text>
            <Text>
              {draft.quality?.can_approve ? "Ready for review" : "Research required"}
            </Text>
          </div>
          <div>
            <Text size="small" className="text-ui-fg-subtle">
              Created
            </Text>
            <Text>{formatAiProductDraftDate(draft.created_at)}</Text>
          </div>
        </div>
        {draft.request_id ? (
          <div className="border-ui-border-base border-t px-6 py-3">
            <Text className="text-ui-fg-subtle" size="small">
              Request ID: <span className="font-mono">{draft.request_id}</span>
            </Text>
          </div>
        ) : null}
      </Container>

      <DraftStateBanner draft={draft} />
      <DraftIdentityResolution draft={draft} />
      <DraftReviewIssues issues={reviewIssues} />
      <DraftQualityPanel draft={draft} />
      <DraftReviewActions key={draft.review_hash || draft.id} draft={draft} />
      <DraftImportProgress draft={draft} />

      <Container>
        <Header
          title="Draft Summary"
          subtitle="Normalized metadata and content proposed by this draft."
        />
        <div className="grid gap-4 px-6 py-4 md:grid-cols-2">
          <div className="min-w-0">
            <Heading level="h3">Product identity</Heading>
            <dl className="mt-2 grid gap-2 text-sm">
              <div>
                <dt className="text-ui-fg-subtle">Product title</dt>
                <dd>
                  {String(
                    asObject(normalizedDraft.target_product).product_title ||
                      getAiProductDraftDisplayName(draft)
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-ui-fg-subtle">Target</dt>
                <dd className="break-all">
                  {draft.product_handle || draft.product_id || "New product"}
                </dd>
              </div>
            </dl>
          </div>
          <div className="min-w-0">
            <Heading level="h3">Draft content</Heading>
            <Text className="mt-2 whitespace-pre-wrap break-words">
              {String(
                asObject(normalizedDraft.content_draft).short_description ||
                  "No short description was proposed."
              )}
            </Text>
          </div>
        </div>
        <details className="border-ui-border-base border-t px-6 py-4">
          <summary className="cursor-pointer text-sm font-medium">
            View normalized metadata and content JSON
          </summary>
          <pre className="bg-ui-bg-subtle mt-3 max-h-96 max-w-full overflow-auto whitespace-pre-wrap break-words rounded-md p-3 text-xs">
            {JSON.stringify(
              {
                metadata: asObject(normalizedDraft.metadata),
                content_draft: asObject(normalizedDraft.content_draft),
              },
              null,
              2
            )}
          </pre>
        </details>
      </Container>

      <DraftEventHistory events={events} />

      <JsonViewSection data={asObject(draft.raw_packet)} />
    </div>
  )
}

function DraftEventHistory({ events }: { events: AdminAiProductDraftEvent[] }) {
  return (
    <Container>
      <details className="group" open>
        <summary className="focus-visible:shadow-borders-focus cursor-pointer list-none rounded-sm px-6 py-4 outline-none">
          <div className="flex items-center justify-between gap-4">
            <div>
              <Heading level="h2">Events</Heading>
              <Text className="text-ui-fg-subtle" size="small">
                Audit trail for this draft. Select this heading to hide or show
                it.
              </Text>
            </div>
            <Badge color="grey" size="xsmall">
              {events.length}
            </Badge>
          </div>
        </summary>
        <div className="border-ui-border-base flex flex-col gap-2 border-t px-6 py-4">
          {events.length === 0 ? (
            <Text className="text-ui-fg-subtle">No events yet.</Text>
          ) : (
            events.map((event) => (
              <details
                className="border-ui-border-base rounded-lg border px-4 py-3"
                key={event.id}
              >
                <summary className="cursor-pointer list-none">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <Text weight="plus">
                        {labelizeAiProductDraftValue(event.type)}
                      </Text>
                      <Text className="text-ui-fg-subtle" size="small">
                        {event.from_status || event.to_status
                          ? `${labelizeAiProductDraftValue(event.from_status)} → ${labelizeAiProductDraftValue(event.to_status)}`
                          : labelizeAiProductDraftValue(event.actor_type)}
                      </Text>
                    </div>
                    <Text className="text-ui-fg-subtle" size="small">
                      {formatAiProductDraftDate(event.created_at)}
                    </Text>
                  </div>
                </summary>
                {event.metadata ? (
                  <pre className="bg-ui-bg-subtle mt-3 max-h-64 overflow-auto whitespace-pre-wrap break-words rounded-md p-3 text-xs">
                    {JSON.stringify(event.metadata, null, 2)}
                  </pre>
                ) : (
                  <Text className="mt-3 text-ui-fg-subtle" size="small">
                    No additional event details.
                  </Text>
                )}
              </details>
            ))
          )}
        </div>
      </details>
    </Container>
  )
}

function DraftStateBanner({ draft }: { draft: AdminAiProductDraft }) {
  const message =
    draft.status === "needs_resolution"
      ? "Choose the matching product or confirm that this should create a separate product."
      : draft.status === "needs_review"
        ? "Review the proposed changes and destinations before approval."
        : draft.status === "approved"
          ? "This draft is approved and ready to import."
          : draft.status === "validation_failed"
            ? "This packet could not enter review. Check the warnings and audit event for the exact reason."
            : draft.status === "imported"
              ? "Import completed. The audit trail and destination progress are shown below."
              : `This draft is ${labelizeAiProductDraftValue(draft.status).toLowerCase()}.`

  return (
    <Container>
      <div className="flex flex-col gap-2 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Heading level="h2">Next step</Heading>
          <Text className="text-ui-fg-subtle">{message}</Text>
        </div>
        <Badge
          color={getAiProductDraftStatusBadgeColor(draft.status)}
          size="small"
        >
          {labelizeAiProductDraftValue(
            draft.resolved_operation || draft.requested_operation || "pending"
          )}
        </Badge>
      </div>
    </Container>
  )
}

function DraftImportProgress({ draft }: { draft: AdminAiProductDraft }) {
  if (!draft.import_progress && !["approved", "imported"].includes(draft.status)) {
    return null
  }

  const progress = asObject(draft.import_progress)
  const targets = [
    ["medusa_product", "Medusa product"],
    ["medusa_metadata", "Medusa metadata"],
    ["strapi_description_draft", "Strapi description draft"],
    ["product_document_drafts", "Product document drafts"],
  ] as const

  return (
    <Container>
      <Header
        title="Import Progress"
        subtitle="Completed destinations are retained so a retry does not repeat finished work."
      />
      <div className="grid gap-3 px-6 py-4 sm:grid-cols-2 lg:grid-cols-4">
        {targets.map(([key, label]) => {
          const entry = asObject(progress[key])
          const completed = entry.status === "completed"

          return (
            <div className="border-ui-border-base rounded-lg border p-3" key={key}>
              <Text weight="plus">{label}</Text>
              <Badge color={completed ? "green" : "grey"} size="xsmall">
                {completed ? "Completed" : "Not completed"}
              </Badge>
              {typeof entry.count === "number" ? (
                <Text className="mt-1 text-ui-fg-subtle" size="small">
                  {entry.count} records
                </Text>
              ) : null}
            </div>
          )
        })}
      </div>
    </Container>
  )
}

function DraftIdentityResolution({ draft }: { draft: AdminAiProductDraft }) {
  const prompt = usePrompt()
  const [actionError, setActionError] = useState("")
  const { mutateAsync: resolveDraft, isPending } = useResolveAiProductDraft(
    draft.id
  )

  if (draft.status !== "needs_resolution") return null

  const candidates = draft.identity_candidates || []

  const handleCreate = async () => {
    const confirmed = await prompt({
      title: "Create a separate product?",
      description:
        "A possible catalogue match exists. Continue only when this research is for a genuinely different product.",
    })

    if (!confirmed) return

    try {
      setActionError("")
      await resolveDraft({ operation: "create" })
      toast.success("Draft resolved as a new product")
    } catch (error) {
      const message = getAiProductDraftErrorMessage(
        error,
        "Could not resolve product identity"
      )
      setActionError(message)
      toast.error("Could not resolve product identity", {
        description: message,
      })
    }
  }

  const handleEnrich = async (productId: string) => {
    try {
      setActionError("")
      await resolveDraft({ operation: "enrich", product_id: productId })
      toast.success("Draft linked to the existing product")
    } catch (error) {
      const message = getAiProductDraftErrorMessage(
        error,
        "Could not resolve product identity"
      )
      setActionError(message)
      toast.error("Could not resolve product identity", {
        description: message,
      })
    }
  }

  return (
    <Container>
      <Header
        title="Product Match"
        subtitle="Choose whether this draft enriches a matched product or creates a separate unpublished product."
      />
      <div className="flex flex-col gap-3 px-6 py-4">
        {actionError ? (
          <div className="rounded-lg border border-ui-border-error bg-ui-bg-subtle p-3" role="alert">
            <Text>{actionError}</Text>
          </div>
        ) : null}
        {candidates.map((candidate) => (
          <div
            className="border-ui-border-base flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between"
            key={candidate.id}
          >
            <div className="min-w-0">
              <Text weight="plus">{candidate.title || candidate.handle}</Text>
              <Text className="break-all text-ui-fg-subtle" size="small">
                {candidate.handle ? `/${candidate.handle} · ` : ""}
                {candidate.id}
              </Text>
            </div>
            <Button
              disabled={isPending}
              onClick={() => handleEnrich(candidate.id)}
              size="small"
            >
              Enrich this product
            </Button>
          </div>
        ))}
        {candidates.length === 0 ? (
          <Text className="text-ui-fg-subtle">
            No reliable product match was stored. Resolve this as a new product
            or reject the draft.
          </Text>
        ) : null}
        <div className="border-ui-border-base border-t pt-4">
          <Button
            disabled={isPending}
            onClick={handleCreate}
            size="small"
            variant="secondary"
          >
            Create a separate product
          </Button>
        </div>
      </div>
    </Container>
  )
}

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


export default AiProductDraftDetailPage
