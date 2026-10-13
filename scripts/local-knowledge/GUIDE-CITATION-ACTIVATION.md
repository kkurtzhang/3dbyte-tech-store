# Local guide citation activation

This milestone continues `20ecb975e6e21c15b330ff25385f1abc3bf7ad6b` on `fix/knowledge-guide-citations-20261013`. The seven previously prepared citation repair sets are now **active in the local SQLite corpus**. All 29 existing guides have new revisions and real `accepted_for_local_development` events by `codex_local_guide_citation_review`. These are agent reviews within the authorized local workflow; no user factual approval or native approval is claimed.

[The receipt](evaluation/guide-citation-activation-receipt-v1.json) records all 29 old/new revision hashes, actual event IDs/timestamps, seven new source versions, preserved artifacts and verification. The full statement audit and database snapshots stay on the external SSD. Earlier milestone receipts remain historical records of their own completed work.

## Activated changes

The review covered all **75 positive statements across 29 guides**. Thirty citation edit sets affect 18 guides; all 29 guides now explicitly identify original store guidance and keep separate selection/navigation commentary. Technical facts remain citation-dependent even when their claim status is `editorial_inference`. No unsupported factual assertion was exempted as commentary. The statement audit records every current positive statement and its validated evidence; citation byte integrity alone is not a semantic-entailment score.

| Repair | Active evidence and retained boundary |
| --- | --- |
| G02 boards | Exact 37 × 12 × 1.6 mm excerpt and the supplier's named board listings; no broader fit guarantee. |
| G02 short cable | Exact `3103110752`, `3103110894` and `4006030075` aliases; package and hardware conditions remain. |
| G03 Weller | Captured `WES50/51` wording; no fabricated standalone `WES51` source excerpt. |
| N15 sheets | Scratch-resistance notices for the named satin/textured sheets, alongside the existing care restrictions. |
| Panchroma | Complete conditional 55°C / 6-hour drying wording, including the moisture condition. |
| G04 selector | Eight exact manufacturer/retailer SKU–diameter pairs represented as new linked normalized text. Archived raw-pair proofs remain available. Captured AUD29.95/AUD95.95 observations remain dated external prices. |
| G04 resistance | Diagram's 350°C resistance headline is cited separately from the captured 300°C text. Maximum operating temperature remains unknown. |

The wider audit adds missing excerpts for composite-material properties, flexible feeding, coating heat cure, stringing and first-layer context; it also includes the existing scoped source facts behind catalogue selection guidance. The only factual-prose edit is the spacing correction `roughly90%` → `roughly 90%`. Product, grade, version, package, measurement and other conditions are otherwise unchanged, as are all explicit unknowns.

Three derived source versions preserve their original raw hashes and capture dates: retailer selector, manufacturer selector and diagram transcription. New public captures add one manufacturer product page and two supplier pages. One supplier capture needs a separate LF-normalized text version; the original captured bytes are preserved. This creates **seven source versions**, taking the total from 110 to **117**. Derived-at timestamps are separate from original capture times. The diagram retains its image origin and native hold.

`Store.ingest` retains the former exact guide payloads and claims. Replaying the original frozen guide seed skips a verified superseding citation repair, preventing silent rollback. The frozen-v1 verifier permits only a scope-preserving local guide revision with retained baseline evidence and an actual matching local review event. It still rejects unrelated factual or condition changes. The native source and release gates are unchanged.

## Equivalent evidence remains preparation

