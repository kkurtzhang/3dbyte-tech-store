import {
  approved,
  fixtureReviewEvent,
  knowledgeRevision,
  now,
} from "../../knowledge-reference/__tests__/fixtures";
const { approvedPublicProjection } =
  require("../../../../../cms/src/api/product-document/utils/public-knowledge-projection") as {
    approvedPublicProjection: (
      record: unknown,
      native: unknown[],
      now?: number,
      events?: unknown[],
    ) =>
      | import("@3dbyte-tech-store/shared-types").ApprovedKnowledgeDocument
      | null;
  };

function fixture() {
  const native = approved();
  const {
    knowledge_content: _content,
    knowledge_review: _review,
    ...publicRecord
  } = native;
  return { native, publicRecord };
}

describe("approved public document projection", () => {
  it("returns only canonical approved content, preserving explicit unknowns", () => {
    const { native, publicRecord } = fixture();
    const result = approvedPublicProjection(publicRecord, [native], now, [
      fixtureReviewEvent(native),
    ])!;
    expect(result.document_id).toBe(native.documentId);
    expect(result.facts[1]).toMatchObject({
      value: null,
      evidence_excerpt: "",
    });
    expect(JSON.stringify(result)).not.toMatch(
      /knowledge_content|knowledge_review|reviewed_at|is_public/,
    );
  });

  it.each([
    "private",
    "draft",
    "expired",
    "revised",
    "wrongProduct",
    "wrongMetadata",
    "ambiguous",
  ])(
    "omits %s content without changing the public metadata record",
    (reason) => {
      const { native, publicRecord } = fixture();
      const before = JSON.stringify(publicRecord);
      if (reason === "private") native.is_public = false;
      if (reason === "draft") native.publishedAt = "";
      if (reason === "expired")
        native.knowledge_review.valid_until = "2026-10-08T11:00:00Z";
      if (reason === "revised") native.knowledge_content.text += "Changed";
      if (reason === "wrongProduct")
        native.medusa_product_id = "another_product";
      if (reason === "wrongMetadata") native.title = "New title";
      if (reason === "wrongMetadata")
        native.knowledge_review.revision_hash = knowledgeRevision(native)!;
      expect(
        approvedPublicProjection(
          publicRecord,
          reason === "ambiguous" ? [native, native] : [native],
          now,
          [fixtureReviewEvent(native)],
        ),
      ).toBeNull();
      expect(JSON.stringify(publicRecord)).toBe(before);
    },
  );

  it("does not accept private data or an approved-looking object from the public payload", () => {
    const { publicRecord } = fixture();
    expect(
      approvedPublicProjection(
        { ...publicRecord, approved_knowledge: approved() },
        [],
        now,
      ),
    ).toBeNull();
  });
});
