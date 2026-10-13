# 100-reference conversation focus follow-up

Source task: parent conversation `01a11a2a-4478-70c8-863c-bd4818f820e5`, 13 October 2026. Continue the usability gap for the existing 100 references; do not add products or perform native writes, service startup, model calls, pushes or deployment.

Branch: `feat/knowledge-100-focus-20261013`, based on the preserved milestone `1132c55ef07ac376216c18ed7123c680f3585d09`. Runtime and tests remain local development only.

## Changes

- A reproducible registry covers exactly 100 counted reference groups. Its pinned snapshot/ledger hashes, source titles, canonical keys, active record revisions and supported-source URLs are committed with the generated TypeScript. A small reviewed alias policy holds narrow exceptions. The adapter's closed group allowlist derives from this same registry.
- Pronoun follow-ups use the latest named user subject. Assistant text never selects a product. A private, retailer or unfamiliar newer user topic stops older focus from resurfacing. New revision suffixes cannot match an older prefix.
- Specific grade aliases suppress only contained generic matches. Separate mentions remain separate; bare Magigoo, LGX, FlowTech, SpacePi, Eddy, Fiberlogy nylon and colorFabb TPU require clarification.
- The retailer and 3D Sets guide resolvers do not inherit an earlier kit when the latest question names a catalogue product.
- RC wording now attributes 3DMakerParts to captured listing titles and West3D to retailer vendor metadata. Original-brand attribution remains unresolved. All three references remain uncounted. Official guides and FAQs remain links only.

No corpus facts, source bytes, prices, stock records, original-brand approvals, product bindings or native IDs were changed.

## Exact regression coverage

The committed `evaluation/catalogue100-focus-cases-v1.json` exercises a named title followed by “What are its specifications?” for all 100 groups. The test includes unrelated assistant suggestions between user turns.

Switches followed by a pronoun question include:

| Earlier user subject | New user subject | Required group |
|---|---|---|
| TPU95-HF | SUNLU FilaDryer S2 | catalogue_c100_sunlu_s2 |
| SUNLU FilaDryer S2 | Magigoo PP | catalogue_magigoo_pp50 |
| 4007010136 | SUNLU FilaDryer E2 | catalogue_c100_sunlu_e2 |
| Magigoo PC | 4001040056 | prior_R03 |
| SUNLU FilaDryer S2 | Magigoo PC | catalogue_c100_magigoo_pc |
| LGX Lite V2 | LGX Lite PRO | catalogue_c100_bondtech_lgx_lite_pro |
| SpacePi X4 | SpacePi X4L | catalogue_c100_creality_spacepi_x4l |
| WES2487 | Magigoo PC | catalogue_c100_magigoo_pc |

Further cases cover S2/E2, FlowTech M3101/CM2, Fiberlogy PCTG/PCTG+CF10, and a specific LGX/Magigoo plus a second bare family. They require clarification. SB2209 RP2040, SKR Mini E3 V3.0.1, LGX Lite V2 mirrored, varioShore Prosthetic, Manta M8P V2.1 and LGX Lite V2.1 cannot inherit sibling facts. A newer “Tell me about Revo Mini” or “Tell me about 3DLAC Plus” blocks earlier S2 focus.

The actual route also covers WES2487 or Sandy guide history followed immediately by “What are this SUNLU FilaDryer S2's specifications?”, dated price and live stock/delivery unknowns, and guide/FAQ link-only paths. `evaluation/catalogue100-focus-route-cases-v1.json` records all 128 exact route cases, expected focus, group and source fields.

## Verification and artifacts

Verification workspace:
`/Volumes/MINI-M1/Codex/3dbyte-tech-store/local-knowledge/20261013-catalogue100-focus`

