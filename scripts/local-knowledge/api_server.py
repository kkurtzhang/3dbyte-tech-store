"""Read-only loopback local knowledge API. No record-write HTTP endpoints."""

import json, urllib.parse
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from local_store import ROOT, Store, verify_boundary, SCOPE
from retrieval import Retriever

HOST = "127.0.0.1"
PORT = 8873


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        host = self.headers.get("Host", "")
        if host not in (f"{HOST}:{PORT}", f"localhost:{PORT}"):
            return self.reply(403, {"error": "Loopback host required"})
        parsed = urllib.parse.urlsplit(self.path)
        args = urllib.parse.parse_qs(parsed.query)
        store = Store()
        try:
            if parsed.path == "/":
                data = (ROOT / "index.html").read_bytes()
                self.send_response(200)
                self.send_header("Content-Type", "text/html; charset=utf-8")
                self.send_header("Content-Length", str(len(data)))
                self.end_headers()
                self.wfile.write(data)
            elif parsed.path == "/api/status":
                self.reply(
                    200,
                    {
                        "environment": SCOPE,
                        "host": HOST,
                        "database": str(ROOT / "data/knowledge.sqlite3"),
                        "stats": store.stats(),
                        "methods": ["keyword", "vector", "hybrid"],
                        "neural_embeddings": False,
                        "llm_generation": False,
                        "paid_calls": 0,
                        "staging_access": False,
                    },
                )
            elif parsed.path == "/api/search":
                q = args.get("q", [""])[0]
                mode = args.get("mode", ["hybrid"])[0]
                group = args.get("group", [None])[0]
                self.reply(200, Retriever(store).answer(q, group, mode))
            elif parsed.path == "/api/records":
                self.reply(
                    200,
                    {
                        "environment": SCOPE,
                        "records": [
                            dict(x)
                            for x in store.db.execute(
                                "SELECT id,record_key,kind,title,revision FROM records WHERE active=1 ORDER BY kind,title"
                            )
                        ],
                    },
                )
            else:
                self.reply(404, {"error": "Unknown read-only endpoint"})
        except (ValueError, AssertionError):
            self.reply(
                400,
                {
                    "error": "Invalid query or stale local source/index; inspect local reports."
                },
            )
        finally:
            store.close()

    def do_POST(self):
        self.reply(
            405,
            {
                "error": "Read-only API; local editorial/ingest operations use the scoped CLI."
            },
        )

    def reply(self, status, value):
        data = json.dumps(value, ensure_ascii=False).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(data)


if __name__ == "__main__":
    verify_boundary()
    server = ThreadingHTTPServer((HOST, PORT), Handler)
    (ROOT / "reports/service-boundary.json").write_text(
        json.dumps(
            {
                "environment": SCOPE,
                "listen_host": HOST,
                "listen_port": PORT,
                "listen_address": server.server_address,
                "record_write_http_endpoints": False,
                "native_connections": 0,
            },
            indent=2,
        )
        + "\n"
    )
    print(f"Local knowledge API: http://{HOST}:{PORT}", flush=True)
    server.serve_forever()
