# Dated reference-price follow-up — 13 October 2026

This isolated follow-up starts at query-fix commit
`6b10bc4307c7afab616188c14ba79e7dde19b79e`. It revises 13 existing source
records and creates no products. The ledger remains 100 counted identities plus
three held RC references. Product rows, local variants, native-binding placeholders,
non-price claims, all 231 prior source rows and the previous record revisions are
preserved. No live store price, stock, checkout or shipping claim is added.

The working data is on the Mac mini SSD at:
`/Volumes/MINI-M1/Codex/3dbyte-tech-store/local-knowledge/20261013-catalogue100-prices`.
Earlier `20261013`, `20261013-catalogue100`, `20261013-catalogue100-focus` and
`20261013-catalogue100-specs` workspaces were not edited.

| Existing reference / exact observed package             |     AUD | Evidence classification                                  |
| ------------------------------------------------------- | ------: | -------------------------------------------------------- |
| SUNLU S2, Jaycar TL5012, one unit                       |  149.00 | Dated retrieved page; direct HTTP capture blocked        |
| CNC Kitchen TS100/101 adapter + tips set                |   47.95 | Dated original retailer HTML                             |
| Creality SpacePi X4, standalone SKU 4005010107          |  269.00 | Dated manufacturer store JSON-LD                         |
| EBB36 Gen 2 V1.0, variant 46504017035433                |   65.65 | Dated selected retailer JSON variant                     |
| Revo Six 24V coldside pack, REVO-SIX-24V-COLD           |   69.90 | Dated selected retailer JSON variant                     |
| Fiberlogy ASA Natural, 1.75 mm, 750 g                   |   61.15 | Dated retailer JSON and page                             |
| FiberFlex 30D Black, 1.75 mm, 850 g                     |   83.60 | Dated retailer JSON and page                             |
| Easy ABS transparent navy blue, 1.75 mm, 750 g          |   41.00 | Dated retailer embedded product data                     |
| PythonFlex 98A Black, 1.75 mm, 500 g                    |   69.99 | Dated selected attributes endpoint; not the 50 g sample  |
| AquaSolve PVA Natural, 1.75 mm, 300 g                   |   72.99 | Dated retailer data plus matching manufacturer EAN       |
| EIBOS Polyphemus retailer-described 3KG 80c + extension |  231.00 | Historical only; provider crawl age “2 months ago”       |
| BIGTREETECH SFS V2.0, SKU 1060000630                    |   33.45 | Historical only; provider crawl age “last month”         |
| CNC Kitchen deburrer with three blades                  |   29.95 | Quarantined observation; canonical price remains unknown |
| PrintDry single large non-vacuum container              | Unknown | Earlier 129.95 kit cannot be assigned to this package    |

Tax inclusion is supported by the archived page, selected price data or retailer
terms. No checkout or address-specific shipping calculation was performed. All
prices are dated observations, not live 3D Byte offers.

The current SFS URL describes V2.1. Its current price is not attributed to V2.0.
The EIBOS observation retains the retailer's package description and does not
change the existing manufacturer hardware facts. ShapeShop's deburrer EAN
4262391011713 conflicts with manufacturer EAN 4262391010099; its 29.95 amount is
stored only in `price_observations` metadata, leaving the canonical dated-price
claim unknown. The PrintDry record is unchanged.

## Evidence and activation

- `evaluation/price-followup-reviewed-v2.json` pins prior record revisions and
  contains exact text offsets or JSON pointers for price, identity and tax/currency.
- `evaluation/price-followup-source-receipt-v1.json` records the 23 used captures,
  original URLs, raw/text hashes, immutable local paths and capture methods.
- Original HTTP responses are archived independently from extracted review text.
  Jaycar uses a retrieved page response whose provider reported “Crawled: today.”
  Historical SFS and EIBOS observations use independently reproduced cached search
  results, preserving their reported crawl ages and the complete provider response
  envelope. Researcher messages were not accepted as source evidence.
- `activate_price_followup.py` accepts only existing identities, verifies exact
  citations, preserves old revisions and rejects repeated observations or changed
  prior revisions. It writes before/after SQLite snapshots and a revised ledger.
- `evaluation/price-followup-activation-v1.json` and
  `evaluation/price-followup-final-verification-v1.json` contain receipts and hashes.

All 249 available raw captures and 254 normalized source texts pass hash checks.
Five inherited source rows were already marked `raw_capture_available: false`
after an earlier repaired capture defect. They remain unchanged and have no active
claim citations. None is used by this follow-up.

## Verification

- 8 price/history tests and 5 generic-specification tests passed.
- 193 existing local-knowledge Jest tests passed (2 unrelated opt-in tests skipped).
- 34 actual offline chat-handler cases passed identity, field, citation and unknown
  checks; all 12 accepted rendered amounts and dates matched independent expectations.
- Ruff and the existing source-and-test TypeScript boundary passed.
- The before-copy database equals the preserved specifications database across all
  15 tables. SQLite integrity and unchanged product/variant/binding checks passed.

Run route captures with the existing `jest.local-knowledge.config.cjs` from
`apps/storefront-v3`; the default storefront Jest configuration excludes this
scripts-based harness. Route fixtures are split below its 30-request rate limit.
Use `LOCAL_KNOWLEDGE_WORKSPACE` pointing to the isolated price workspace and
`PYTHONDONTWRITEBYTECODE=1`. Tests use local SQLite and a deterministic local search
index, without a listening service or language-model call.

The first route fixture used shortened EBB36 and CNC Kitchen names. The unchanged
focus registry requires `BIGTREETECH EBB36 Gen2 V1.0` and
`CNC Kitchen TS100/101 adapter tips set`. Those initial captures and the corrected
v2 fixture are preserved; query behavior was not expanded in this price follow-up.

No push, deployment, merge, native store write, dependency installation or external
communication was performed.
