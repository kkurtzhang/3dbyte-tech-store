"""Read-only follow-up preparation: real local review, native shapes and separate blockers."""

import argparse
import copy
import hashlib
import json
from collections import Counter, defaultdict
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urljoin
from local_store import ROOT, Store
from prepare_v1_import_manifest import build_manifest, source_kind

REPO = Path(__file__).resolve().parents[2]
AGENT = "codex_local_import_readiness"
OFFICIAL_PRODUCT_URLS = {
    "https://buildtak.com/products/buildtak-pei-3d-printing-surface",
    "https://buildtak.com/products/buildtak-spatula",
    "https://fiberlogy.com/en/product/pp-filament/",
    "https://magigoo.com/products/magigoo-pp/",
    "https://magigoo.com/products/magigoo-supergrip-test",
    "https://magigoo.com/products/magigoo-supergrip-test.js",
    "https://www.orbiterprojects.com/orbiter-v2-5/",
    "https://mvip.creality.com/en/goods/goodsDetail/1945",
    "https://mvip.creality.com/en/goods/goodsDetail/2185",
    "https://mvip.creality.com/en/goods/goodsDetail/2427",
}
CDN_TDS = "https://cdn.shopify.com/s/files/1/0548/7299/7945/files/PolyFlex_TPU95_HF_TDS_EN_V5.4.pdf"
ORIGIN_ID = "local_source_new_tpu_0b40819ee2bb"


class Links(HTMLParser):
    def __init__(self):
        super().__init__()
        self.hrefs = []

    def handle_starttag(self, tag, attrs):
        if tag == "a":
            self.hrefs.extend(v for k, v in attrs if k == "href" and v)


def origin_link_verified(store, target):
    row = store.db.execute(
        "SELECT payload FROM sources WHERE id=?", (ORIGIN_ID,)
    ).fetchone()
    if not row:
        return False
    source = json.loads(row[0])
    path = Path(source["raw_path"])
    if not path.is_file():
        return False
    raw = path.read_bytes()
    if hashlib.sha256(raw).hexdigest() != source["sha256"]:
        return False
    links = Links()
    links.feed(raw.decode("utf-8"))
    return any(urljoin(source["source_url"], href) == target for href in links.hrefs)


def reviewed_source_kind(source, store):
    url = source["source_url"]
    if url in OFFICIAL_PRODUCT_URLS:
        return "official_product_page"
    if url == CDN_TDS and origin_link_verified(store, url):
        return "official_datasheet"
    return source_kind(source)


def strapi_record(body):
    return {
        "documentId": body["document_id"],
        "medusa_product_id": body["product_id"],
        "product_handle": body["product_handle"],
        "product_title": body["product_title"],
        "title": body["document_title"],
        "document_type": {
            "official_datasheet": "datasheet",
            "official_safety_sheet": "safety_sheet",
            "official_manual": "manual",
        }.get(body["source_kind"], "other"),
        "source_url": body["source_url"],
        "source_kind": body["source_kind"],
        "source_label": "Captured single-source reference facts",
        "source_checked_at": body["source_checked_at"],
        "version": body["source_version"],
        "language": "en",
        "search_keywords": [],
        "is_public": False,
        "publishedAt": None,
        "knowledge_content": {
            k: body[k]
            for k in ["version", "variant_id", "source_sha256", "text", "facts"]
        },
        "knowledge_review": {
            "status": "pending",
            "document_id": None,
            "product_id": None,
            "variant_id": None,
            "revision_hash": None,
            "reviewed_at": None,
            "valid_until": None,
            "reviewer": None,
        },
    }


def primary_rank(candidate):
    body = candidate["native_template"]
    substantive = sum(
        f["value"] is not None and f["field"] != "aud_reference_observation"
        for f in body["facts"]
    )
    kind_rank = {
        "official_datasheet": 3,
        "official_product_page": 2,
        "supplier_product_page": 1,
    }.get(body["source_kind"], 0)
    return (
        substantive > 0,
        kind_rank,
        substantive,
        body["source_checked_at"],
        candidate["candidate_key"],
    )


