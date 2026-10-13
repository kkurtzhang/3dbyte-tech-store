"""Local SQLite FTS + corpus-trained latent semantic vectors. No neural model or LLM calls."""

import json, math, re
from query_constraints import (
    universal_scope_requested,
    live_commerce_requested,
    nozzle_interchangeability_requested,
    part_reference_groups,
    requested_part_fields,
)
from nozzle_conditions import nozzle_family
from retailer_reference import (
    retailer_groups,
    answer_retailer_reference,
    PREFIX as RETAILER_PREFIX,
)
from catalogue_reference import catalogue_groups, answer_catalogue_reference, PREFIX as CATALOGUE_PREFIX
from customer_coverage import answer_customer_coverage
from collections import Counter
import numpy as np
from local_store import ROOT, Store, digest, SCOPE

STOP = set(
    "the a an is are of for to and or in on with can i my does how what which it this that as by be from not only before after into when".split()
)


def tokens(text):
    normal = {
        "filaments": "filament",
        "nozzles": "nozzle",
        "dryers": "dryer",
        "socks": "sock",
        "buckles": "buckle",
        "buckling": "buckle",
    }
    return [
        normal.get(s, s)
        for s in re.findall(r"[a-z0-9]+", text.lower())
        if s not in STOP and (len(s) > 1 or s.isdigit())
    ]


