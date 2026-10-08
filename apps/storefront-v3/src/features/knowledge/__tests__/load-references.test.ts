import { loadReferencePage } from "../load-references";
import { sdk } from "@/lib/medusa/client";
jest.mock("@/lib/medusa/client", () => ({
  sdk: { client: { fetch: jest.fn() } },
}));
const fetch = sdk.client.fetch as jest.Mock;
const card = () => ({
  version: 1,
  product_id: "prod_hotend",
  variant_id: "variant_hotend",
  product_title: "2024 Hotend",
  product_handle: "hotend",
  document_id: "doc_1",
  document_title: "Official reference",
  revision_hash: "a".repeat(64),
  source_url: "https://manufacturer.example/hotend",
  source_kind: "official_product_page",
  source_sha256: "b".repeat(64),
  source_version: "2024",
  source_checked_at: "2026-10-08T10:00:00Z",
  text: "Printer One.",
  facts: [
    {
      field: "max_temperature_c",
      label: "Maximum operating temperature",
      value: null,
      evidence_excerpt: "",
    },
  ],
  valid_until: "2026-10-20T00:00:00Z",
  scope: "staging",
  catalogue_role: "knowledge_reference",
  checkout_enabled: false,
  price: null,
  simulated_initial_quantity: 0,
});
beforeEach(() => {
  jest.resetAllMocks();
  jest.spyOn(Date, "now").mockReturnValue(Date.parse("2026-10-08T12:00:00Z"));
});
afterEach(() => jest.restoreAllMocks());
it("loads fresh references without caching and preserves explicit unknown/zero values", async () => {
  fetch.mockResolvedValue({ references: [card()], next_offset: null });
  expect(await loadReferencePage(0)).toMatchObject({
    references: [
      expect.objectContaining({ price: null, simulated_initial_quantity: 0 }),
    ],
  });
  expect(fetch).toHaveBeenCalledWith("/store/knowledge-references?offset=0", {
    method: "GET",
    cache: "no-store",
  });
});
it.each([
  "unsafeSource",
  "expired",
  "price",
  "offer",
  "loop",
  "duplicate",
  "unknownOmitted",
])(
  "rejects %s responses instead of rendering unchecked data",
  async (reason) => {
    const item = card(),
      raw = { references: [item], next_offset: null as number | null };
    if (reason === "unsafeSource") item.source_url = "javascript:alert(1)";
    if (reason === "expired") item.valid_until = "2026-10-07T00:00:00Z";
    if (reason === "price") (item as { price: unknown }).price = 1;
    if (reason === "offer") item.checkout_enabled = true;
    if (reason === "loop") raw.next_offset = 0;
    if (reason === "duplicate") raw.references.push(item);
    if (reason === "unknownOmitted")
      delete (item.facts[0] as { value?: unknown }).value;
    fetch.mockResolvedValue(raw);
    await expect(loadReferencePage(0)).rejects.toThrow(
      "Invalid reference response",
    );
  },
);