def source_review(store, candidate):
    row = store.db.execute(
        "SELECT * FROM editorial_decisions WHERE record_id=? AND revision=? AND decision='accepted_for_local_development' ORDER BY id DESC LIMIT 1",
        (candidate["local_record_id"], candidate["local_record_revision"]),
    ).fetchone()
    if not row:
        raise ValueError("A real current local source-review event is required")
    return {
        "state": "accepted_for_local_development",
        "existing_local_event": {
            k: row[k]
            for k in ["id", "actor", "scope", "decision", "decided_at", "revision"]
        },
        "factual_basis_preserved": candidate["factual_review_basis_preserved"],
        "preparation_actor": AGENT,
        "new_user_approval_claimed": False,
        "native_review_event": False,
        "native_canonical_review": "pending until actual native IDs and final canonical revision exist",
        "all_declared_unknown_facts_required_to_be_resolved": False,
    }


def frozen_v1_evidence(store):
    receipt = json.loads(
        (
            REPO / "scripts/local-knowledge/evaluation/v1-coverage-receipt-v1.json"
        ).read_text()
    )
    evidence = {
        "database_snapshot": receipt["final_local_snapshot"],
        "import_manifest": {
            "path": receipt["staged_import_preparation"]["manifest"],
            "sha256": receipt["staged_import_preparation"]["sha256"],
        },
    }
    for item in evidence.values():
        path = Path(item["path"])
        if hashlib.sha256(path.read_bytes()).hexdigest() != item["sha256"]:
            raise ValueError("Frozen v1 artifact changed; do not replace it")
    original = json.loads(Path(evidence["import_manifest"]["path"]).read_text())
    actual = dict(
        store.db.execute("SELECT record_key,revision FROM records WHERE active=1")
    )
    if actual != {
        r["record_key"]: r["local_revision"] for r in original["record_inventory"]
    }:
        raise ValueError("Active record revisions differ from the frozen v1 scope")
    return evidence


