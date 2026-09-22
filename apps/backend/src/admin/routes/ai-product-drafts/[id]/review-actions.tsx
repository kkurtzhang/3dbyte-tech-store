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

function DraftChangeReview({
  changes,
  disabled,
  importTargets,
  onImportTargetChange,
  onToggleChange,
  selectedChangePaths,
}: {
  changes: AdminAiProductDraftChange[]
  disabled: boolean
  importTargets: AdminAiProductDraftImportTargets
  onImportTargetChange: (
    target: keyof AdminAiProductDraftImportTargets,
    selected: boolean
  ) => void
  onToggleChange: (path: string, selected: boolean) => void
  selectedChangePaths: Set<string>
}) {
  const targetOptions: {
    key: keyof AdminAiProductDraftImportTargets
    label: string
    description: string
  }[] = [
    {
      key: "medusa_metadata",
      label: "Medusa metadata",
      description: "Apply only the metadata changes selected above.",
    },
    {
      key: "strapi_description_draft",
      label: "Strapi description draft",
      description: "Create or update unpublished product copy for review.",
    },
    {
      key: "product_document_drafts",
      label: "Product document drafts",
      description: "Create unpublished, source-linked document records.",
    },
  ]

  return (
    <Container>
      <Header
        title="Proposed Changes"
        subtitle="Missing values are selected by default. Conflicts require an explicit choice."
      />
      <div className="flex flex-col gap-3 px-6 py-4">
        {changes.length ? (
          changes.map((change) => {
            const checkboxId = `change-${change.path.replace(/[^a-z0-9]+/gi, "-")}`
            const sourceUrl = change.evidence?.source_url

            return (
              <div
                className="border-ui-border-base rounded-lg border p-4"
                key={change.path}
              >
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={selectedChangePaths.has(change.path)}
                    disabled={disabled}
                    id={checkboxId}
                    onCheckedChange={(checked) =>
                      onToggleChange(change.path, checked === true)
                    }
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Label htmlFor={checkboxId}>{change.path}</Label>
                      <Badge
                        color={
                          change.disposition === "conflict" ? "orange" : "green"
                        }
                        size="xsmall"
                      >
                        {labelizeAiProductDraftValue(change.disposition)}
                      </Badge>
                    </div>
                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      <div className="min-w-0">
                        <Text className="text-ui-fg-subtle" size="small">
                          Current
                        </Text>
                        <pre className="bg-ui-bg-subtle mt-1 overflow-auto whitespace-pre-wrap break-words rounded-md p-2 text-xs">
                          {formatReviewValue(change.current_value)}
                        </pre>
                      </div>
                      <div className="min-w-0">
                        <Text className="text-ui-fg-subtle" size="small">
                          Proposed
                        </Text>
                        <pre className="bg-ui-bg-subtle mt-1 overflow-auto whitespace-pre-wrap break-words rounded-md p-2 text-xs">
                          {formatReviewValue(change.proposed_value)}
                        </pre>
                      </div>
                    </div>
                    {sourceUrl ? (
                      <Text className="mt-3 text-ui-fg-subtle" size="small">
                        Evidence:{" "}
                        <a
                          className="text-ui-fg-interactive hover:underline"
                          href={sourceUrl}
                          rel="noreferrer"
                          target="_blank"
                        >
                          {labelizeAiProductDraftValue(
                            change.evidence?.source_type
                          )}
                        </a>
                        {typeof change.evidence?.confidence === "number"
                          ? ` · ${Math.round(change.evidence.confidence * 100)}% researcher estimate`
                          : ""}
                      </Text>
                    ) : null}
                  </div>
                </div>
              </div>
            )
          })
        ) : (
          <Text className="text-ui-fg-subtle">
            No evidence-backed metadata changes were proposed.
          </Text>
        )}
      </div>
      <div className="border-ui-border-base border-t px-6 py-4">
        <Heading level="h3">Import destinations</Heading>
        <div className="mt-3 grid gap-3 lg:grid-cols-3">
          {targetOptions.map((target) => {
            const checkboxId = `target-${target.key}`

            return (
              <div
                className="border-ui-border-base flex items-start gap-3 rounded-lg border p-3"
                key={target.key}
              >
                <Checkbox
                  checked={importTargets[target.key]}
                  disabled={disabled}
                  id={checkboxId}
                  onCheckedChange={(checked) =>
                    onImportTargetChange(target.key, checked === true)
                  }
                />
                <div>
                  <Label htmlFor={checkboxId}>{target.label}</Label>
                  <Text className="text-ui-fg-subtle" size="small">
                    {target.description}
                  </Text>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </Container>
  )
}

export function DraftReviewActions({ draft }: { draft: AdminAiProductDraft }) {
  const [reviewAcknowledged, setReviewAcknowledged] = useState(false)
  const actionAvailability = getAiProductDraftActionAvailability(draft.status)
  const changes = draft.proposed_changes || []
  const reviewedChanges = draft.approved_changes || changes
  const [selectedChangePaths, setSelectedChangePaths] = useState(
    () =>
      new Set(
        reviewedChanges
          .filter((change) =>
            draft.approved_changes ? true : change.default_selected === true
          )
          .map((change) => change.path)
      )
  )
  const [importTargets, setImportTargets] =
    useState<AdminAiProductDraftImportTargets>(
      draft.approved_import_targets || {
        medusa_metadata: true,
        strapi_description_draft: true,
        product_document_drafts: true,
      }
    )
  const [rejectionReason, setRejectionReason] = useState("")
  const [actionError, setActionError] = useState("")
  const prompt = usePrompt()
  const { mutateAsync: approveDraft, isPending: isApproving } =
    useApproveAiProductDraft(draft.id)
  const { mutateAsync: rejectDraft, isPending: isRejecting } =
    useRejectAiProductDraft(draft.id)
  const { mutateAsync: importDraft, isPending: isImporting } =
    useImportAiProductDraft(draft.id)

  const toggleChange = (path: string, selected: boolean) => {
    setSelectedChangePaths((current) => {
      const next = new Set(current)
      if (selected) next.add(path)
      else next.delete(path)
      return next
    })
  }

  const setImportTarget = (
    target: keyof AdminAiProductDraftImportTargets,
    selected: boolean
  ) => {
    setImportTargets((current) => ({ ...current, [target]: selected }))
  }

  const handleApprove = async () => {
    try {
      setActionError("")
      await approveDraft({
        notes: "Approved from Admin review.",
        selected_change_paths: [...selectedChangePaths],
        import_targets: importTargets,
        snapshot_hash: draft.snapshot_hash,
        review_hash: draft.review_hash,
        review_acknowledged: reviewAcknowledged,
      })
      toast.success("AI product draft approved")
    } catch (error) {
      const message = getAiProductDraftErrorMessage(
        error,
        "Could not approve AI product draft"
      )
      setActionError(message)
      toast.error("Could not approve AI product draft", {
        description: message,
      })
    }
  }

  const handleImport = async () => {
    const operationDescription =
      draft.resolved_operation === "create"
        ? "Create a new unpublished product, then write only the approved metadata and content drafts."
        : "Enrich the existing product with only the approved metadata and content drafts."
    const confirmed = await prompt({
      title: "Import approved draft?",
      description: operationDescription,
    })

    if (!confirmed) return

    try {
      setActionError("")
      await importDraft({})
      toast.success("AI product draft imported")
    } catch (error) {
      const message = getAiProductDraftErrorMessage(
        error,
        "Could not import AI product draft"
      )
      setActionError(message)
      toast.error("Could not import AI product draft", {
        description: message,
      })
    }
  }

  const handleReject = async () => {
    try {
      setActionError("")
      await rejectDraft({ reason: rejectionReason.trim() })
      setRejectionReason("")
      toast.success("AI product draft rejected")
    } catch (error) {
      const message = getAiProductDraftErrorMessage(
        error,
        "Could not reject AI product draft"
      )
      setActionError(message)
      toast.error("Could not reject AI product draft", {
        description: message,
      })
    }
  }

  const noSelectedWork =
    draft.resolved_operation === "enrich" &&
    selectedChangePaths.size === 0 &&
    !importTargets.strapi_description_draft &&
    !importTargets.product_document_drafts

  return (
    <>
      {draft.status !== "needs_resolution" ? (
        <DraftChangeReview
          changes={changes}
          disabled={!actionAvailability.canApprove || !draft.quality?.can_approve}
          importTargets={importTargets}
          onImportTargetChange={setImportTarget}
          onToggleChange={toggleChange}
          selectedChangePaths={selectedChangePaths}
        />
      ) : null}
      <Container>
        <Header
          title="Review Actions"
          subtitle={
            draft.status === "needs_resolution"
              ? "Resolve the product match before approval."
              : "Approve the selected work, reject the draft, or import an approved draft."
          }
        />
        {actionError ? (
          <div
            className="mx-6 mt-4 rounded-lg border border-ui-border-error bg-ui-bg-subtle p-3"
            role="alert"
          >
            <Text weight="plus">The action could not be completed.</Text>
            <Text className="text-ui-fg-subtle" size="small">
              {actionError}
            </Text>
          </div>
        ) : null}
        {actionAvailability.canApprove ? (
          <label className="flex items-start gap-3 px-6 pt-4 text-sm">
            <Checkbox
              aria-label="I verified the source evidence"
              checked={reviewAcknowledged}
              disabled={!draft.quality?.can_approve}
              onCheckedChange={(checked) =>
                setReviewAcknowledged(checked === true)
              }
            />
            <span>
              I verified the product and variant, source excerpts,
              specifications, copy, and documents. Evidence coverage is not a
              guarantee of accuracy.
            </span>
          </label>
        ) : null}
        <div className="flex flex-wrap gap-3 px-6 py-4">
          <Button
            disabled={
              !actionAvailability.canApprove ||
              !draft.quality?.can_approve ||
              !reviewAcknowledged ||
              noSelectedWork ||
              isRejecting ||
              isImporting
            }
            isLoading={isApproving}
            size="small"
            onClick={handleApprove}
          >
            Approve selected work
          </Button>
          <Button
            disabled={
              !actionAvailability.canImport ||
              !draft.review_current ||
              isApproving ||
              isRejecting
            }
            isLoading={isImporting}
            size="small"
            variant="secondary"
            onClick={handleImport}
          >
            Import approved work
          </Button>
        </div>
        {noSelectedWork && actionAvailability.canApprove ? (
          <div className="px-6 pb-4">
            <Text className="text-ui-fg-error" size="small">
              Select at least one metadata change or content destination.
            </Text>
          </div>
        ) : null}
        {actionAvailability.canReject ? (
          <div className="border-ui-border-base flex flex-col gap-3 border-t px-6 py-4">
            <Textarea
              aria-label="Reason for rejecting this AI product draft"
              value={rejectionReason}
              onChange={(event) => setRejectionReason(event.target.value)}
              placeholder="Reason for rejection"
              rows={3}
            />
            <Button
              className="w-fit"
              disabled={!rejectionReason.trim() || isApproving || isImporting}
              isLoading={isRejecting}
              size="small"
              variant="danger"
              onClick={handleReject}
            >
              Reject
            </Button>
          </div>
        ) : (
          <div className="border-ui-border-base border-t px-6 py-4">
            <Text className="text-ui-fg-subtle">
              This draft has reached a terminal state.
            </Text>
          </div>
        )}
      </Container>
    </>
  )
}
