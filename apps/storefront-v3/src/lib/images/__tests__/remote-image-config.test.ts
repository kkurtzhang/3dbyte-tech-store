import { getAiCatalogueRemotePatterns } from "../remote-image-config"

describe("remote image configuration", () => {
  it("allows AI catalogue media from configured storefront origins", () => {
    const patterns = getAiCatalogueRemotePatterns({
      NEXT_PUBLIC_SITE_URL: "https://store.staging.3dbytetech.com.au/",
      SERVICE_URL_STOREFRONT: "https://store.3dbytetech.com.au",
      SERVICE_FQDN_STOREFRONT: "store.staging.3dbytetech.com.au",
      AI_CATALOGUE_MEDIA_BASE_URL: "https://media.3dbytetech.com.au/assets",
    })

    expect(patterns).toEqual([
      {
        protocol: "https",
        hostname: "media.3dbytetech.com.au",
        pathname: "/ai-catalogue/products/**",
      },
      {
        protocol: "https",
        hostname: "store.staging.3dbytetech.com.au",
        pathname: "/ai-catalogue/products/**",
      },
      {
        protocol: "https",
        hostname: "store.3dbytetech.com.au",
        pathname: "/ai-catalogue/products/**",
      },
    ])
  })
})