def build_readiness(store):
    manifest = build_manifest(store, lambda source: reviewed_source_kind(source, store))
    frozen = frozen_v1_evidence(store)
    for inventory in manifest["record_inventory"]:
        if inventory["kind"] == "source_document":
            continue
        record = json.loads(
            store.db.execute(
                "SELECT payload FROM records WHERE record_key=?",
                (inventory["record_key"],),
            ).fetchone()[0]
        )
        held_fields = {h.get("field") for h in inventory["held_fields"]}
        for claim in record["claims"]:
            if claim["status"] == "supported" and claim["field"] not in held_fields:
                inventory["held_fields"].append(
                    {
                        "field": claim["field"],
                        "reason": "guide_has_no_exact_product_binding; equivalent_material_TDS_facts_are_prepared_separately",
                    }
                )
    candidates = manifest["single_source_candidate_fragments"]
    grouped = defaultdict(list)
    for candidate in candidates:
        group = candidate["local_group_key"]
        if not group:
            raise ValueError("A product reference scope is required")
        body = candidate["native_template"]
        candidate["source_review"] = source_review(store, candidate)
        digest = hashlib.sha256(group.encode()).hexdigest()[:20]
        fixture = copy.deepcopy(candidate["structure_fixture_only"])
        fixture.update(
            product_id="local_dev_fixture_product_" + digest,
            variant_id="local_dev_fixture_variant_" + digest,
            product_handle="local-fixture-" + digest,
        )
        candidate["structure_fixture_only"] = fixture
        candidate["strapi_record_template"] = strapi_record(body)
        candidate["strapi_create_data_template"] = {
            k: v
            for k, v in candidate["strapi_record_template"].items()
            if k not in {"documentId", "publishedAt"}
        }
        core_fields = [
            "medusa_product_id",
            "product_title",
            "product_handle",
            "title",
            "document_type",
            "source_url",
            "source_kind",
            "source_label",
            "source_checked_at",
            "search_keywords",
            "is_public",
        ]
        candidate["strapi_core_draft_data_template"] = {
            k: candidate["strapi_record_template"][k] for k in core_fields
        }
        candidate["strapi_admin_private_fields_after_native_binding"] = {
            k: candidate["strapi_record_template"][k]
            for k in ["version", "language", "knowledge_content", "knowledge_review"]
        }
        candidate["strapi_structure_fixture_only"] = strapi_record(fixture)
        candidate["source_kind_classification"] = (
            "bounded existing manufacturer/supplier URL and archived bytes checked offline; final native review pending"
        )
        if body["source_url"] == CDN_TDS:
            row = store.db.execute(
                "SELECT payload FROM sources WHERE id=?", (ORIGIN_ID,)
            ).fetchone()
            origin = json.loads(row[0])
            candidate["source_kind_origin_proof"] = {
                k: origin[k] for k in ["id", "source_url", "sha256", "raw_path"]
            }
        candidate["selected_for_reference_card"] = False
        grouped[group].append(candidate)
    for shell in manifest["reference_shell_plans"]:
        group = shell["local_group_key"]
        alternatives = sorted(grouped[group], key=primary_rank, reverse=True)
        if not alternatives:
            raise ValueError(
                "Each reference shell requires at least one supported candidate"
            )
        primary = alternatives[0]
        primary["selected_for_reference_card"] = True
        shell["primary_candidate_key"] = primary["candidate_key"]
        shell["alternative_candidate_keys"] = [
            c["candidate_key"] for c in alternatives[1:]
        ]
        shell["primary_selection_basis"] = (
            "single-source partial reference; prefer substantive official facts, then stable source rank; alternatives remain private and do not overwrite the binding"
        )
        shell["medusa_create_data_template"] = {
            "title": primary["native_template"]["product_title"],
            "handle": "kb-ref-" + group.lower().replace("_", "-"),
            "status": "draft",
            "options": [{"title": "Reference", "values": ["Default"]}],
            "variants": [
                {
                    "title": "Reference",
                    "options": {"Reference": "Default"},
                    "manage_inventory": False,
                    "allow_backorder": False,
                    "prices": [],
                }
            ],
            "metadata": {"catalogue_role": "knowledge_reference"},
        }
        shell["native_identity_resolution"] = (
            "read exact identity/handle matches first; reuse only a unique eligible draft; otherwise authorized createProductsWorkflow/Admin create; read back generated product/variant IDs"
        )
        shell["simulation_after_binding_only"] = {
            "version": 1,
            "scope": "staging",
            "real_stock": False,
            "product_id": None,
            "variant_id": None,
            "initial_quantity": 1,
        }
    held = Counter(
        h["reason"] for r in manifest["record_inventory"] for h in r["held_fields"]
    )
    facts = [f for c in candidates for f in c["native_template"]["facts"]]
    manifest.update(
        schema_version=2,
        preparation_actor=AGENT,
        v1_snapshot_preserved=True,
        frozen_v1_evidence=frozen,
        offline_structural_candidate_count=len(candidates),
        supported_fact_count=sum(f["value"] is not None for f in facts),
        primary_reference_document_count=len(grouped),
        held_field_reason_counts=dict(held),
        new_native_review_events=0,
        local_source_review_event_count=len(
            {c["source_review"]["existing_local_event"]["id"] for c in candidates}
        ),
        blocker_matrix=[
            {
                "category": "native_identity",
                "state": "absent",
                "affected_fragments": len(candidates),
                "affected_shells": len(grouped),
                "offline_resolution": "group-consistent templates and one primary per shell prepared",
                "remaining": "actual Medusa product/variant and Strapi documentId readbacks; final handle/title",
            },
            {
                "category": "review",
                "state": "local source review established; final native revision review pending",
                "affected_fragments": len(candidates),
                "offline_resolution": "real local review event IDs/actors/revisions retained; source bytes/excerpts reverified",
                "remaining": "authorized reviewer event under honest actor identity after final native canonical binding; no forced re-review of unknowns",
            },
            {
                "category": "unsupported_or_unresolved_facts",
                "state": "field scoped; not a whole-product blocker",
                "source_kind_held": held.get(
                    "source_kind_not_classified_under_existing_native_allowlist", 0
                ),
                "source_supported_unbound_guide_facts": held.get(
                    "guide_has_no_exact_product_binding; equivalent_material_TDS_facts_are_prepared_separately",
                    0,
                ),
                "multi_source_held": held.get(
                    "multi_source_claim_requires_single_source_native_curation", 0
                ),
                "editorial_held": held.get(
                    "editorial_synthesis_requires_separate_native_curation", 0
                ),
                "offline_resolution": "supported single-source facts retained; unknowns remain null; no new facts or 3DSets guide/FAQ ingestion",
                "remaining": "optional separate curation, not required for supported partial reference use",
            },
            {
                "category": "schema_and_binding",
                "state": "native schemas unchanged; core-intake and private-field stages distinguished",
                "affected_fragments": len(candidates),
                "offline_resolution": "Strapi required fields/version mapping and 33 primary bindings prepared; official classifier omissions fixed",
                "remaining": "Fragment pool includes one selected primary per product plus alternatives; current reference card binds one source document per product, not every fragment simultaneously",
            },
            {
                "category": "environment",
                "state": "native target availability not exercised",
                "affected_fragments": len(candidates),
                "offline_resolution": "existing parser/CMS/backend pure checks available",
                "remaining": "authorized connected staging Admin/CMS and deployed current gates/readbacks; no startup or credential expansion in this task",
            },
            {
                "category": "action_authorization",
                "state": "native creation/review-write/publication/binding not authorized",
                "affected_fragments": len(candidates),
                "affected_shells": len(grouped),
                "offline_resolution": "reviewable templates ready; all apply flags false",
                "remaining": "specific authorization for target and selected reference-only scope; release/index activation separately parent-owned",
            },
        ],
        native_workflow={
            "strapi_content_type": "api::product-document.product-document",
            "core_intake": "existing StrapiModuleService.upsertAiProductDocumentDrafts performs unique protected lookup and draft POST/PUT for core fields; its typed DTO does not define knowledge_content/knowledge_review",
            "private_field_stage": "after native identity readback, use agreed Strapi Admin path to enter canonical knowledge_content/version and pending review; no custom review-action endpoint or automatic promotion is assumed",
            "preserve_existing": "do not overwrite existing reviewed/bound content; require scoped backup/reconciliation if native duplicate preflight finds it",
            "initial_state": "private draft via agreed Strapi Admin/API, explicit is_public=false; status=draft on supported operator path",
            "duplicate_preflight": "protected importLookup: exact medusa_product_id, source_url and draft/published status; public find cannot inspect private drafts",
            "identity_plan": "33 unique group-consistent shells; one selected primary per reference card",
            "canonical_revision": "knowledgeRevision from actual CMS utils after real documentId/product/variant/handle/title readback; v1 local/fixture hashes are not reusable native hashes",
            "review_record": "genuine authorized event with exact document/product/variant/revision, honest reviewer identity, reviewed_at after source_checked_at and valid_until within90days; existing JSON contract has no dedicated reviewer-action endpoint",
            "medusa_binding_preview": "GET /admin/products/{id}/knowledge-reference-preview?document_id={actual_id}&revision={canonical_hash}; read-only, requires current approved published DTO",
            "apply": "authorized Medusa Admin/workflow metadata update preserving existing metadata; attach nonphysical group-bound simulation only with actual IDs; keep draft/unpriced/no checkout",
            "serve": "verify CMS approved DTO and Medusa referenceCard; parent authorizes scoped index/release activation",
            "local_review_sync": "sync-public-document-review writes local review state only and grants no native approval",
        },
    )
    return manifest


def prepare(name):
    target = ROOT / "reports" / name
    if Path(name).name != name or not name.endswith(".json") or target.exists():
        raise ValueError("New report basename required")
    store = Store()
    try:
        before = store.stats()
        manifest = build_readiness(store)
        assert store.stats() == before
        with target.open("x") as f:
            f.write(json.dumps(manifest, indent=2) + "\n")
        print(
            json.dumps(
                {
                    "report": str(target),
                    "fragments": len(manifest["single_source_candidate_fragments"]),
                    "supported_facts": manifest["supported_fact_count"],
                    "primary_documents": manifest["primary_reference_document_count"],
                    "held": manifest["held_field_reason_counts"],
                    "native_eligible": 0,
                    "data_changed": False,
                }
            )
        )
    finally:
        store.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--report", required=True)
    prepare(parser.parse_args().report)