- 193 Jest regression tests pass; 2 fixture-gated tests are skipped in the ordinary suite. The actual offline route harness was run separately in seven batches of at most 20 requests, preserving the 30/minute rate limit.
- 128/128 actual route identity checks and 128/128 source-evidence checks pass. The route imports the real chat handler and adapter, with fetch transported to persisted Python retrieval via subprocess. Citation text, source hash, record revision, source scope, expected fields and rendered source links are checked against the copied database.
- Registry regeneration `--check` passes against the pinned immutable snapshot and ledger. Ruff check/format passes for both new Python verification utilities. Changed handwritten TypeScript is Prettier formatted.
- Source-and-test TypeScript check passes with incremental output disabled and existing generated `.next/dev` files excluded. This is not a full generated Next build or the integration worker's full-workspace type check.
- ESLint was invoked, but the existing app configuration only matches JavaScript: all five changed TypeScript modules were ignored with warnings. This is not a TypeScript lint pass; no dependencies or lint gates were changed.
- SHA-256 comparison of all 1,588 files in the original `20261013` and `20261013-catalogue100` roots finds no changes, additions or deletions. All 15 SQLite tables in the verification copy match the milestone snapshot.
- No preview, browser, listening service, native write, model call, dependency install, push or deployment was performed. This is deterministic offline verification, not visual or LLM evaluation.

Evidence: `reports/focus-final-v2.json`, `reports/coverage-v2/coverage-summary.json`, `reports/route-final-evidence.json`, `reports/route-final-identities.json`, `reports/route-final-streams.json`, and `reports/preservation-final.json` under the verification workspace. Source/test type-check output is `logs/typecheck-v2.log`.

To reproduce the registry, run `generate_focus_registry.py --check --snapshot <immutable milestone snapshot> --ledger <milestone canonical ledger>`. Both input hashes must match the committed milestone. For route verification, use the existing `local-knowledge-coverage-offline.test.ts` with an isolated workspace, batches of the committed cases, and new output filenames. Combine its captures and run `verify_focus_routes.py --fixture <committed cases> --streams <combined captures> --report-prefix <new prefix>`.

## Integration and remaining limits

The integration worker reported independent commit `eb2e79f8959aae786c2fcdbaa040ad412b3005d2`. This branch does not duplicate its seed discovery, held-identity backend fallback, source-history, dependency or security fixes. Integration changes to `local-catalogue-subjects.ts` overlap the generated-registry replacement; preserve the new closed 100-reference registry when resolving that file. Keep the integration backend fixes.

Alias resolution is deterministic and bounded to reviewed identities. It does not promise arbitrary paraphrase, exhaustive model recognition, physical supplier-variant selection or factual coverage for every intent.

Six existing Fiberlogy records (ABS, ABS+GF, ASA, PCTG, PCTG+CF10, PCTG+GF10) resolve correctly but their backend rules do not recognize a generic “specifications” request; that request currently returns unknown with misleading “not registered” wording. Their supported temperature/settings questions pass route evidence checks. This existing backend intent/wording limitation was not altered here. TPU95-HF's requested canonical drying values correctly remain unknown in this corpus. The preserved first route report documents these seven initial expectation mismatches; the final fixture explicitly tests supported temperature questions and the TPU unknown instead of changing evidence.

## Fourteen identities without a verified AUD price

These gaps are among the 70 additions, not permission to add products or infer prices. No new price research was performed in this follow-up. Manufacturer facts and external dated offers remain separate; none imply a live store price or stock.

| Identity | Remaining price-evidence gap |
|---|---|
| SUNLU FilaDryer S2 | Australian capture failed. |
| CNC Kitchen TS100/101 adapter tips set | Australian response was empty. |
| CNC Kitchen deburrer with three blades | Australian response empty; manufacturer/Australian EAN mapping conflicts. |
| Creality SpacePi X4 dryer | Captured Australian page selects X4L, a distinct model. |
| PrintDry large non-vacuum filament container | Matching Australian price and package unverified. |
| EIBOS Polyphemus rotating filament dryer | Australian handshake failed; 70/80°C revision and 3KG package unresolved. |
| BIGTREETECH SFS V2.0 filament sensor | Australian listing now refers to V2.1. |
| BIGTREETECH EBB36 Gen2 V1.0 | Australian selector defaults to EBB42. |
| E3D Revo Six coldside kit | Australian selector defaults to Prusa Mini. |
| Fiberlogy ASA | No matching Australian price captured in the used sources. |
| Fiberlogy FiberFlex 30D TPU | Collection changed; no exact product price established. |
| Fiberlogy Easy ABS | AUD scope and net package mapping remain unverified. |
| FormFutura Python Flex TPU 98A | X3D product URL returned 404; historical snippets are not current offers. |
| FormFutura AquaSolve PVA | X3D product URL returned 404; historical diameter/price offers are not current. |
