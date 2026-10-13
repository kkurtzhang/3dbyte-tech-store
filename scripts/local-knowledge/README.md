# Local knowledge chat preview

The consolidated [V1-HANDOFF.md](V1-HANDOFF.md) records the completed bounded evidence scope, 66 source-specific preparations, supplier provenance decisions and exact remaining native/release prerequisites. The active corpus is preserved and preview remains off.

The existing-guide citation repairs are now active locally. See [GUIDE-CITATION-ACTIVATION.md](GUIDE-CITATION-ACTIVATION.md) for 29 revised guides, immutable old/new hashes, qualified equivalent evidence and offline verification. Native approvals remain zero; previews remain stopped.

The bounded evidence follow-up is documented in [EVIDENCE-RECONCILIATION.md](EVIDENCE-RECONCILIATION.md): all four combined claims have source-specific preparations, nine genuine source-form holds have exact reasons, and editorial guidance/citation repairs are separately labelled.

The offline native-import follow-up is documented in [IMPORT-READINESS.md](IMPORT-READINESS.md), including the blocker matrix, 64 prepared source fragments, 33 primary reference plans and the legitimate native workflow. Native actions remain unauthorized.

The finite v1 coverage gate is complete at 30/30 cases. See [V1-COVERAGE-PLAN.md](V1-COVERAGE-PLAN.md) for the completion criterion, bounded additions, verification and separate native-import readiness. Preview services remain stopped.

The preceding offline coverage and two-product follow-up is documented in [COVERAGE-FOLLOWUP.md](COVERAGE-FOLLOWUP.md).

The latest six-product expansion, current counts and offline validation are documented in [CATALOGUE-EXPANSION.md](CATALOGUE-EXPANSION.md). Preview services are stopped.

This branch adds a development-only source retrieval path to the existing storefront chatbot. It uses the existing dedicated SQLite corpus on the external SSD, FTS5 and corpus-trained LSA vectors. It makes no language-model calls and does not provide live store prices, stock, delivery dates or native approval.

## Before and after

| Before | After |
| --- | --- |
| Normal assistant has commerce tools but no local knowledge retrieval tool. | An explicit development flag streams source context through the actual AI SDK route and drawer. |
| Follow-up reference could lose a named part number or carry the wrong subject. | Named material, nozzle family and public part identities retain bounded user-only focus; ambiguous references request clarification. |
| A related material or model-label hit could answer an unresolved electrical/fitment question. | Persisted null fields for the exact part scope force an unknown answer. |
| Source metadata alone could be mistaken for available evidence. | Active evidence is checked against raw/text SHA-256 and exact character excerpts or JSON pointers. Five lost historical raw captures remain rejected. |

Compatible source baseline: commit `3f55081b4e3ef9a9ac538fd369411c57719b32c6`, Medusa **2.15.5**, Strapi **5.48.1**. No dependency or lockfile changes are included. Existing local installations provide Node 22.22.1, Next 16.3.8, AI SDK 6.0.190 and Python with NumPy. No install or credentials are needed for this preview.

## Reproduce on this Mac

The corpus is a separate local-development artifact, not committed business data. Its boundary file must specify a database under its own `data` directory on `/Volumes/MINI-M1`, no remote connection URI, literal loopback binding and its storage cap. The corpus, cache, logs and temporary files stay on that SSD. The runtime refuses unrelated databases and stale index revisions.

In terminal 1, from the repository root:

```sh
KB=/Volumes/MINI-M1/Codex/3dbyte-tech-store/local-knowledge/20261013
env -i PATH=/opt/homebrew/bin:/usr/bin:/bin \
  PYTHONDONTWRITEBYTECODE=1 PYTHONNOUSERSITE=1 \
  TMPDIR="$KB/tmp" LOCAL_KNOWLEDGE_WORKSPACE="$KB" \
  OPENBLAS_NUM_THREADS=1 VECLIB_MAXIMUM_THREADS=1 \
  python3 -B scripts/local-knowledge/api_server.py
```

In terminal 2, from `apps/storefront-v3`:

```sh
KB=/Volumes/MINI-M1/Codex/3dbyte-tech-store/local-knowledge/20261013
NODE_DIR=/Volumes/MINI-M1/Codex/3dbyte-tech-store/tools/node22/node-v22.22.1-darwin-arm64/bin
env -i PATH="$NODE_DIR:/usr/bin:/bin" TMPDIR="$KB/tmp" \
  NODE_ENV=development NEXT_TELEMETRY_DISABLED=1 \
  AI_ASSISTANT_LOCAL_KNOWLEDGE=1 \
  AI_ASSISTANT_LOCAL_KNOWLEDGE_URL=http://127.0.0.1:8873 \
  OTEL_ENABLED=false LANGFUSE_ENABLED=false \
  node node_modules/next/dist/bin/next dev --webpack -H 127.0.0.1 -p 3005
```

