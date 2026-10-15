import { POST } from "../route";
import { documentKnowledgeDependencies } from "../../../../../../lib/product-document-knowledge/lifecycle";
import { reconcileProductDocuments } from "../../../../../../lib/product-document-knowledge/synchronize";
jest.mock("../../../../../../lib/product-document-knowledge/lifecycle", () => ({
  documentKnowledgeDependencies: jest.fn(),
}));
jest.mock(
  "../../../../../../lib/product-document-knowledge/synchronize",
  () => ({ reconcileProductDocuments: jest.fn() }),
);
const dependencies = jest.mocked(documentKnowledgeDependencies);
const reconcile = jest.mocked(reconcileProductDocuments);
function fixture(body: unknown) {
  const req = { body, scope: {} };
  const res = { setHeader: jest.fn(), status: jest.fn(), json: jest.fn() };
  res.status.mockReturnValue(res);
  return { req, res };
}
beforeEach(() => jest.clearAllMocks());
it.each([
  undefined,
  {},
  { document_ids: [] },
  { document_ids: ["doc_a", "doc_a"] },
  { document_ids: ["doc_a", "doc_b", "doc_c"] },
  { document_ids: ["bad/id"] },
  { document_id: "doc_a" },
  { document_ids: ["doc_a"], all: true },
])(
  "rejects absent, invalid or unbounded scope before service access (%j)",
  async (body) => {
    const { req, res } = fixture(body);
    await POST(req as never, res as never);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(dependencies).not.toHaveBeenCalled();
    expect(reconcile).not.toHaveBeenCalled();
  },
);
it.each([["doc_a"], ["doc_a", "doc_b"]])(
  "passes only the exact requested IDs (%j)",
  async (...document_ids) => {
    const { req, res } = fixture({ document_ids });
    dependencies.mockReturnValue({ marker: true } as never);
    reconcile.mockResolvedValue({
      indexed: document_ids.length,
      deleted: 0,
      knowledge_indexed: 0,
    });
    await POST(req as never, res as never);
    expect(reconcile).toHaveBeenCalledWith({
      marker: true,
      documentIds: document_ids,
    });
    expect(res.setHeader).toHaveBeenCalledWith("Cache-Control", "no-store");
    expect(res.json).toHaveBeenCalledWith({
      document_ids,
      indexed: document_ids.length,
      deleted: 0,
      knowledge_indexed: 0,
    });
  },
);
it("returns a safe unavailable response without exposing a native service error", async () => {
  const { req, res } = fixture({ document_ids: ["doc_a"] });
  dependencies.mockReturnValue({} as never);
  reconcile.mockRejectedValue(new Error("private service detail"));
  await POST(req as never, res as never);
  expect(res.status).toHaveBeenCalledWith(503);
  expect(res.json).toHaveBeenCalledWith({
    error: "Scoped product document synchronization is unavailable.",
  });
});
