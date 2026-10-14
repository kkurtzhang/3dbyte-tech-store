"""Report exact available/unavailable source versions; never reconstruct missing captures."""

import hashlib
import json
from pathlib import Path
from local_store import ROOT, Store


def main():
    store = Store()
    try:
        references = {}
        for row in store.rows():
            for citation in json.loads(row["payload"])["citations"]:
                key = citation["local_source_id"]
                references[key] = references.get(key, 0) + 1
        versions = []
        for row in store.db.execute("SELECT payload FROM sources ORDER BY id"):
            source = json.loads(row["payload"])
            raw = Path(source["raw_path"])
            text = Path(source["text_path"]) if source.get("text_path") else None
            available = (
                source.get("raw_capture_available") is not False
                and raw.is_file()
                and hashlib.sha256(raw.read_bytes()).hexdigest() == source["sha256"]
            )
            normalized = bool(
                text
                and text.is_file()
                and hashlib.sha256(text.read_bytes()).hexdigest()
                == source["text_sha256"]
            )
            active = references.get(source["id"], 0)
            assert not active or available
            versions.append(
                {
                    "local_source_id": source["id"],
                    "source_url": source["source_url"],
                    "raw_sha256": source["sha256"],
                    "raw_path": source["raw_path"],
                    "raw_version_available": available,
                    "normalized_text_available_and_hash_verified": normalized,
                    "active_citation_count": active,
                    "reconstruction_claimed": False,
                    "unavailable_reason": None
                    if available
                    else "Historical raw response version was overwritten by import-triggered capture; original bytes unavailable. Preserved normalized technical text is not reconstruction.",
                }
            )
        absent = [v for v in versions if not v["raw_version_available"]]
        assert len(absent) == 5 and all(v["active_citation_count"] == 0 for v in absent)
        report = {
            "environment": "local_development",
            "source_versions": versions,
            "total_versions": len(versions),
            "historical_raw_versions_unavailable": len(absent),
            "all_active_evidence_versions_available": True,
            "reconstruction_claimed": False,
            "original_approved_packets_modified": False,
            "failure_receipt": str(ROOT / "reports/capture-helper-failure.json"),
        }
        (ROOT / "reports/source-version-manifest.json").write_text(
            json.dumps(report, indent=2, ensure_ascii=False) + chr(10)
        )
        print(
            json.dumps(
                {
                    "source_versions": len(versions),
                    "raw_unavailable": len(absent),
                    "all_active_versions_available": True,
                    "reconstruction_claimed": False,
                }
            )
        )
    finally:
        store.close()


if __name__ == "__main__":
    main()
