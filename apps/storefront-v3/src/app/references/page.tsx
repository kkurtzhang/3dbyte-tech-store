import Link from "next/link";
import { notFound } from "next/navigation";
import type { KnowledgeReferenceCard } from "@3dbyte-tech-store/shared-types";
import { loadReferencePage } from "@/features/knowledge/load-references";
import { ReferenceCards } from "@/features/knowledge/reference-cards";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Knowledge references",
  robots: { index: false, follow: false },
};
export default async function ReferencesPage({
  searchParams,
}: {
  searchParams: Promise<{ offset?: string }>;
}) {
  if (process.env.APP_ENV !== "staging") notFound();
  const { offset = "0" } = await searchParams;
  if (!/^\d{1,4}$/.test(offset) || Number(offset) > 5000) notFound();
  let result: {
    references: KnowledgeReferenceCard[];
    next_offset: number | null;
  };
  try {
    result = await loadReferencePage(Number(offset));
  } catch {
    return (
      <section className="container py-12">
        <h1 className="text-3xl font-semibold">Knowledge references</h1>
        <p className="mt-6">
          References are temporarily unavailable. Please try again later.
        </p>
      </section>
    );
  }
  return (
    <section className="container py-12">
      <h1 className="text-3xl font-semibold">Knowledge references</h1>
      <p className="my-6 text-muted-foreground">
        Source-backed product knowledge with explicit unknowns. Inventory is
        simulated for staging. These references have no checkout offer; the
        store’s test checkout remains available for eligible products.
      </p>
      <ReferenceCards references={result.references} />
      {result.next_offset !== null && (
        <Link
          className="mt-6 inline-block underline"
          href={`/references?offset=${result.next_offset}`}
        >
          Next references
        </Link>
      )}
    </section>
  );
}
