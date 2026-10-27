# Product-document source identity holds

A native review binds a product ID and canonical content revision. That does not
prove that the cited manufacturer's page still describes the same model.
Redirects, matching brands, colours and material names must not establish that
equivalence.

## Legacy PolyLite PETG hold

The observed native product is `prod_01KSY6A5854QN8QEMN1V06ZA13`,
**Polymaker PolyLite PETG 1.75mm 1kg**, handle
`polymaker-polylite-petg-175-1kg`. Its Black variant is
`variant_01KSY6A5G61FCN57T1K9NWVBXN`, SKU `PM-PETG-BLK-175-1KG`.
These IDs were verified against the native product/variant/option relationship
on 26 October 2026; a manufacturer's Shopify variant ID is a different identity
domain.

The [old product URL](https://us.polymaker.com/products/polylite-petg?variant=41266031198265)
redirected to [Polymaker PETG](https://shop.polymaker.com/products/petg?variant=41266031198265).
The requested source variant `41266031198265` was absent. The rendered page
selected `45079221108793`, **Black / New Formula / 1kg**, SKU `PB05001`.
Do not transfer that successor's specifications to the legacy product.

The current manufacturer page still links the
[legacy PolyLite PETG TDS V5.4](https://cdn.shopify.com/s/files/1/0548/7299/7945/files/PolyLite_PETG_TDS_EN_V5.4.pdf?v=1731954068).
The verified PDF bytes captured on 26 October 2026 have SHA-256:

```text
b12159542c10794d0da3153c9097ba134f4536d0c93e57a2756e1bd0cf5ac48d
```

The CMS source-identity helper therefore places a narrow hold on this existing
product. Private native intake accepts only this source URL and
`official_datasheet` kind. Approval additionally requires these exact source
bytes and explicit product scope with a null variant. A model datasheet alone
does not establish variant-specific colour, batch or fit claims.

The check runs before review creation and on every public approved-knowledge
projection, including an older decision whose revision hash otherwise matches.
Held documents may still be inspected and rejected by an authorized reviewer.
Historical decisions, document bodies and publication state are never rewritten
by this check. Other products retain the existing native review requirements.
Admin pilot allowlists and permissions are unchanged.

This is a known-product source hold, not a general redirect classifier. It makes
no network request and does not claim that a supplied SHA proves honest
extraction. Reviewers still verify the captured bytes, fact excerpts and source
identity. A forged source attribution is outside this check's guarantee.

## Updating the hold safely

A new legitimate source, changed PDF bytes or variant-specific evidence requires
a reviewed change to the explicit policy with source/model/formulation and
native ownership evidence plus regression tests. Do not remove the hold because
a URL redirects or a title/colour matches. Do not substitute a successor source
or change the native product identity to pass approval.

Native source/content edits still create a new canonical revision; approval is
append-only, publication remains separate, and scoped index synchronization
must verify terminal tasks and exact revision hashes. This fix does not publish
or index any content, change the 90-day freshness maximum, set a new default
expiry, or grant review access.

The inspected PolyLite product-document bodies were all null and had no review
events. Existing metadata and CMS marketing copy require the separately reviewed
data correction; this code does not quarantine the public download link or
rewrite product descriptions.

## Validation

The reproducer executed against staging code before the fix: eight failures
demonstrated acceptance of retired/successor URLs, changed source bytes,
variant-scoped family evidence and unsafe historical projection. The positive
legacy, rejection and unrelated-product controls passed.

Run the native behavior suite with:

```bash
TEST_TYPE=unit pnpm --filter=@3dbyte-tech-store/backend exec jest --runInBand \
  --runTestsByPath src/lib/product-document-knowledge/__tests__/source-identity.unit.spec.ts
```

The fixtures make no manufacturer, model-provider or live CMS request. Broader
native review/public-projection tests preserve authorization, immutable review
and source-binding behavior.