Preview services on ports 8873 and 3005 are stopped at the current milestone. Use the offline checks in `V1-COVERAGE-PLAN.md`; starting a preview again requires renewed authorization. Do not stop unrelated processes or start duplicate listeners.

Preview an actual AI SDK response:

```sh
curl --no-buffer http://127.0.0.1:3005/api/ai-shopping-assistant \
  -H 'Content-Type: application/json' \
  --data '{"messages":[{"role":"user","parts":[{"type":"text","text":"What does Creality part 4007010136 contain in its manufacturer package?"}]}]}'
```

The response contains local scope metadata, the manufacturer package statement and its source link. Ask for the voltage/wattage of part `4001040056` to see unresolved fields. The existing drawer renders safe HTTPS source links under assistant text. Browser visual verification has not been performed; the API and drawer contract tests are the current preview evidence.

From the repository root, run the frozen evidence fixture against those services:

```sh
KB=/Volumes/MINI-M1/Codex/3dbyte-tech-store/local-knowledge/20261013
env -i PATH=/opt/homebrew/bin:/usr/bin:/bin \
  PYTHONDONTWRITEBYTECODE=1 PYTHONNOUSERSITE=1 \
  TMPDIR="$KB/tmp" LOCAL_KNOWLEDGE_WORKSPACE="$KB" \
  OPENBLAS_NUM_THREADS=1 VECLIB_MAXIMUM_THREADS=1 \
  python3 -B scripts/local-knowledge/evaluate_evidence.py --report fresh-local-run.json
```

Choose a new report basename: prior results are not overwritten. After authorized corpus changes, refresh the index with the same environment and `python3 -B scripts/local-knowledge/retrieval.py --train`.

## Evidence and limitations

`evaluation/heldout-v1.json` was frozen before its first execution. Its hash pins eight previously unused questions and expected claim revisions, source versions and excerpt hashes. First pass: **4/8**. After fixing part focus and persisted unknown handling: **8/8**. All **7** citation rejection checks passed in both runs: five unavailable historical versions plus altered character and JSON-pointer excerpts. These cases are now regressions; the second run is not independent held-out quality evidence.

At the original preview milestone, the corpus had 20 local reference groups/variants, 38 source documents, 15 guides, 249 active claims and 70 source-version observations. Claims comprise 91 supported facts, 104 explicit unknowns and 54 editorial inferences. All active evidence versions are available; five historical raw response versions are unavailable and were not reconstructed. Original approved packets remain separate. Local IDs and simulated quantities are not Medusa products or actual physical stock.

Validation: 22 adapter/focus Jest tests, 46 existing route/drawer tests, 12 Python tests, full storefront TypeScript check, configured ESLint gate and Ruff F/E9 checks. ESLint currently covers JavaScript only. No Python static type checker or browser visual check was run. Committed compact evidence receipts preserve the first pass and later regression result.

The configured ordinary cloud path defaults to DeepSeek Flash and requires provider/internal credentials; its tool set lacks knowledge retrieval. Configuration source and example names were inspected without loading or exposing credentials. Offline Torch/Transformers and MPS are available in an existing environment, but a compatible bounded local generation path has not been established. No weights were downloaded, no model daemon started and no paid calls made.

A genuine LLM evaluation still needs a pinned compatible model/runtime or specifically authorized paid execution, integration of the retrieval tool into generation, fresh unused questions, repeated trials and source-faithfulness/unsupported-claim review. Deterministic retrieval results do not measure LLM answer quality.

## Staging prerequisites

1. Parent coordinates integration with the security branch and preserves its release checks. This branch does not change or bypass those gates; Medusa upgrade remains deferred.
2. Map exact physical supplier variants to actual Medusa/Strapi identities and validate the compatible baseline. Agent local editorial events are not native approvals: native approvals currently total zero.
3. Obtain the required factual/editorial review, then build and validate the native approved corpus/read path. The local SQLite corpus and development-only bypass are not a staging import or production service.
4. Add knowledge retrieval to the production generation contract, preserve scope/unknowns, and run an independent model evaluation with specifically authorized access.
5. Verify the integrated release, deployed commit, health, approved data and browser behavior before declaring deployment complete.

The local feature defaults off and refuses production mode. No push, merge, staging write, deployment or business-data deletion has occurred.
