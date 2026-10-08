import type { KnowledgeReferenceCard } from "@3dbyte-tech-store/shared-types";
export function ReferenceCards({
  references,
}: {
  references: KnowledgeReferenceCard[];
}) {
  if (!references.length)
    return <p>No approved references are available on this page yet.</p>;
  return (
    <div className="grid gap-6 md:grid-cols-2">
      {references.map((reference) => (
        <article
          key={reference.product_id}
          className="rounded-xl border bg-card p-6"
        >
          <p className="text-sm font-medium text-muted-foreground">
            Staging knowledge reference · simulated inventory
          </p>
          <h2 className="mt-2 text-xl font-semibold">
            {reference.product_title}
          </h2>
          <dl className="mt-4 space-y-3">
            {reference.facts.map((fact) => (
              <div key={fact.field}>
                <dt className="font-medium">{fact.label}</dt>
                <dd>
                  {fact.value ?? "Unknown — awaiting source confirmation"}
                </dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 text-sm">
            Initial simulated stock: {reference.simulated_initial_quantity} —
            not physical inventory
          </p>
          <p className="text-sm">Test price unset · checkout offer disabled</p>
          <a
            className="mt-4 inline-block underline"
            href={reference.source_url}
            target="_blank"
            rel="noopener noreferrer"
          >
            {reference.document_title}
          </a>
          <p className="text-xs text-muted-foreground">
            Source checked {reference.source_checked_at.slice(0, 10)} ·{" "}
            {reference.source_version}
          </p>
        </article>
      ))}
    </div>
  );
}
