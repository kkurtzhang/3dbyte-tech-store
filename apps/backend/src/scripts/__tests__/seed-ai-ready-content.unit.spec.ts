import {
  fetchSourceDocumentResponse,
  isPdfDocumentBody,
  shouldReplaceAiReadyDocumentFile,
  shouldRetireLegacyAiReadyDocument,
} from "../seed-ai-ready-content";

describe("AI-ready content seed document repair helpers", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

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

  it("retires generated phase-1 PDFs after official source documents replace them", () => {
    expect(
      shouldRetireLegacyAiReadyDocument(
        {
          documentId: "generated_1",
          title: "Polymaker PETG Technical Datasheet",
          is_public: true,
          version: "phase-1",
          file: {
            name: "polymaker-petg-datasheet.pdf",
            mime: "application/pdf",
          },
        },
        new Set(["Polymaker PETG Official Technical Datasheet"]),
      ),
    ).toBe(true);
  });

  it("does not follow redirects to private hosts when caching source PDFs", async () => {
    const warn = jest.fn();
    global.fetch = jest.fn().mockResolvedValueOnce(
      new Response(null, {
        status: 302,
        headers: {
          location: "https://127.0.0.1/internal.pdf",
        },
      }),
    );

    await expect(
      fetchSourceDocumentResponse(
        "https://manufacturer.example.com/manual.pdf",
        "Official Manual",
        { warn },
      ),
    ).resolves.toBeUndefined();

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenCalledWith(
      new URL("https://manufacturer.example.com/manual.pdf"),
      expect.objectContaining({ redirect: "manual" }),
    );
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining("Blocked private source document host"),
    );
  });

  it("accepts only PDF signature bytes for cached source files", () => {
    const pdfBody = new TextEncoder().encode("%PDF-1.7\n...").buffer;
    const htmlBody = new TextEncoder().encode("<html>login</html>").buffer;

    expect(isPdfDocumentBody(pdfBody)).toBe(true);
    expect(isPdfDocumentBody(htmlBody)).toBe(false);
  });
});
