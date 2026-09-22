import { Button, Text, Textarea, toast, usePrompt } from "@medusajs/ui"
import { useState } from "react"
import { Container } from "../../../components/container"
import { Header } from "../../../components/header"
import { useReplaceAiProductDraftResearch } from "../../../hooks/ai-product-drafts"
import { getAiProductDraftErrorMessage } from "../../../lib/ai-product-drafts"
import type { AdminAiProductDraft } from "../../../types"

const record = (v: unknown): Record<string, unknown> =>
  v && typeof v === "object" && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : {}
const list = (v: unknown): unknown[] => (Array.isArray(v) ? v : [])
const display = (v: unknown) =>
  typeof v === "string" ? v : JSON.stringify(v ?? null)
const sourceUrl = (v: unknown) =>
  typeof v === "string" && v.startsWith("https://") ? v : undefined

export function DraftQualityPanel({ draft }: { draft: AdminAiProductDraft }) {
  const quality = draft.quality
  const normalized = record(draft.normalized_draft)
  const content = record(normalized.content_draft)
  const packet = record(draft.raw_packet)
  const evidence = [
    {
      ...record(packet.classification),
      field: "Product kind",
      value: record(packet.classification).kind,
    },
    ...list(packet.facts),
    ...list(packet.content_evidence),
  ]
    .map(record)
    .filter((e) => e.source_ids)
  const sources = list(packet.sources).map(record)
  return (
    <Container>
      <Header
        title="Research quality"
        subtitle="Evidence coverage measures completeness, not truth. Open the sources and verify the exact product and variant before approving."
      />
      <div className="space-y-4 px-6 py-4">
        <Text weight="plus">
          {quality?.can_approve
            ? "Ready for manual review"
            : "Research required — approval and import blocked"}
        </Text>
        <div className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <div>
            Product kind: <strong>{quality?.product_kind || "unknown"}</strong>
          </div>
          <div>
            Required facts:{" "}
            {quality?.required_facts
              ? `${quality.supported_facts}/${quality.required_facts}`
              : "Not assessed"}
          </div>
          <div>
            Copy evidence:{" "}
            {quality?.content_fields
              ? `${quality.supported_content_fields}/${quality.content_fields}`
              : "Not assessed"}
          </div>
          <div>Exact-product sources: {quality?.exact_sources || 0}</div>
        </div>
        {quality?.blockers?.length ? (
          <ul className="list-disc space-y-1 pl-5 text-sm text-ui-fg-error">
            {quality.blockers.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        ) : null}
        {draft.status === "imported" && !quality?.can_approve ? (
          <Text size="small">
            This is a historical import. Audit its product and CMS content
            separately; this panel has not changed the imported data.
          </Text>
        ) : null}
        <details open className="border-ui-border-base border-t pt-4">
          <summary className="cursor-pointer font-medium">
            Copy and document preview
          </summary>
          <div className="mt-3 space-y-3 break-words text-sm">
            <p>{display(content.short_description) || "No description"}</p>
            <ul className="list-disc pl-5">
              {list(content.feature_bullets).map((text, i) => (
                <li key={i}>{display(text)}</li>
              ))}
            </ul>
            <p>
              <strong>SEO title:</strong> {display(content.seo_title)}
            </p>
            <p>
              <strong>SEO description:</strong>{" "}
              {display(content.seo_description)}
            </p>
            <p>
              <strong>Search keywords:</strong>{" "}
              {list(content.ai_search_keywords).map(display).join(", ")}
            </p>
            {list(normalized.product_document_suggestions)
              .map(record)
              .map((doc, i) => (
                <p key={i}>
                  Document ({display(doc.document_type)}):{" "}
                  <a
                    className="text-ui-fg-interactive underline"
                    href={sourceUrl(doc.source_url)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {display(doc.title)}
                  </a>
                </p>
              ))}
          </div>
        </details>
        <details className="border-ui-border-base border-t pt-4">
          <summary className="cursor-pointer font-medium">
            Claim evidence and caveats ({evidence.length})
          </summary>
          <div className="mt-3 space-y-3">
            {evidence.map((entry, i) => (
              <div
                key={i}
                className="rounded-lg border border-ui-border-base p-3 text-sm break-words"
              >
                <p className="font-medium">
                  {display(entry.field)}
                  {entry.value !== undefined ? `: ${display(entry.value)}` : ""}
                </p>
                <p>{display(entry.evidence_excerpt)}</p>
                {entry.warning ? (
                  <p className="text-ui-fg-error">{display(entry.warning)}</p>
                ) : null}
                <p className="text-ui-fg-subtle">
                  Researcher-reported confidence:{" "}
                  {Math.round(Number(entry.confidence || 0) * 100)}% — not
                  independently calibrated
                </p>
                {list(entry.source_ids).map((id) => {
                  const source = sources.find((s) => s.id === id)
                  return (
                    <a
                      key={display(id)}
                      href={sourceUrl(source?.url)}
                      className="mr-3 text-ui-fg-interactive underline"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {display(source?.title || id)} (
                      {display(source?.product_match)})
                    </a>
                  )
                })}
              </div>
            ))}
          </div>
        </details>
        <ReplaceResearch draft={draft} />
      </div>
    </Container>
  )
}

function ReplaceResearch({ draft }: { draft: AdminAiProductDraft }) {
  const [packetText, setPacketText] = useState("")
  const [error, setError] = useState("")
  const prompt = usePrompt()
  const mutation = useReplaceAiProductDraftResearch(draft.id)
  if (
    ![
      "needs_review",
      "needs_resolution",
      "validation_failed",
      "rejected",
    ].includes(draft.status) ||
    Object.keys(draft.import_progress || {}).length
  )
    return null
  const replace = async () => {
    setError("")
    try {
      const packet = JSON.parse(packetText)
      if (
        !(await prompt({
          title: "Replace this draft's research?",
          description:
            "Save the current draft in its audit history, replace it with this v3 packet, and require a fresh manual review. No product or CMS data is imported.",
        }))
      )
        return
      await mutation.mutateAsync({ packet, review_hash: draft.review_hash })
      setPacketText("")
      toast.success("Research replaced — review the new evidence")
    } catch (cause) {
      setError(
        getAiProductDraftErrorMessage(cause, "Could not replace research")
      )
    }
  }
  return (
    <details className="border-ui-border-base border-t pt-4">
      <summary className="cursor-pointer font-medium">
        Replace with freshly researched v3 packet
      </summary>
      <div className="mt-3 space-y-3">
        <Text size="small">
          Re-run product research using the v3 contract. Do not relabel old
          claims as verified evidence. Keep the exact product name, variant and
          existing request ID:{" "}
          {draft.request_id || "use a new unique request ID"}.
        </Text>
        <Textarea
          aria-label="Fresh v3 research packet JSON"
          rows={8}
          value={packetText}
          onChange={(event) => setPacketText(event.target.value)}
        />
        {error ? (
          <p role="alert" className="text-sm text-ui-fg-error">
            {error}
          </p>
        ) : null}
        <Button
          size="small"
          variant="secondary"
          disabled={!packetText.trim()}
          isLoading={mutation.isPending}
          onClick={replace}
        >
          Save research for review
        </Button>
      </div>
    </details>
  )
}
