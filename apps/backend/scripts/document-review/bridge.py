"""Repository-local adapter entry point; no network or native write capability."""

import argparse
import json
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parent / "durable-sync-tools"))
from synchronize_documents import DocumentStore, PREPARER  # noqa: E402


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("database", type=Path)
    parser.add_argument("capture_root", type=Path)
    parser.add_argument("manifest", type=Path)
    args = parser.parse_args()
    manifest = PREPARER.read_json(args.manifest)
    store = DocumentStore(args.database)
    try:
        result = store.sync(manifest, args.capture_root)
        print(json.dumps(result))
    finally:
        store.close()


if __name__ == "__main__":
    main()