The bounded search covers the nine held source-form fields. It found **two exact official field matches** on the captured [Creality K2 Plus heating-block product page](https://mvip.creality.com/en/goods/goodsDetail/2309): part `4001030145` and the named K2 Plus model. Electrical, package and wider-model unknowns remain unresolved.

Six further field matches are supplier-origin corroborations, including already captured listings. They are **not six independent sources**; upstream independence has not been established. Existing module, adapter and circuit-board identifiers retain supplier attribution. [Makerlab's pad listing](https://makerlab.ph/products/creality-nozzle-wiper-adhesive-tape-for-k2-plus-4004010278) separates part `4004010278` from seller SKU `MLE06901`. The supplier's K2 Pro naming stays a family-listing statement. [FirstShop's adapter description](https://www.firstshop.co.za/products/creality-k2-k2-pro-k2-plus-hotend-adapter-board-4004010288-406732) reports **approximately** 37 × 12 × 1.6 mm; it is not an exact received measurement or manufacturer-certified tolerance.

No complete allowed text equivalent was found for the diagram's full component/material assignments including SKD11 grade. Partial material wording or a temperature headline does not substitute for that claim. All **nine original source-form holds remain on their original evidence**. No support article or image was relabelled as a sales page/manual, and no manufacturer assertion was rewritten as a supplier assertion. The exact/qualified matches are prepared evidence for a future source-specific projection; they are not active new source-document claims or native approvals.

The earlier four combined-claim reconciliation and its 65-fragment / 162-fact preparation are preserved. The refreshed ordinary import-readiness builder still produces its separate 64-fragment / 155-fact plan and verifies the 29 guide supersessions. These counts describe different prepared artifacts; the newer ordinary plan does not replace the richer prior reconciliation artifact.

## Preservation and verification

The final corpus has **33 references/variants, 80 records, 51 source documents, 29 guides and 469 active claims**. All 33 product rows, 33 variant rows and 61 bindings are unchanged. All 51 source-document rows, 110 prior source rows, 139 prior review events, 59 prior revision rows and 756 prior claim payloads are retained unchanged. Prior guide claims are now inactive history. All 29 former guide revisions are preserved verbatim. Current local review events total **168**, and native approvals total **zero**.

The preservation check verified all 105 available historical raw versions and 110 historical text files. Five previously unavailable historical raw versions remain explicitly unavailable; none was reconstructed. Frozen v1 and prior reconciliation artifact hashes still match. The new final backup is `exports/guide-citation-final-local-snapshot-v1.sqlite3`, SHA-256 `f70dfb47695b554e11ac13e7b47ab773b86b25441c813d71e085e6560dd685c1`.

Validation against the repaired guides:

- **77 Python tests**, including nine activation/equivalence regressions.
- **82 Jest tests in eight suites** through the offline route/drawer path.
- **30/30** deterministic customer coverage cases using fresh route streams.
- **64** native pure-contract fixtures, with 155 facts and 33 primary reference documents; no native writes.
- Ruff F/E9 and formatting checks, preservation comparison and current retrieval fingerprint verification.
- Ports **3005 and 8873 have no listeners**; previews remain off.

The initial regression run detected a stale retrieval fingerprint after the actual revisions. The local TF-IDF/SVD index was refreshed and activation now refreshes it after changes. The final index covers 469 rows and matches fingerprint `4adc05e96d7465e0596e69770d455b2a6a9735529030829e31ae485599bf8a12`. A later test incorrectly assumed both supplier captures needed newline normalization; the test now derives that expectation from captured bytes. Earlier failing logs remain preserved beside the passing result.

No TypeScript runtime or dependency changed. Prior source/test type checks remain applicable; the separate canonical generated React 18/19 type mismatch remains parent-owned. No fresh full TypeScript compile, browser visual check, native API call or LLM quality evaluation is claimed.

## Reproduce and continue

Use the cleared Python/SSD environment in [IMPORT-READINESS.md](IMPORT-READINESS.md), with this checkout's `scripts/local-knowledge` modules. The preparation helpers require the preserved capture manifests and baseline snapshot on this Mac. New report basenames are mandatory; previous reports and backups are never overwritten.

```sh
python3 -B scripts/local-knowledge/activate_guide_citations.py --report fresh-guide-activation.json
python3 -B scripts/local-knowledge/prepare_guide_equivalents.py --report fresh-guide-equivalents.json
python3 -B -m unittest discover -s scripts/local-knowledge -p 'test_*.py'
```

Activation replay skips the 29 current guide revisions without creating duplicate reviews. All new artifacts, cache, temporary files and logs stay on the external SSD. The equivalent-evidence report can support further bounded local preparation with honest source attribution. Native progress still needs actual target/bindings, a real canonical review, specific action authorization and the parent's release gates. Those release prerequisites do not prevent broader authorized local knowledge work.

No service was started, and no staging/shared database write, native mutation, source-policy relaxation, credential/access expansion, dependency change, model call, push, deployment or merge occurred. 3D Sets build guides and FAQs remain official links only.
