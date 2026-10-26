import type { KnowledgeDocumentBody } from "@3dbyte-tech-store/shared-types/src/knowledge-reference";

// A manufacturer replaced this model's page and silently selected a successor
// variant. Keep a narrow, reviewed source hold for the existing native product.
// See docs/product-document-source-identity.md for evidence and update procedure.
const LEGACY_POLYLITE_PRODUCT = "prod_01KSY6A5854QN8QEMN1V06ZA13";
const LEGACY_POLYLITE_SOURCE =
  "https://cdn.shopify.com/s/files/1/0548/7299/7945/files/PolyLite_PETG_TDS_EN_V5.4.pdf?v=1731954068";
const LEGACY_POLYLITE_SHA256 =
  "b12159542c10794d0da3153c9097ba134f4536d0c93e57a2756e1bd0cf5ac48d";

function canonicalSourceUrl(sourceUrl: string): string | null {
  try {
    const url = new URL(sourceUrl);
    if (url.protocol !== "https:" || url.username || url.password) return null;
    url.hash = "";
    return url.href;
  } catch {
    return null;
  }
}

/** Metadata intake does not approve evidence or establish a model from a URL. */
export function productSourceIdentityAllowed(
  productId: string,
  sourceUrl: string,
  sourceKind: string,
): boolean {
  if (productId !== LEGACY_POLYLITE_PRODUCT) return true;
  return (
    sourceKind === "official_datasheet" &&
    canonicalSourceUrl(sourceUrl) === LEGACY_POLYLITE_SOURCE
  );
}

/**
 * No network request or inferred redirect equivalence: this legacy product can
 * use only the reviewed source bytes at model scope. A new capture, source or
 * variant-specific claim needs a separately reviewed policy update. Other
 * products retain their existing native review requirements.
 */
export function knowledgeSourceIdentityAllowed(
  body: KnowledgeDocumentBody,
): boolean {
  if (body.product_id !== LEGACY_POLYLITE_PRODUCT) return true;
  return (
    productSourceIdentityAllowed(
      body.product_id,
      body.source_url,
      body.source_kind,
    ) &&
    body.source_sha256 === LEGACY_POLYLITE_SHA256 &&
    body.binding_scope === "product" &&
    body.variant_id === null
  );
}