class Retriever:
    def __init__(self, store):
        self.store = store
        self.model = None

    def train(self):
        rows = self.store.rows()
        df = Counter(t for row in rows for t in set(tokens(row["text"])))
        vocab = [
            t for t, n in sorted(df.items(), key=lambda x: (-x[1], x[0])) if n >= 1
        ][:4000]
        index = {t: i for i, t in enumerate(vocab)}
        idf = np.array(
            [math.log((1 + len(rows)) / (1 + df[t])) + 1 for t in vocab],
            dtype=np.float32,
        )
        matrix = np.zeros((len(rows), len(vocab)), dtype=np.float32)
        for i, row in enumerate(rows):
            for token, n in Counter(tokens(row["text"])).items():
                if token in index:
                    matrix[i, index[token]] = (1 + math.log(n)) * idf[index[token]]
        matrix /= np.maximum(np.linalg.norm(matrix, axis=1, keepdims=True), 1e-9)
        u, s, vt = np.linalg.svd(matrix, full_matrices=False)
        dims = min(64, max(2, len(rows) - 1), len(vocab))
        basis = vt[:dims]
        vectors = matrix @ basis.T
        vectors /= np.maximum(np.linalg.norm(vectors, axis=1, keepdims=True), 1e-9)
        fingerprint = digest(
            [(row["id"], row["revision"], row["text"]) for row in rows]
        )
        np.savez_compressed(
            ROOT / "cache/lsa-model.npz", basis=basis, idf=idf, vectors=vectors
        )
        meta = {
            "environment": SCOPE,
            "method": "TF-IDF + truncated SVD latent semantic analysis",
            "dimensions": dims,
            "vocabulary": vocab,
            "claim_ids": [r["id"] for r in rows],
            "corpus_fingerprint": fingerprint,
            "training_rows": len(rows),
            "neural_embeddings": False,
            "model_or_api_calls": 0,
            "numpy_version": np.__version__,
        }
        (ROOT / "cache/lsa-model.json").write_text(json.dumps(meta, indent=2) + "\n")
        self.model = None
        return {k: v for k, v in meta.items() if k not in ("claim_ids", "vocabulary")}

    def _model(self, rows):
        fingerprint = digest(
            [(row["id"], row["revision"], row["text"]) for row in rows]
        )
        meta = json.loads((ROOT / "cache/lsa-model.json").read_text())
        if meta["corpus_fingerprint"] != fingerprint:
            raise ValueError(
                "Vector index requires refresh for current record revisions"
            )
        arrays = np.load(ROOT / "cache/lsa-model.npz", allow_pickle=False)
        return meta, arrays

    def search(self, question, group_key=None, mode="hybrid", limit=8):
        if (
            not isinstance(question, str)
            or not question.strip()
            or len(question) > 500
            or mode not in ("keyword", "vector", "hybrid")
            or not 1 <= limit <= 20
        ):
            raise ValueError("Invalid bounded local query")
        rows = self.store.rows()
        scoped_retailers = retailer_groups(
            question, [json.loads(row["payload"]) for row in rows]
        )
        if not group_key and len(scoped_retailers) == 1:
            group_key = scoped_retailers[0]
        direct_catalogue = catalogue_groups(question, self.store)
        if not group_key and len(direct_catalogue) == 1:
            group_key = direct_catalogue[0]
        by_id = {r["id"]: r for r in rows}
        expanded = question
        if re.search(r"\b(squishy|rubbery|bendy)\b", question, re.I):
            expanded += " flexible elastic filament"
        if re.search(r"(extruder|feeder|feed path)", question, re.I) and re.search(
            r"(fold|buckl)", question, re.I
        ):
            expanded += " filament buckle feed path feeder"
        if re.search(
            r"\b(print|prints|printed|wall|walls|layer|layers)\b", question, re.I
        ) and re.search(r"\b(gap|gaps|missing|sparse)\b", question, re.I):
            expanded += " under extrusion missing print layers"
        if (
            "under extrusion missing print layers" not in expanded
            and re.search(r"\b(gaps|missing|sparse)\b", question, re.I)
            and re.search(r"\b(nozzle|feeder|extruder|extrusion)\b", question, re.I)
        ):
            expanded += " under extrusion missing print layers"
        query = tokens(expanded)
        allowed = {
            r["id"]
            for r in rows
            if (
                not (json.loads(r["payload"]).get("group_key") or "").startswith(
                    (RETAILER_PREFIX, CATALOGUE_PREFIX)
                )
                or json.loads(r["payload"]).get("group_key") == group_key
            )
            and (
                json.loads(r["payload"]).get("group_key") == group_key
                if group_key and group_key.startswith((RETAILER_PREFIX, CATALOGUE_PREFIX))
                else not group_key
                or json.loads(r["payload"]).get("group_key") in (group_key, None)
            )
        }
        fts = " OR ".join('"' + s + '"' for s in dict.fromkeys(query))
        lexical = []
        if fts:
            lexical = [
                r["claim_id"]
                for r in self.store.db.execute(
                    "SELECT claim_id,bm25(claim_fts) AS rank FROM claim_fts WHERE claim_fts MATCH ? ORDER BY rank LIMIT 100",
                    (fts,),
                )
                if r["claim_id"] in allowed
            ]
        vectors = []
        if mode != "keyword":
            meta, arr = self._model(rows)
            vocab = {t: i for i, t in enumerate(meta["vocabulary"])}
            q = np.zeros(len(vocab), dtype=np.float32)
            for word, n in Counter(query).items():
                if word in vocab:
                    q[vocab[word]] = (1 + math.log(n)) * arr["idf"][vocab[word]]
            q = q @ arr["basis"].T
            length = np.linalg.norm(q)
            if length > 0:
                scores = arr["vectors"] @ (q / length)
                vectors = [
                    meta["claim_ids"][i]
                    for i in np.argsort(-scores)
                    if meta["claim_ids"][i] in allowed and scores[i] > 0.08
                ][:100]
        ranking = {}
        for ids in (
            [lexical]
            if mode == "keyword"
            else [vectors]
            if mode == "vector"
            else [lexical, vectors]
        ):
            for rank, key in enumerate(ids):
                ranking[key] = ranking.get(key, 0) + 1 / (30 + rank)
        selected_family = nozzle_family(question)

        def condition_matches(key):
            conditions = json.loads(by_id[key]["payload"]).get("scope_conditions", {})
            family = conditions.get("nozzle_family")
            return selected_family is not None and family == selected_family

        def condition_allows(key):
            family = (
                json.loads(by_id[key]["payload"])
                .get("scope_conditions", {})
                .get("nozzle_family")
            )
            return not selected_family or not family or family == selected_family

        ordered = sorted(
            (key for key in ranking if condition_allows(key)),
            key=lambda key: (not condition_matches(key), -ranking[key], key),
        )
        hits = []
        for key in ordered:
            row = by_id[key]
            payload = json.loads(row["payload"])
            if payload["record_revision"] != row["revision"]:
                continue
            citations = [self.store.cite(c) for c in payload["citations"]]
            if payload["status"] != "unknown" and (not citations or not all(citations)):
                continue
            hits.append(
                {
                    "claim_id": key,
                    **payload,
                    "citations": citations,
                    "score": round(ranking[key], 6),
                }
            )
            if len(hits) == limit:
                break
        return {
            "environment": SCOPE,
            "method": mode,
            "question": question,
            "hits": hits,
            "model_calls": 0,
            "neural_embeddings": False,
            "latent_vector_search": mode != "keyword",
            "staging_native_eligible": False,
            "query_expansion": expanded if expanded != question else None,
        }

    def answer(self, question, group_key=None, mode="hybrid"):
        q = question.lower()
        aliases = {
            "five_E03": r"tpu95.?hf",
            "five_E04": r"pa6.?cf20|polymide pa6.?cf",
            "five_E08": r"supergrip",
            "five_E09": r"plastic repellent paint|\bprp\b",
            "five_E10": r"v6.*sock|sock.*v6",
        }
        matches = [g for g, p in aliases.items() if re.search(p, q)]
        if not group_key and len(matches) == 1:
            group_key = matches[0]
        persisted_claims = [json.loads(row["payload"]) for row in self.store.rows()]
        scoped_retailers = retailer_groups(question, persisted_claims)
        if len(scoped_retailers) == 1:
            group_key = scoped_retailers[0]
        scoped_catalogue = catalogue_groups(question, self.store)
        if not group_key and len(scoped_catalogue) == 1:
            group_key = scoped_catalogue[0]
        part_groups = part_reference_groups(question, persisted_claims)
        if not group_key and len(part_groups) == 1:
            group_key = part_groups[0]
        result = self.search(question, group_key, mode)
        result.update(
            answer=None,
            status="evidence_only",
            answer_generation="deterministic source-grounded context assembly, no LLM",
            group_key=group_key,
        )
        result["generation_contract"] = {
            "citations_required": True,
            "unresolved_fields_must_remain_unknown": True,
            "source_scope_must_be_preserved": True,
            "staging_native_approval_claim_allowed": False,
            "llm_calls_authorized": False,
        }
        result["context_pack"] = [
            {
                "claim_id": h["claim_id"],
                "statement": h["text"],
                "value": h["value"],
                "status": h["status"],
                "record_id": h["record_id"],
                "record_revision": h["record_revision"],
                "citations": h["citations"],
                "environment": SCOPE,
                "local_product_id": h.get("local_product_id"),
                "local_variant_id": h.get("local_variant_id"),
                "source_scope": h.get("source_scope"),
                "explicit_unknowns": h.get("explicit_unknowns", {}),
                "editorial_basis": h.get("editorial_basis"),
                "scope_conditions": h.get("scope_conditions", {}),
            }
            for h in result["hits"][:5]
        ]
        result["unresolved_group_fields"] = [
            {
                "record_id": p["record_id"],
                "field": p["field"],
                "value": None,
                "status": "unknown",
            }
            for row in self.store.rows()
            if (p := json.loads(row["payload"])).get("group_key") == group_key
            and group_key is not None
            and p["status"] == "unknown"
        ]
        if len(scoped_catalogue) > 1 and not group_key:
            return {**result, "status": "unknown", "reason": "ambiguous_catalogue_references",
                    "unknown_fields": ["conversation_subject"], "context_pack": [],
                    "answer": "Name one exact product reference before asking for scoped package facts."}
        if group_key and group_key.startswith(CATALOGUE_PREFIX) and scoped_catalogue and group_key not in scoped_catalogue:
            return {**result, "status": "unknown", "reason": "catalogue_reference_scope_mismatch",
                    "unknown_fields": ["reference_identity"], "context_pack": [],
                    "answer": "The selected reference does not match the product named in the question."}
        catalogue_reply = answer_catalogue_reference(self.store, question, group_key, result)
        if catalogue_reply is not None:
            return catalogue_reply
        retailer_reply = answer_retailer_reference(
            self.store, question, group_key, result
        )
        if retailer_reply is not None:
            return retailer_reply
        coverage_reply = answer_customer_coverage(self.store, question, group_key, result)
        if coverage_reply is not None:
            return coverage_reply
        if live_commerce_requested(q):
            return {
                **result,
                "status": "unknown",
                "reason": "commerce_not_verified",
                "unknown_fields": [
                    "store_sale_price",
                    "physical_stock",
                    "delivery_estimate",
                ],
                "answer": "Current store price, physical stock and delivery timing are not verified by this local reference corpus. Simulated quantities or reference records cannot supply live commerce facts.",
            }
        requested_fields = requested_part_fields(q) if part_groups else []
        unresolved = sorted(
            {
                claim["field"]
                for claim in persisted_claims
                if claim.get("group_key") == group_key
                and claim["field"] in requested_fields
                and claim["status"] == "unknown"
                and claim["value"] is None
            }
        )
        if unresolved:
            return {
                **result,
                "status": "unknown",
                "reason": "part_reference_values_unresolved",
                "unknown_fields": unresolved,
                "answer": "The named part's captured source scope does not verify the requested specification or cross-version fit. Keep these fields unknown: "
                + ", ".join(unresolved)
                + ". A material description or retailer model label does not establish electrical ratings or revision compatibility.",
            }
        if nozzle_interchangeability_requested(q):
            return {
                **result,
                "status": "unknown",
                "reason": "exact_nozzle_interface_unverified",
                "unknown_fields": [
                    "universal_nozzle_interchangeability",
                    "exact_nozzle_hotend_variant_fitment",
                ],
                "answer": "Universal nozzle interchangeability is not established. Name the nozzle family, heater block and exact hotend version; hardened steel alone does not establish the interface or fit.",
            }
        selected_family = nozzle_family(question)
        requested_temperature = re.search(r"(\d{2,3})\s*°?\s*c\b", q)
        if selected_family and requested_temperature:
            for row in self.store.rows():
                claim = json.loads(row["payload"])
                conditions = claim.get("scope_conditions", {})
                if (
                    conditions.get("nozzle_family") != selected_family
                    or "general_max_temperature_c" not in conditions
                ):
                    continue
                abrasive = "abrasi" in q and "abrasive_exclusion_above_c" in conditions
                limit_c = (
                    conditions["abrasive_exclusion_above_c"]
                    if abrasive
                    else conditions["general_max_temperature_c"]
                )
                if int(requested_temperature.group(1)) > limit_c:
                    proof = [
                        self.store.cite(citation) for citation in claim["citations"]
                    ]
                    if not proof or not all(proof):
                        return {
                            **result,
                            "status": "unknown",
                            "reason": "rating_source_invalid",
                        }
                    description = (
                        "abrasive-filament exclusion above "
                        if abrasive
                        else "maximum rating of "
                    )
                    return {
                        **result,
                        "status": "limited",
                        "reason": "above_named_nozzle_condition",
                        "answer": "For "
                        + claim["source_scope"]
                        + ", the captured source gives an "
                        + description
                        + str(limit_c)
                        + "°C. The requested higher-temperature use is not established. This does not rate the entire hotend or other nozzle families.",
                        "rating_citations": proof,
                    }
        if (
            ("tpu95" in q and "hf" not in q)
            or (group_key == "five_E09" and re.search(r"45\s?ml", q))
            or (group_key == "five_E08" and re.search(r"250\s?ml", q))
        ):
            return {
                **result,
                "status": "unknown",
                "reason": "wrong_or_unselected_source_variant",
                "answer": "This corpus binds a different named material/package; the requested variant is not established.",
            }
        if re.search(r"\b(au|australian)\s+(plug|adapter|variant)\b", q) and any(
            t in q for t in ("s4", "polydryer")
        ):
            return {
                **result,
                "status": "unknown",
                "reason": "regional_variant_unbound",
                "answer": "The exact regional plug/package is not bound by the generic manufacturer sources.",
            }
        if re.search(r"\basa\b", q) and re.search(
            r"flame|fire|certif|ul.?94|electrical enclosure", q
        ):
            record = self.store.db.execute(
                "SELECT payload FROM records WHERE record_key='N06' AND active=1"
            ).fetchone()
            gaps = json.loads(record[0]).get("explicit_unknowns", {}) if record else {}
            fields = [
                field
                for field in (
                    "fire_classification",
                    "electrical_enclosure_certification",
                )
                if field in gaps and gaps[field] is None
            ]
            if fields:
                return {
                    **result,
                    "status": "unknown",
                    "reason": "grade_certification_unverified",
                    "unknown_fields": fields,
                    "answer": "The captured ASA material-family guidance does not establish a flame classification or electrical-enclosure certification for the unspecified grade. Keep those fields unknown.",
                }
        if group_key == "five_E09":
            requested = re.search(r"(\d{3})\s*°?\s*c\b", q)
            rating = next(
                (
                    json.loads(row["payload"])
                    for row in self.store.rows()
                    if json.loads(row["payload"]).get("group_key") == group_key
                    and json.loads(row["payload"])["field"] == "temperature_rating_c"
                ),
                None,
            )
            if (
                requested
                and rating
                and int(requested.group(1))
                > int(re.search(r"\d+", rating["value"]).group())
            ):
                proof = [self.store.cite(c) for c in rating["citations"]]
                if not all(proof):
                    return {
                        **result,
                        "status": "unknown",
                        "reason": "rating_source_invalid",
                    }
                return {
                    **result,
                    "status": "limited",
                    "reason": "above_captured_coating_rating",
                    "answer": "The captured PRP coating rating is "
                    + rating["value"]
                    + ". Use at the requested higher temperature is not established.",
                    "rating_citations": proof,
                }
        if any(
            t in q
            for t in (
                "in stock",
                "physical stock",
                "our price",
                "sale price",
                "available to buy",
            )
        ):
            return {
                **result,
                "status": "unknown",
                "reason": "commerce_not_verified",
                "answer": "Physical availability and store sale price are unknown.",
            }
        # Null constraints are read from the persisted local claims, not an old parameterized fixture.
        fields = []
        if group_key == "five_E03":
            if "dry" in q:
                fields = ["drying_temperature_c", "drying_duration_hours"]
            elif "hardness" in q or "shore" in q:
                fields = ["shore_hardness_a"]
            elif "ams" in q:
                fields = ["ams_compatibility"]
            elif "bed" in q:
                fields = ["bed_temperature_c"]
            elif "nozzle temperature" in q:
                fields = ["nozzle_temperature_c"]
        elif group_key == "five_E04":
            if "bed" in q:
                fields = ["bed_temperature_c"]
            elif "speed" in q:
                fields = ["printing_speed_mm_s"]
            elif "esd" in q:
                fields = ["esd_safe"]
        elif group_key == "five_E10":
            if universal_scope_requested(q, "hotend") or any(
                t in q
                for t in (
                    "revo",
                    "volcano",
                    "bambu",
                    "universal",
                    "every hotend",
                    "creality",
                    " k1",
                    " k2",
                    "ender",
                )
            ):
                fields = ["universal_hotend_compatibility"]
            elif "temperature" in q or "300" in q:
                fields = ["maximum_temperature_c"]
            elif "gtin" in q or "barcode" in q:
                fields = ["gtin"]
        elif group_key == "five_E08":
            if universal_scope_requested(q, "surface"):
                fields = ["universal_build_surface_compatibility"]
            if "count" in q:
                fields.append("application_count")
        elif group_key == "five_E09" and any(
            t in q for t in ("unclog", "inside", "internal")
        ):
            fields = ["internal_unclogging"]
        unknown = []
        for row in self.store.rows():
            p = json.loads(row["payload"])
            if (
                p.get("group_key") == group_key
                and p["field"] in fields
                and p["status"] == "unknown"
            ):
                unknown.append(p["field"])
        if unknown:
            return {
                **result,
                "status": "unknown",
                "reason": "canonical_values_unresolved",
                "unknown_fields": sorted(set(unknown)),
                "answer": "The requested canonical value or compatibility is unresolved in the source-backed local corpus. Keep it unknown.",
            }
        supported = [h for h in result["hits"] if h["status"] != "unknown"]
        if supported:
            result["status"] = "source_grounded_context"
            result["answer"] = "\n".join(h["text"] for h in supported[:3])
        else:
            result.update(status="unknown", reason="no_verified_evidence")
        return result


def main():
    import argparse

    p = argparse.ArgumentParser()
    p.add_argument("question", nargs="?")
    p.add_argument("--train", action="store_true")
    p.add_argument("--mode", default="hybrid")
    p.add_argument("--group")
    a = p.parse_args()
    store = Store()
    r = Retriever(store)
    try:
        print(
            json.dumps(
                r.train() if a.train else r.answer(a.question, a.group, a.mode),
                indent=2,
                ensure_ascii=False,
            )
        )
    finally:
        store.close()


if __name__ == "__main__":
    main()
