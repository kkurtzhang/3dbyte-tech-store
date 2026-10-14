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

At snapshot `36232563`, six Fiberlogy records (ABS, ABS+GF, ASA, PCTG, PCTG+CF10, PCTG+GF10) resolved correctly but required temperature/settings wording. The subsequent `feat/knowledge-100-specs-20261013` follow-up fixes generic specifications/specs/technical-details intent using only the two existing supported manufacturer fields. Existing unknown guards and citation integrity remain mandatory; requests outside recorded facts now report a scoped unknown rather than claiming the reference is unregistered. TPU95-HF's requested canonical drying values correctly remain unknown in this corpus. The preserved first route report documents these seven initial expectation mismatches; the final fixture explicitly tests supported temperature questions and the TPU unknown instead of changing evidence.

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


## Independent combined focus milestone

Follow-up branch `integration/security-knowledge-focus100-20261013` starts from `eb2e79f8959aae786c2fcdbaa040ad412b3005d2` and integrates the five pinned source commits through `362325631dd41a2d3e1a241c1b02ee3ab82fcbf1`. The one conflict in `local-catalogue-subjects.ts` is resolved with the complete generated 100-reference registry. Existing backend held/adjacent-identity safeguards, explicit seed discovery, source-preservation corrections, dependency remediation and scoped React type fix are retained.

Three additional committed regressions preserve the exact reported questions: E3D Roto motor followed by “What about its specifications?”; the same sequence after an older Magigoo PP subject; and Fiberlogy ASA followed by that pronoun question. All three now retain the correct exact group. The two motor routes answer from motor evidence. At that focus-only milestone, the ASA generic-specifications route remained unknown; its manufacturer printing/bed-temperature route passed. The specifications integration below closes that intent gap. No source facts or expected prices were changed to make tests pass.

Fresh combined verification:

- 196 Jest regressions pass; two optional fixture cases skip in the ordinary suite and actual route coverage runs separately. The two focus modules have 94.44% line and 90.27% branch coverage.
- 131 actual offline chat-route identity checks and 131 source-evidence checks pass: the 128 source cases plus the three integration cases. Seven batches stay at or below 20 requests without changing the rate limiter.
- All five workspace type commands pass, including generated storefront development/production types, backend admin and all three React peer regressions. The source milestone’s limited type-check does not describe this fresh combined result.
- 22 expansion Python tests, full local-knowledge Ruff F/E9, the two new Python utilities’ formatting and changed handwritten TypeScript formatting pass. No TypeScript ESLint pass is claimed; the inherited configuration limitation remains.
- Registry regeneration is byte-identical against the original pinned snapshot and ledger. Independent SQL checks confirm 100 counted references (30 baseline + 70 additions), 103 stored references/variants, 150 active records, 962 active claims and 247 retained historical reviews. Each registry entry’s source-record revisions and source URLs match SQL.
- All 15 private tables match both the copied source snapshot (apart from rebased private source paths) and the pre-test baseline. All 460 copied source files match the previous fixture; 613 active citations and 231 text/226 available raw captures verify. Five historical unavailable raw captures remain unused. The 22 original source pins, six focus evidence pins and 71 previous integration artifacts remain unchanged.

The final exact-head source archive, local SQLite snapshot, patches, logs and readiness report are stored under `/Volumes/MINI-M1/Codex/3dbyte-tech-store/artifacts/security-knowledge-integration-20261013/focus100`. The SQLite snapshot requires its byte-identical sources under the new private `focus100-fixture/catalogue100` directory.

The Gitleaks exception proposal remains unapplied. The exact-head scan result is reported in that artifact directory and must not be represented as a clean release gate. Braces and previous dependency-audit limitations remain unresolved; no external audit/re-review retry occurred. The six Fiberlogy generic specifications/wording fixes are integrated in the following milestone. Native binding, canonical native review, production build/release validation and publication remain outside this local integration. Preview stays off; no service, dependency install, native write, push, merge or deployment occurred.
## Generic specifications follow-up

