import job, { config } from "../../../jobs/sync-knowledge-references";
import { reconcileReferenceIndex } from "../reference-index";
jest.mock("../reference-index", () => ({ reconcileReferenceIndex: jest.fn() }));
const env = { ...process.env };
afterEach(() => { process.env = { ...env }; jest.clearAllMocks(); });
it("requires both staging and explicit activation before container resolution", async () => {
  const resolve = jest.fn();
  process.env.APP_ENV = "staging";
  delete process.env.KNOWLEDGE_REFERENCE_INDEX_ENABLED;
  await job({ resolve } as never);
  process.env.APP_ENV = "production";
  process.env.KNOWLEDGE_REFERENCE_INDEX_ENABLED = "true";
  await job({ resolve } as never);
  expect(resolve).not.toHaveBeenCalled();
});
it("dispatches only explicit native IDs and reports completed reconciliation", async () => {
  process.env.APP_ENV = "staging";
  process.env.KNOWLEDGE_REFERENCE_INDEX_ENABLED = "true";
  process.env.KNOWLEDGE_REFERENCE_PRODUCT_IDS = "product_one, product_two";
  (reconcileReferenceIndex as jest.Mock).mockResolvedValue({ indexed: 2, deleted: 1 });
  const info = jest.fn();
  await job({ resolve: (name: string) => name === "logger" ? { info } : {} } as never);
  expect(reconcileReferenceIndex).toHaveBeenCalledWith(expect.objectContaining({ productIds: ["product_one", "product_two"], environment: "staging" }));
  expect(info).toHaveBeenCalledWith(expect.stringContaining('"indexed":2'));
  expect(config.schedule).toBe("*/5 * * * *");
});
