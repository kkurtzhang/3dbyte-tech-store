import { bindKnowledgeReference, referenceCard } from "../contract";
import { rejectReferenceOffers } from "../offer-guard";
import { requiredFacts } from "../../ai-product-drafts/product-fields";

import {
  now,
  approved,
  product,
  marked,
  knowledgeRevision,
  approvedKnowledgeDocument,
} from "./fixtures";

describe("native reference contract", () => {
  it("allows an exact repeat after JSONB key reordering and preserves unrelated metadata", () => {
    const doc = approvedKnowledgeDocument(approved(), now)!;
    const first = bindKnowledgeReference(product(), doc, "staging");
    const reordered = Object.fromEntries(
      Object.entries(first.knowledge_reference).reverse(),
    );
    const p = {
      ...product(),
      metadata: {
        ...first,
        knowledge_reference: reordered,
        unrelated: "preserve",
      },
    };
    expect(bindKnowledgeReference(p, doc, "staging")).toMatchObject({
      unrelated: "preserve",
      knowledge_reference: first.knowledge_reference,
    });
    expect(p.metadata.knowledge_reference).toBe(reordered);
  });
  it("accepts approved exact knowledge with explicit unknowns, without changing commerce required facts", () => {
    const d = approvedKnowledgeDocument(approved(), now)!;
    expect(d.facts[1].value).toBeNull();
    expect(requiredFacts.hotend).toContain("max_temperature_c");
    expect(requiredFacts.power_supply).toContain("voltage_v");
    expect(bindKnowledgeReference(product(), d, "staging")).toMatchObject({
      catalogue_role: "knowledge_reference",
      knowledge_reference: {
        document_id: "doc_hotend",
        checkout_enabled: false,
      },
    });
  });
  it.each([
    "private",
    "unpublished",
    "unapproved",
    "changed",
    "expired",
    "stale",
    "wrongDocument",
    "wrongProduct",
    "wrongVariant",
    "future",
    "inventedExcerpt",
    "duplicateFact",
  ])("fails closed on %s native content", (reason) => {
    const d = approved();
    if (reason === "private") d.is_public = false;
    if (reason === "unpublished") d.publishedAt = "";
    if (reason === "unapproved") d.knowledge_review.status = "pending";
    if (reason === "changed") d.knowledge_content.text += "Changed";
    if (reason === "expired")
      d.knowledge_review.valid_until = "2026-10-08T11:30:00Z";
    if (reason === "stale") {
      d.source_checked_at = "2026-05-31T00:00:00Z";
      d.knowledge_review.revision_hash = knowledgeRevision(d)!;
    }
    if (reason === "wrongDocument")
      d.knowledge_review.document_id = "doc_other";
    if (reason === "wrongProduct") d.knowledge_review.product_id = "prod_other";
    if (reason === "wrongVariant")
      d.knowledge_review.variant_id = "variant_other";
    if (reason === "future")
      d.knowledge_review.reviewed_at = "2026-10-09T00:00:00Z";
    if (reason === "inventedExcerpt")
      d.knowledge_content.facts[0].evidence_excerpt = "Unsupported";
    if (reason === "duplicateFact")
      d.knowledge_content.facts.push(d.knowledge_content.facts[0]);
    expect(approvedKnowledgeDocument(d, now)).toBeNull();
  });
  it("binds text, facts, source, source version and exact identities into the revision", () => {
    const d = approved();
    const original = knowledgeRevision(d);
    for (const mutate of [
      (v: ReturnType<typeof approved>) => (v.version = "other"),
      (v: ReturnType<typeof approved>) => (v.product_handle = "other"),
      (v: ReturnType<typeof approved>) => (v.source_url += "/other"),
      (v: ReturnType<typeof approved>) =>
        (v.knowledge_content.variant_id = "variant_other"),
    ]) {
      const changed = approved();
      mutate(changed);
      expect(knowledgeRevision(changed)).not.toEqual(original);
    }
  });
  it.each(["production", "published", "priced", "foreign"])(
    "refuses %s reference binding",
    (reason) => {
      const p = product();
      if (reason === "published") p.status = "published";
      if (reason === "priced")
        (p.variants[0].price_set.prices as unknown[]) = [{ amount: 1 }];
      if (reason === "foreign") p.id = "prod_other";
      expect(() =>
        bindKnowledgeReference(
          p,
          approvedKnowledgeDocument(approved(), now)!,
          reason === "production" ? "production" : "staging",
        ),
      ).toThrow();
    },
  );
  it("reads only the current approved revision and displays zero as simulated data with no offer", () => {
    const p = marked(),
      d = approvedKnowledgeDocument(approved(), now)!;
    const card = referenceCard(p, d, "staging", now)!;
    expect(card).toMatchObject({
      product_id: p.id,
      checkout_enabled: false,
      price: null,
      simulated_initial_quantity: 0,
    });
    expect(
      referenceCard(p, { ...d, revision_hash: "b".repeat(64) }, "staging", now),
    ).toBeNull();
    expect(referenceCard(p, d, "production", now)).toBeNull();
    expect(
      referenceCard(
        p,
        {
          ...d,
          facts: [{ ...d.facts[0], value: "Different printer" }, d.facts[1]],
        },
        "staging",
        now,
      ),
    ).toBeNull();
    expect(
      referenceCard({ ...p, handle: "other" }, d, "staging", now),
    ).toBeNull();
    expect(
      referenceCard(
        { ...p, metadata: { ...p.metadata, catalogue_simulation: null } },
        d,
        "staging",
        now,
      ),
    ).toBeNull();
  });
  it("blocks reference cart offers even if someone later adds a price or publishes the product", async () => {
    const graph = jest.fn().mockResolvedValue({
      data: [
        {
          id: "variant_hotend",
          product: { metadata: { catalogue_role: "knowledge_reference" } },
        },
      ],
    });
    const req = {
      body: { variant_id: "variant_hotend" },
      scope: { resolve: () => ({ graph }) },
    };
    const next = jest.fn();
    await expect(
      rejectReferenceOffers(req as never, {} as never, next),
    ).rejects.toThrow(/Reference.*checkout/i);
    expect(next).not.toHaveBeenCalled();
    graph.mockResolvedValue({
      data: [{ id: "variant_ordinary", product: { metadata: {} } }],
    });
    await rejectReferenceOffers(req as never, {} as never, next);
    expect(next).toHaveBeenCalledTimes(1);
  });
});
