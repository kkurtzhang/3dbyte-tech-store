import { render, screen } from "@testing-library/react";
import { ReferenceCards } from "../reference-cards";

const card = {
  version: 1 as const,
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
  scope: "staging" as const,
  catalogue_role: "knowledge_reference" as const,
  checkout_enabled: false as const,
  price: null,
  simulated_initial_quantity: 0,
};
it("shows source-backed reference facts, unknowns, simulated zero stock and no purchase action", () => {
  render(<ReferenceCards references={[card]} />);
  expect(
    screen.getByRole("heading", { name: "2024 Hotend" }),
  ).toBeInTheDocument();
  expect(
    screen.getByText("Unknown — awaiting source confirmation"),
  ).toBeInTheDocument();
  expect(screen.getByText(/Initial simulated stock: 0/)).toBeInTheDocument();
  expect(screen.getByText(/Test price unset/)).toBeInTheDocument();
  expect(
    screen.getByRole("link", { name: "Official reference" }),
  ).toHaveAttribute("href", card.source_url);
  expect(
    screen.queryByRole("button", { name: /cart|buy|checkout/i }),
  ).not.toBeInTheDocument();
});
it("has an honest empty state before native approval/import", () => {
  render(<ReferenceCards references={[]} />);
  expect(screen.getByText(/No approved references/)).toBeInTheDocument();
});