`362325631dd41a2d3e1a241c1b02ee3ab82fcbf1` remains the preserved integration snapshot. The small follow-up branch `feat/knowledge-100-specs-20261013` changes only deterministic catalogue intent selection, its regression coverage and this handoff. No facts or products were added; the count remains 100 plus three uncounted RC references.

Verification uses a separate `20261013-catalogue100-specs` corpus copy. The 30 exact route cases are committed as `evaluation/fiberlogy-generic-specs-cases-v1.json`: six families × four direct/follow-up forms, two explicit ASA scope cases after Magigoo PP and E3D Roto motor, and four scoped unknowns. All 30 identity/evidence cases pass, with the exact two manufacturer fields in all 26 positive responses. Five targeted Python test methods additionally cover 18 generic phrasing subcases, citation failure, mismatched groups and unknown precedence. See `reports/specs-final-evidence.json`, `reports/specs-final-identities.json` and `reports/specs-streams.json` in that verification workspace.

This follow-up does not duplicate the integration worker's seed-discovery, held-identity, dependency or security changes. No services, dependencies, model calls or native writes were used.


Follow-up checks: 11 targeted/persisted retrieval test methods pass (including the phrasing subcases), 193 frontend regressions pass, all 30 actual route cases pass, Ruff check/format passes, and the unchanged source-and-test TypeScript check passes with `.next/dev` excluded. The unrelated historical import-replay test was attempted but its original source paths are outside this isolated copy's source-registration boundary; that guard was preserved, not weakened. Import activation and replay code were not changed. Original corpus file hashes, all 15 copied database tables and every preserved focus-receipt artifact remain unchanged; preservation evidence is `20261013-catalogue100-specs/reports/specs-preservation.json`.


## Combined specifications integration

Branch `integration/security-knowledge-specs100-20261013` preserves the completed focus head `cf10cef34b19bb1a245d0110a3ab02dab423e3b8` and integrates source `6b10bc4307c7afab616188c14ba79e7dde19b79e`. Only the deterministic catalogue selector, its tests/data and documentation change. The three integration conversation cases now require the existing ASA manufacturer printing and bed-temperature fields instead of accepting its earlier generic-intent unknown.

Fresh bounded checks pass: 27 Python tests (five new specification methods plus 22 corpus safeguards), all seven historical catalogue tests including replay, and 33 actual offline route identity/evidence checks (30 source cases plus the three reported integration cases). Exactly 27 positive Fiberlogy responses select only the two existing supported manufacturer fields; two Roto cases retain their own evidence, and four unknown cases select no facts. Ruff F/E9 and affected Python formatting pass.

The historical replay issue is a fixture setup failure, not an importer regression. The source worker's first run lacked `reports/catalogue-captures-v1.json`; the next run supplied a manifest whose raw paths were outside that copy's `ROOT/sources`, triggering the existing `Store.source` assertion. The integration's correctly rebased private v1 fixture passes the replay unchanged, and all 15 of its tables still match its frozen baseline. No production source-registration guard was bypassed or modified.

The full five-workspace type pass, 196 Jest regressions, registry reproduction and 131-route focus verification from `cf10cef3` are retained. Application TypeScript, frontend tests, type configuration, generated registry and dependency manifests are unchanged by this Python-only follow-up. These unchanged long suites were not repeated or represented as fresh runs. The 33 newly affected route cases supersede the old ASA unknown expectation.

All 15 expansion tables and 460 source files remain unchanged, along with 613 active citations, 231 source versions, 247 historical reviews and the 100-reference count. Fourteen AUD price gaps remain unknown and are not a prerequisite for the source-backed reference count. No products, facts, approvals or native writes were added.

Final source/database snapshots, local patches and the consolidated readiness report are under `/Volumes/MINI-M1/Codex/3dbyte-tech-store/artifacts/security-knowledge-integration-20261013/specs100`. Gitleaks remains an unresolved release gate: the focus milestone reported 52 `generic-api-key` findings, comprising the earlier ten and 42 generated non-secret catalogue group identifiers. The original ten-finding proposal is unapplied and does not cover the additional locations. The final exact-head scan result is retained in the handoff. Braces, other retained advisories, fresh external audit/remote CI and native/release approval remain pending. Preview remains off; no services, dependencies, audit retries, push or deployment occurred.
