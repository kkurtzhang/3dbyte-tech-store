# Active local retailer references

The three DREMC retailer references are now actual records in the isolated local SQLite corpus and are usable through the existing development chatbot. This follow-up does not modify the combined integration snapshot, dependencies or native staging data.

## Behavior improvement

Previously, all eight retailer test questions reached a generic 3D Sets kit response and failed their specific expectations. After activation, all eight pass against the actual loopback chat route:

| Question | Actual response behavior |
| --- | --- |
| Does DREMC WES2487 include radio/battery? | Cites the captured shared retailer exclusion note. |
| Does DREMC WES2487 include STLs? | Cites the retailer's printed-parts/STL exclusion note. |
| What must I buy separately for DREMC WES2488? | Returns both verified shared listing exclusions, with retailer scope and source link. |
| What exact parts are included in DREMC WES2489? | Exact contents, kit revision and BOM revision remain unknown. Family BOM rows are not promoted into an exact package guarantee. |
| Which exact model version is verified? | Remains unknown; a family title is not verified release compatibility. |
| Which connector / how many small servos? | Persisted connector and servo unknowns remain null. |
| Does a 3D Byte Tech kit include STLs? | Actual store SKU, digital access and contents remain unverified; retailer facts do not establish that store offering. |

Retailer references are selected only by the known exact external source SKUs. Follow-ups carry the most recent named SKU from user messages; compared SKUs request clarification. Private history and assistant assertions do not supply identity or facts. The renderer selects persisted verified fields for the requested topic, and every rendered statement retains its source scope, local revision and byte/excerpt-verified citation.

Official build-guide and FAQ questions take precedence and remain link-only. A Sandy guide request that also names a kit/SKU links the verified presentation. A SKU without an exact model does not imply a model/guide mapping. Seven actual follow-up/resource tests pass, including SKU replacement, ambiguous references, named-model guide, SKU-only guide clarification, FAQ and commerce boundaries.

Generic material retrieval excludes retailer records; a selected retailer group excludes unrelated material/nozzle guides. Price/stock/delivery and manufacturer ambiguity are not promoted from retailer metadata. Captured retailer offer prices and availability are not active answer facts or actual store inventory.

## Source and factual-review mechanism

All **21 supported facts** were verified against the immutable captured retailer response using raw/text SHA-256, exact JSON leaf pointers and serialized shared-note character excerpts. All **33 unsupported/conflicting fields** remain persisted nulls with no citations. The source scope explicitly describes a captured external DREMC listing rather than a verified physical supplier package or 3D Byte Tech fulfilment kit.

The existing `Store.ingest` mechanism writes `accepted_for_local_development` decisions. The new actor is `codex_local_retailer_reference_source_review`, with reviewer type `codex_agent` and basis `agent_source_review_for_authorized_local_development`. User factual review is not claimed, parent review remains pending, and native approvals remain absent. This is the same local mechanism used for the previously added guides; it does not substitute for user or native editorial approval.

Three product grouping rows, three local variants and three document bindings were allocated inside the ingest transaction. They are actual local database identities, not invented Medusa/Strapi IDs. Local reference prices and physical stock are null, checkout disabled, selected physical supplier variant unbound and staging IDs null. Conflict validation and rollback preserve unrelated local state. Re-ingesting the same records skips them without creating additional review events.

Current actual corpus: **23 local groups/variants, 41 source documents, 15 guides, 56 records and 303 claims**. Claims comprise 112 supported facts, 137 explicit unknowns and 54 editorial inferences. There are 71 source-version observations and 112 local editorial decisions; native approvals total zero. All previous record revisions were preserved. A database backup was saved before activation at the existing SSD workspace's `exports/retailer-agent-local-activation-v1-before.sqlite3`.

## Preview and reproduction

The owned services were restored after initial connection refusal and verified on literal loopback: project chatbot port 3005 and knowledge API port 8873. The health endpoint is `http://127.0.0.1:8873/api/status`; send questions through `http://127.0.0.1:3005/api/ai-shopping-assistant` or the existing drawer on the local help page. No public/LAN listener was created.

Example prompts:

- `Does the DREMC retailer reference WES2487 include a radio and battery?`
- `Does DREMC WES2487 include STL model files?`
- `What do I need to buy separately for the DREMC WES2488 reference?`
- `What exact parts are included in DREMC WES2489?`
- `Where is the public Sandy build guide for WES2487 kit?`

Use existing dependencies and the `README.md` service procedure. To activate/replay the scoped local records on this SSD, from the repo root:

```sh
KB=/Volumes/MINI-M1/Codex/3dbyte-tech-store/local-knowledge/20261013
env -i PATH=/opt/homebrew/bin:/usr/bin:/bin \
  PYTHONDONTWRITEBYTECODE=1 PYTHONNOUSERSITE=1 \
  TMPDIR="$KB/tmp" LOCAL_KNOWLEDGE_WORKSPACE="$KB" \
  python3 -B scripts/local-knowledge/activate_retailer_references.py \
  --report new-retailer-local-review.json
```

Choose a new report name; existing backups/reports are preserved. Refresh the owned index after any accepted record change using the same environment and `python3 -B scripts/local-knowledge/retrieval.py --train`. The API process must restart when its Python logic changes; reuse/stop only the owned loopback process. No environment/credential file is loaded. Neither activation nor retrieval connects to a native database.

## Verification and boundaries

Passed: 35 Python tests, 41 focused adapter/focus/RC Jest tests, 8 retailer actual-route cases, 7 actual follow-up/resource cases, 8 existing source-evidence cases and 7 unavailable/tampered-citation checks. Ruff F/E9 and formatting passed; the configured JavaScript-only storefront lint gate passed. Source/test typing passed the existing local diagnostic profile that excludes generated dev checks. Full release types/build/security remain owned by the separate integration worker; this diagnostic does not replace its exact-head gates.

All answers here are deterministic source context/resource routing. No language model generation, pretrained embeddings, paid calls, staging writes or guide/FAQ content ingestion occurred. Browser visual inspection remains unavailable in this text task, as recorded in `evaluation/native-reference-browser-capabilities.json`; actual API and component tests do not claim screenshots or full browser interaction.

Native activation and commercial fulfilment still require their separately documented genuine bindings/review and exact claimed facts. Those pending states do not block supported external retailer facts from the expressly authorized local agent-review path.

## Combined integration verification

The retailer activation entry point consumes the integrated plan’s `reference_id`. The tested `afbf02b` milestone remains preserved; the follow-up branch retains its scoped Next React type-peer fix and dependency lockfile. Integration validation uses a copied corpus and owned loopback fixture services, without operating the original preview services or active corpus. The original-branch measurements above retain their provenance; exact combined-head evidence is recorded in the SSD integration artifacts. Native approvals and deployment remain separate pending steps.
