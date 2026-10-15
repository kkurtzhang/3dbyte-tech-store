import { POST } from "../product-guidance/route";

const search = jest.fn();
const graph = jest.fn();
const getProductDescription = jest.fn();
const product = {
  id: "prod_petg",
  title: "PETG spool",
  handle: "petg",
  status: "published",
};
function request(body: unknown) {
  return {
    body,
    headers: { "x-3db-internal-token": "fixture-internal" },
    scope: {
      resolve: (name: string) => {
        if (name === "meilisearch") return { search };
        if (name === "query") return { graph };
        if (name === "strapi") return { getProductDescription };
        throw new Error("Unexpected fixture dependency");
      },
    },
  };
}
async function invoke(body: unknown) {
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
  await POST(request(body) as never, res as never);
  return res;
}
beforeEach(() => {
  jest.resetAllMocks();
  process.env.INTERNAL_API_TOKEN = "fixture-internal";
  process.env.STOREFRONT_URL = "https://store.example";
  search.mockResolvedValue({ hits: [] });
  graph.mockResolvedValue({ data: [product] });
  getProductDescription.mockResolvedValue(null);
});

it("returns empty for zero search hits without querying unrelated published products", async () => {
  const res = await invoke({ query: "nonexistent PETG" });
  expect(graph).not.toHaveBeenCalled();
  expect(res.json).toHaveBeenCalledWith(
    expect.objectContaining({ status: "empty", mode: "search", products: [] }),
  );
});

it("treats missing search hits as unavailable rather than an empty catalogue", async () => {
  search.mockResolvedValue({});
  const res = await invoke({ query: "PETG" });
  expect(graph).not.toHaveBeenCalled();
  expect(res.status).toHaveBeenCalledWith(503);
  expect(res.json).toHaveBeenCalledWith(
    expect.objectContaining({ status: "unavailable", products: [] }),
  );
});

it("returns unavailable on a search error without a catalogue fallback", async () => {
  search.mockRejectedValue(new Error("fixture search outage"));
  const res = await invoke({ query: "PETG" });
  expect(graph).not.toHaveBeenCalled();
  expect(res.status).toHaveBeenCalledWith(503);
  expect(res.json).toHaveBeenCalledWith(
    expect.objectContaining({ status: "unavailable", products: [] }),
  );
});

it("requires explicit browse mode for an unfiltered catalogue request", async () => {
  const invalid = await invoke({ query: "" });
  expect(invalid.status).toHaveBeenCalledWith(400);
  expect(graph).not.toHaveBeenCalled();
  const browse = await invoke({ mode: "browse" });
  expect(search).not.toHaveBeenCalled();
  expect(graph).toHaveBeenCalledWith(
    expect.objectContaining({ filters: { status: "published" } }),
  );
  expect(browse.json).toHaveBeenCalledWith(
    expect.objectContaining({
      status: "matches",
      mode: "browse",
      products: [expect.objectContaining({ id: product.id })],
    }),
  );
});

it("never interprets a named query as an unfiltered browse", async () => {
  const res = await invoke({ mode: "browse", query: "PETG" });
  expect(res.status).toHaveBeenCalledWith(400);
  expect(graph).not.toHaveBeenCalled();
});

it("retains search IDs, removes unexpected graph rows and preserves search ordering", async () => {
  search.mockResolvedValue({
    hits: [{ id: "prod_second" }, { id: product.id }],
  });
  graph.mockResolvedValue({
    data: [
      product,
      { ...product, id: "prod_unrelated" },
      { ...product, id: "prod_second" },
    ],
  });
  const res = await invoke({ query: "PETG" });
  expect(graph).toHaveBeenCalledWith(
    expect.objectContaining({
      filters: { status: "published", id: ["prod_second", product.id] },
    }),
  );
  expect(
    res.json.mock.calls[0][0].products.map((item: { id: string }) => item.id),
  ).toEqual(["prod_second", product.id]);
  expect(res.json.mock.calls[0][0]).toMatchObject({
    status: "matches",
    mode: "search",
    query: "PETG",
  });
});

it("returns empty when all matched products are stale or withdrawn", async () => {
  search.mockResolvedValue({ hits: [{ id: product.id }] });
  graph.mockResolvedValue({ data: [{ ...product, status: "draft" }] });
  const res = await invoke({ query: "PETG" });
  expect(res.json).toHaveBeenCalledWith(
    expect.objectContaining({ status: "empty", products: [] }),
  );
});

it("returns unavailable for malformed search IDs and backend graph failures", async () => {
  search.mockResolvedValue({ hits: [{ title: "missing ID" }] });
  const invalid = await invoke({ query: "PETG" });
  expect(invalid.status).toHaveBeenCalledWith(503);
  expect(graph).not.toHaveBeenCalled();
  search.mockResolvedValue({ hits: [{ id: product.id }] });
  graph.mockRejectedValue(new Error("fixture database outage"));
  const outage = await invoke({ query: "PETG" });
  expect(outage.status).toHaveBeenCalledWith(503);
  expect(outage.json).toHaveBeenCalledWith(
    expect.objectContaining({ status: "unavailable", products: [] }),
  );
});

it("does not promote a stale index handle when the native product has no current handle", async () => {
  search.mockResolvedValue({
    hits: [{ id: product.id, handle: "stale-sibling-page" }],
  });
  graph.mockResolvedValue({ data: [{ ...product, handle: undefined }] });
  const res = await invoke({ query: "PETG" });
  expect(res.json.mock.calls[0][0].products[0].productUrl).toBeNull();
});
