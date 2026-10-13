"""Bounded stdin/stdout retrieval transport for offline route tests; never opens a socket."""

import json
import sys
from local_store import Store
from retrieval import Retriever


def main():
    raw = sys.stdin.read(2001)
    if len(raw) > 2000:
        raise ValueError("Bounded offline query required")
    query = json.loads(raw)
    question = query["question"]
    group = query.get("group")
    if not isinstance(question, str) or not 1 <= len(question) <= 500:
        raise ValueError("Bounded question required")
    if group is not None and (not isinstance(group, str) or len(group) > 100):
        raise ValueError("Bounded local group required")
    store = Store()
    try:
        print(json.dumps(Retriever(store).answer(question, group)))
    finally:
        store.close()


if __name__ == "__main__":
    main()
