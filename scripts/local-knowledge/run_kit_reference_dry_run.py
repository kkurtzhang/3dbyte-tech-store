"""Reversible offline kit reference fixture through the actual repository review coordinator."""

import argparse
import copy
import datetime
import importlib.util
import json
import subprocess
from pathlib import Path

from local_store import ROOT
from prepare_kit_reference_plan import build_plan, digest
from source_snapshots import copy_immutable, write_immutable
from verify_retailer_kit_evidence import REVIEW

REPO = Path(__file__).resolve().parents[2]
NODE = Path(
    "/Volumes/MINI-M1/Codex/3dbyte-tech-store/tools/node22/node-v22.22.1-darwin-arm64/bin/node"
)


def load_coordinator():
    path = (
        REPO
        / "apps/backend/scripts/document-review/durable-sync-tools/synchronize_documents.py"
    )
    spec = importlib.util.spec_from_file_location("kit_fixture_coordinator", path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def run(run_name):
    if not run_name or Path(run_name).name != run_name:
        raise ValueError("A new run basename is required")
    directory = ROOT / "exports" / run_name
    directory.mkdir(exist_ok=False)
    captures = directory / "captures"
    captures.mkdir()
    plan = build_plan(json.loads(REVIEW.read_text()))
    plan_path = directory / "mapping-plan.json"
    plan_path.write_text(json.dumps(plan, indent=2, ensure_ascii=False) + "\n")
    environment = {
        "PATH": str(NODE.parent) + ":/usr/bin:/bin",
        "TMPDIR": str(ROOT / "tmp"),
    }
    checked = subprocess.run(
        [
            str(NODE),
            str(REPO / "scripts/local-knowledge/validate_kit_native_contract.cjs"),
            str(plan_path),
        ],
        env=environment,
        capture_output=True,
        text=True,
        check=True,
    )
    contract = json.loads(checked.stdout)
    (directory / "contract-checks.json").write_text(
        json.dumps(contract, indent=2) + "\n"
    )
    now = datetime.datetime.now(datetime.timezone.utc)
    at = lambda seconds: (now + datetime.timedelta(seconds=seconds)).isoformat()
    manifest = {
        "version": 1,
        "fixture_only": True,
        "snapshot_complete": True,
        "captured_at": at(0),
        "scope_document_ids": [],
        "documents": [],
        "artifacts": [],
    }
    for entry in plan["entries"]:
        record = copy.deepcopy(
            entry["local_contract_fixture"]["native_record_for_structure_check"]
        )
        # Only this local projection represents a controlled public-reader input, never a native publication.
        record.update(
            is_public=True,
            publishedAt=at(-1),
            file={"url": record["source_url"], "mime": "text/plain"},
        )
        text = record["knowledge_content"]["text"].encode()
        filename = record["documentId"] + ".txt"
        write_immutable(captures / filename, text)
        source = entry["source_sidecar"]
        raw_filename = "response_" + source["raw_sha256"] + ".txt"
        copy_immutable(ROOT / source["raw_path"], captures / raw_filename)
        manifest["scope_document_ids"].append(record["documentId"])
        manifest["documents"].append(record)
        manifest["artifacts"].append(
            {
                "document_id": record["documentId"],
                "path": filename,
                "sha256": digest(text),
                "origin_url": record["source_url"],
                "mime": "text/plain",
                "source_provenance": {
                    "capture_kind": "curated_review_ledger",
                    "capture_sha256": digest(text),
                    "response_path": raw_filename,
                    "response_sha256": source["raw_sha256"],
                    "captured_at": record["source_checked_at"],
                    "final_url": record["source_url"],
                    "derivation": "Single-source curated retailer identity excerpts with explicit nulls. Not native approval, exact supplier BOM contents or official model instructions.",
                },
            }
        )
    write_immutable(
        captures / "canary.txt",
        b"Controlled unrelated-scope canary; no business facts or approval.",
    )
    canary = {
        "version": 1,
        "fixture_only": True,
        "snapshot_complete": True,
        "captured_at": at(0),
        "scope_document_ids": ["local_dev_fixture_unrelated_canary"],
        "documents": [
            {
                "documentId": "local_dev_fixture_unrelated_canary",
                "medusa_product_id": "local_dev_fixture_canary_product",
                "is_public": True,
                "publishedAt": at(-1),
                "source_url": "https://example.com/local-canary",
                "title": "Local canary",
            }
        ],
        "artifacts": [
            {
                "document_id": "local_dev_fixture_unrelated_canary",
                "path": "canary.txt",
                "sha256": digest((captures / "canary.txt").read_bytes()),
                "origin_url": "https://example.com/local-canary",
                "mime": "text/plain",
            }
        ],
    }
    coordinator = load_coordinator()
    database = directory / "review.sqlite3"
    store = coordinator.DocumentStore(database)
    tests = []
    try:
        store.sync(canary, captures)
        first = store.sync(manifest, captures)
        assert first["prepared_documents"] == 3 and first["native_applied"] is False
        before = store.stats()
        snapshot = store.review_snapshot()
        replay = store.sync(manifest, captures)
        assert (
            replay["already_applied"]
            and replay["run_id"] == first["run_id"]
            and store.stats() == before
        )
        tests.append(
            {"case": "actual_coordinator_import_and_idempotent_replay", "passed": True}
        )
        store.close()
        store = coordinator.DocumentStore(database)
        assert store.review_snapshot() == snapshot and store.stats() == before
        tests.append(
            {"case": "close_reopen_persists_identical_local_review", "passed": True}
        )
        for name, edit in [
            (
                "duplicate_document_atomic_rejection",
                lambda m: m["documents"].append(copy.deepcopy(m["documents"][0])),
            ),
            (
                "source_hash_drift_atomic_rejection",
                lambda m: m["artifacts"][0]["source_provenance"].update(
                    response_sha256="0" * 64
                ),
            ),
        ]:
            bad = copy.deepcopy(manifest)
            edit(bad)
            try:
                store.sync(bad, captures)
            except ValueError:
                pass
            else:
                raise AssertionError("Invalid scoped fixture was accepted")
            assert store.stats() == before and store.review_snapshot() == snapshot
            tests.append({"case": name, "passed": True})
        withdrawal = {
            "version": 1,
            "fixture_only": True,
            "snapshot_complete": True,
            "captured_at": at(1),
            "scope_document_ids": manifest["scope_document_ids"],
            "documents": [],
            "artifacts": [],
        }
        withdrawn = store.sync(withdrawal, captures)
        after = store.stats()
        assert (
            withdrawn["withdrawn_documents"] == 3 and after["active_review_chunks"] == 1
        )
        assert (
            after["archived_captures"] == before["archived_captures"]
            and after["historical_chunks"] == before["historical_chunks"]
        )
        assert store.sync(withdrawal, captures)["already_applied"]
        tests.append(
            {
                "case": "scope_only_withdrawal_preserves_canary_and_immutable_history",
                "passed": True,
            }
        )
        restored = copy.deepcopy(manifest)
        restored["captured_at"] = at(2)
        restore = store.sync(restored, captures)
        final = store.stats()
        assert (
            restore["prepared_documents"] == 3
            and final["active_review_chunks"] == before["active_review_chunks"]
        )
        assert final["retrieval_eligible_chunks"] == 0
        assert all(
            entry.get("native_approval_verified") is not True
            for entry in store.review_snapshot()["entries"]
        )
        tests.append(
            {
                "case": "reversible_local_restore_never_grants_native_approval_or_retrieval",
                "passed": True,
            }
        )
        (directory / "local-review-manifest.json").write_text(
            json.dumps(manifest, indent=2, ensure_ascii=False) + "\n"
        )
        (directory / "local-withdrawal-manifest.json").write_text(
            json.dumps(withdrawal, indent=2) + "\n"
        )
        report = {
            "fixture_only": True,
            "run_directory": str(directory),
            "database": str(database),
            "source_plan_sha256": digest(plan_path.read_bytes()),
            "native_contract": contract,
            "local_coordinator_cases": tests,
            "cases_passed": len(tests),
            "prepared_reference_documents": 3,
            "unrelated_canary": 1,
            "final_stats": final,
            "native_ids_or_approvals_created": 0,
            "network_or_model_calls": 0,
            "staging_writes": 0,
            "active_knowledge_corpus_changed": False,
            "synthetic_publication_projection_only": True,
            "physical_possession_required_for_reference_only": False,
        }
        (directory / "report.json").write_text(json.dumps(report, indent=2) + "\n")
        print(
            json.dumps(
                {
                    "references": 3,
                    "structural_contract_checks": contract["references"],
                    "local_coordinator_cases": len(tests),
                    "native_changes": 0,
                    "report": str(directory / "report.json"),
                }
            )
        )
        return report
    finally:
        store.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--run-name", required=True)
    run(parser.parse_args().run_name)
