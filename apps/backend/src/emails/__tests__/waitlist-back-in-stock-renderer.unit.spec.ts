import { renderWaitlistBackInStockEmail } from "../renderers/waitlist-back-in-stock";

describe("renderWaitlistBackInStockEmail", () => {
  beforeEach(() => {
    process.env.EMAIL_ASSET_BASE_URL = "https://store.3dbytetech.com.au";
  });

  it("renders a branded, customer-friendly back-in-stock email", async () => {
    const rendered = await renderWaitlistBackInStockEmail({
      manageUrl: "https://store.3dbytetech.com.au/waitlist/manage?token=test",
      productTitle: "Polymaker HT-PLA-GF",
      productUrl:
        "https://store.3dbytetech.com.au/products/polymaker-ht-pla-gf",
      storeName: "3D Byte Tech",
      variantTitle: "Power Tool Green",
    });

    expect(rendered.subject).toBe(
      "Polymaker HT-PLA-GF (Power Tool Green) is back in stock",
    );
    expect(rendered.html).toContain(
      "https://store.3dbytetech.com.au/brand/logos/logo-primary-horizontal-640w.png",
    );
    expect(rendered.html).toContain('alt="3D Byte Tech"');
    expect(rendered.html).toContain("Good news - it is available again.");
    expect(rendered.html).toContain("View product");
    expect(rendered.html).toContain("Manage this alert");
    expect(rendered.text).toContain(
      "Good news - Polymaker HT-PLA-GF (Power Tool Green) is back in stock at 3D Byte Tech.",
    );
    expect(rendered.text).toContain("Manage this alert:");
  });
});
