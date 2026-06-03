import { getEmailBrandLogoUrl } from "../brand-assets";

describe("email brand assets", () => {
  it("embeds the checked-in logo for local development previews", () => {
    const logoSrc = getEmailBrandLogoUrl({
      NODE_ENV: "development",
    });

    expect(logoSrc).toMatch(/^data:image\/png;base64,/);
    expect(logoSrc.length).toBeGreaterThan(1000);
  });

  it("uses the local storefront asset URL when local embedding is disabled", () => {
    expect(
      getEmailBrandLogoUrl({
        EMAIL_BRAND_LOGO_EMBED: "false",
        NODE_ENV: "development",
      }),
    ).toBe(
      "http://127.0.0.1:3001/brand/logos/logo-primary-horizontal-640w.png",
    );
  });

  it("uses the production store URL for production emails", () => {
    expect(
      getEmailBrandLogoUrl({
        APP_ENV: "production",
        NODE_ENV: "production",
      }),
    ).toBe(
      "https://store.3dbytetech.com.au/brand/logos/logo-primary-horizontal-640w.png",
    );
  });

  it("still allows explicit asset URL overrides", () => {
    expect(
      getEmailBrandLogoUrl({
        EMAIL_ASSET_BASE_URL: "http://127.0.0.1:4173/",
        NODE_ENV: "development",
      }),
    ).toBe(
      "http://127.0.0.1:4173/brand/logos/logo-primary-horizontal-640w.png",
    );
  });
});
