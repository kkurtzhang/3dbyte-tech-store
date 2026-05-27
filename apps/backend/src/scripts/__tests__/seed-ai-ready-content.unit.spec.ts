import {
  shouldReplaceAiReadyDocumentFile,
  shouldRetireLegacyAiReadyDocument,
} from "../seed-ai-ready-content";

describe("AI-ready content seed document repair helpers", () => {
  it("replaces existing document media when it is not the expected PDF", () => {
    expect(
      shouldReplaceAiReadyDocumentFile(
        {
          file: {
            name: "AI PETG Black Datasheet",
            mime: "text/plain",
          },
        },
        { filename: "ai-petg-black-175-1kg-datasheet.pdf" },
      ),
    ).toBe(true);
  });

  it("keeps existing document media when the expected PDF is already attached", () => {
    expect(
      shouldReplaceAiReadyDocumentFile(
        {
          file: {
            name: "ai-petg-black-175-1kg-datasheet.pdf",
            mime: "application/pdf",
          },
        },
        { filename: "ai-petg-black-175-1kg-datasheet.pdf" },
      ),
    ).toBe(false);
  });

  it("retires public legacy AI documents that are outside the deterministic seed set", () => {
    expect(
      shouldRetireLegacyAiReadyDocument(
        {
          documentId: "legacy_1",
          title: "AI PETG Black 1.75mm Datasheet",
          is_public: true,
          file: {
            name: "AI PETG Black 1.75mm Datasheet",
            mime: "text/plain",
          },
        },
        new Set(["AI PETG Black 1.75mm 1kg Technical Datasheet"]),
      ),
    ).toBe(true);
  });
});
