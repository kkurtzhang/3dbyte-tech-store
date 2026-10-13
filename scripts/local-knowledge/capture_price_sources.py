"""Capture the explicitly reviewed public price URLs without executing page code."""

import argparse
import concurrent.futures
import hashlib
import json
import urllib.request
from pathlib import Path
from urllib.parse import urlparse

from catalogue100_capture import PlainText
from local_store import ROOT, clock, verify_boundary
from source_snapshots import write_immutable

MANIFEST = Path(__file__).parent / "evaluation/price-followup-sources-v1.json"
ITEMS = json.loads(MANIFEST.read_text())
URLS = {item["url"] for item in ITEMS}
HOSTS = {urlparse(url).hostname for url in URLS}


class ScopedRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        parsed = urlparse(newurl)
        if (
            parsed.scheme != "https"
            or parsed.hostname not in HOSTS
            or parsed.username
            or parsed.password
        ):
            raise ValueError("Redirect leaves the reviewed public-source hosts")
        return super().redirect_request(req, fp, code, msg, headers, newurl)


def capture(item):
    if item["url"] not in URLS:
        raise ValueError("URL is not in the reviewed price manifest")
    request = urllib.request.Request(
        item["url"],
        headers={
            "User-Agent": "Mozilla/5.0 (compatible; 3DByteReferenceCapture/1.0)",
            "Accept": "text/html,application/json,text/plain",
        },
    )
    with urllib.request.build_opener(ScopedRedirect()).open(
        request, timeout=25
    ) as response:
        raw = response.read(10_000_001)
        if len(raw) < 100 or len(raw) > 10_000_000:
            raise ValueError("Empty or oversized source response")
        final_url = response.url
        content_type = response.headers.get("Content-Type", "")
        charset = response.headers.get_content_charset() or "utf-8"
    raw_sha = hashlib.sha256(raw).hexdigest()
    raw_path = write_immutable(ROOT / "sources/immutable" / (raw_sha + ".raw"), raw)
    text = (
        raw.decode(charset, errors="replace").replace("\r\n", "\n").replace("\r", "\n")
    )
    text_sha = hashlib.sha256(text.encode()).hexdigest()
    text_path = write_immutable(
        ROOT / "sources/immutable" / (text_sha + ".text"), text.encode()
    )
    if "html" in content_type:
        parser = PlainText()
        parser.feed(text)
        write_immutable(
            ROOT / "sources/review" / (item["key"] + ".visible.txt"),
            "\n".join(parser.parts).encode(),
        )
    return {
        "key": item["key"],
        "id": "local_source_price_" + item["key"] + "_" + raw_sha[:12],
        "source_url": item["url"],
        "final_url": final_url,
        "source_role": "dated_external_reference_price_evidence",
        "sha256": raw_sha,
        "text_sha256": text_sha,
        "raw_path": str(raw_path),
        "text_path": str(text_path),
        "captured_at": clock(),
        "raw_capture_available": True,
        "capture_version_immutable": True,
        "environment": "local_development",
        "http_status": 200,
        "content_type": content_type,
        "normalization": "Original HTTP response decoded to text with CRLF normalized; HTML markup retained for exact embedded-data and microdata citations. No scripts executed; no checkout or authenticated request.",
        "not_native_approval": True,
    }


def main():
    verify_boundary()
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--report", required=True)
    args = parser.parse_args()
    if Path(args.report).name != args.report:
        raise ValueError("Report basename required")
    (ROOT / "sources/immutable").mkdir(exist_ok=True)
    (ROOT / "sources/review").mkdir(exist_ok=True)
    target = ROOT / "reports" / args.report
    if target.exists():
        raise ValueError("Existing capture report is immutable")

    def attempt(item):
        try:
            return capture(item)
        except Exception as exc:
            return {
                **item,
                "failed": type(exc).__name__ + ": " + str(exc)[:200],
                "checked_at": clock(),
            }

    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        results = []
        for result in pool.map(attempt, ITEMS):
            results.append(result)
            print(
                json.dumps(
                    {
                        k: result[k]
                        for k in ("key", "http_status", "failed")
                        if k in result
                    }
                ),
                flush=True,
            )
    with target.open("x") as output:
        output.write(json.dumps(results, indent=2) + "\n")


if __name__ == "__main__":
    main()
