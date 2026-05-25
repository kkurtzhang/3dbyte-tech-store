import {
  normalizeStrapiProductDocument,
  toPublicProductDocumentSearchDocument,
} from "../utils/public-documents";

describe("public product document normalization", () => {
  it("maps Strapi media documents to safe public download payloads", () => {
    const document = normalizeStrapiProductDocument({
      documentId: "doc_strapi_1",
      medusa_product_id: "prod_1",
      product_handle: "printer-one",
      product_title: "Printer One",
      title: "Printer One Datasheet",
      document_type: "datasheet",
      version: "v2",
      language: "en",
      search_keywords: ["printer", "datasheet"],
      sort_order: 3,
      publishedAt: "2026-05-01T00:00:00.000Z",
      file: {
        id: 10,
        name: "datasheet.pdf",
        url: "https://cdn.example.com/datasheet.pdf",
        mime: "application/pdf",
        size: 241,
      },
      file_key: "private/object/key.pdf",
      serial_number: "SN-PRIVATE",
      customer_id: "cus_private",
    });

    expect(document).toEqual({
      id: "doc_strapi_1",
      medusa_product_id: "prod_1",
      product_handle: "printer-one",
      product_title: "Printer One",
      title: "Printer One Datasheet",
      document_type: "datasheet",
      file_url: "https://cdn.example.com/datasheet.pdf",
      file_name: "datasheet.pdf",
      mime_type: "application/pdf",
      file_size: 241,
      version: "v2",
      language: "en",
      search_keywords: ["printer", "datasheet"],
      sort_order: 3,
      published_at: "2026-05-01T00:00:00.000Z",
    });
  });

  it("builds a public Meilisearch document without private keys or signed URLs", () => {
    const searchDocument = toPublicProductDocumentSearchDocument({
      id: "doc_1",
      medusa_product_id: "prod_1",
      product_handle: "printer-one",
      product_title: "Printer One",
      title: "Printer One Manual",
      document_type: "manual",
      file_url: "https://cdn.example.com/manual.pdf",
      file_name: "manual.pdf",
      mime_type: "application/pdf",
      file_size: 512,
      version: "v1",
      language: "en",
      search_keywords: ["printer", "manual"],
      sort_order: 1,
      published_at: "2026-05-01T00:00:00.000Z",
    });

    expect(searchDocument).toEqual({
      id: "doc_1",
      medusa_product_id: "prod_1",
      product_handle: "printer-one",
      product_title: "Printer One",
      title: "Printer One Manual",
      document_type: "manual",
      version: "v1",
      language: "en",
      file_name: "manual.pdf",
      file_size: 512,
      public_download_path: "/store/product-documents/doc_1/download",
      search_keywords: ["printer", "manual"],
      sort_order: 1,
      published_at_timestamp: 1777593600000,
    });
    expect(searchDocument).not.toHaveProperty("file_url");
    expect(searchDocument).not.toHaveProperty("file_key");
    expect(searchDocument).not.toHaveProperty("customer_id");
    expect(searchDocument).not.toHaveProperty("serial_number");
  });
});
