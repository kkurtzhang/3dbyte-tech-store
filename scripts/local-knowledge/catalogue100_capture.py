"""Bounded public-source capture for the separate 100-product local corpus."""

import argparse
import concurrent.futures
import hashlib
import json
import re
import subprocess
import urllib.request
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlparse
from local_store import ROOT, clock, verify_boundary
from source_snapshots import write_immutable
from guide_citation_sources import PublicJSON, walk

ALLOWED = {
    "www.formfutura.com",
    "au.store.bambulab.com",
    "fuse3d.com.au",
    "www.3dxtech.com",
    "formfutura.com",
    "x3d.com.au",
    "www.3dprintergear.com.au",
    "colorfabb.com",
    "phaserfpv.com.au",
    "risingsunfpv.com.au",
    "shapeshop.com.au",
    "cnckitchen.store",
    "www.crealityau.com.au",
    "www.3dlac.com",
    "b3d.com.au",
    "us.store.bambulab.com",
    "www.printdry.com",
    "www.addlabs.au",
    "shop.eibos3d.com",
    "www.onetwo3d.co.uk",
    "ldomotion.com",
    "docs.ldomotors.com",
    "docs.cartographer3d.com",
    "cartographer3d.com",
    "fiberlogy.com",
    "www.proforged3d.com.au",
    "proforged3d.com.au",
    "store.dremc.com.au",
    "bigtree-tech.com",
    "raw.githubusercontent.com",
    "www.bondtech.se",
    "www.phaetus.com",
    "magigoo.com",
    "www.sunlu.com",
    "www.jaycar.com.au",
    "www.esun3d.com",
    "cubictech.com.au",
    "store.creality.com",
    "www.creality.com",
    "shop.polymaker.com",
    "polymaker.com",
    "e3d-online.com",
    "www.e3d-online.com",
    "www.sliceengineering.com",
    "store.micro-swiss.com",
    "3dsets.com",
    "www.3dsets.com",
    "3dmakerparts.com",
    "www.3dmakerparts.com",
    "west3d.com",
}


class PlainText(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.ignored = 0
        self.parts = []

    def handle_starttag(self, tag, attrs):
        if tag in {"script", "style", "noscript", "svg"}:
            self.ignored += 1

    def handle_endtag(self, tag):
        if tag in {"script", "style", "noscript", "svg"} and self.ignored:
            self.ignored -= 1

    def handle_data(self, data):
        if not self.ignored:
            text = re.sub(r"\s+", " ", data).strip()
            if text:
                self.parts.append(text)


def allowed_url(url):
    p = urlparse(url)
    return (
        p.scheme == "https"
        and p.hostname in ALLOWED
        and not p.username
        and not p.password
        and not any(
            x in p.path.lower() for x in ["/build-guide", "/faq", "/manuals/3dsets"]
        )
    )


class PublicRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        if not allowed_url(newurl):
            raise ValueError("Redirect outside declared public research scope")
        return super().redirect_request(req, fp, code, msg, headers, newurl)


def capture(item):
    if not allowed_url(item["url"]):
        raise ValueError("Declared HTTPS public source required")
    request = urllib.request.Request(
        item["url"],
        headers={
            "User-Agent": "3DByte-product-reference-research/1.0",
            "Accept": "text/html,application/json,text/plain",
        },
    )
    with urllib.request.build_opener(PublicRedirect()).open(
        request, timeout=25
    ) as response:
        raw = response.read(10_000_001)
        if len(raw) > 10_000_000:
            raise ValueError("Capture exceeds source cap")
        final_url = response.url
        content_type = response.headers.get("Content-Type", "")
        charset = response.headers.get_content_charset() or "utf-8"
    if len(raw) < 100:
        raise ValueError("Empty or insufficient public response; no evidence captured")
    raw_sha = hashlib.sha256(raw).hexdigest()
    raw_path = write_immutable(ROOT / "sources/immutable" / (raw_sha + ".raw"), raw)
    decoded = (
        raw.decode(charset, errors="replace").replace("\r\n", "\n").replace("\r", "\n")
    )
    if "html" in content_type or "<html" in decoded[:2000].lower():
        parser = PlainText()
        parser.feed(decoded)
        text = "\n".join(parser.parts) + "\n"
        structured = PublicJSON()
        structured.feed(decoded)
        products = [
            v
            for root in structured.objects
            for v in walk(root)
            if v.get("@type") == "Product"
        ]
        if products:
            text += (
                "\nCaptured product-scoped structured data:\n"
                + json.dumps(products, ensure_ascii=False, indent=2)
                + "\n"
            )
    elif "pdf" in content_type:
        result = subprocess.run(
            ["/opt/homebrew/bin/pdftotext", "-layout", str(raw_path), "-"],
            check=True,
            capture_output=True,
            timeout=30,
        )
        text = result.stdout.decode("utf-8")
    else:
        text = decoded
    text_bytes = text.encode()
    text_sha = hashlib.sha256(text_bytes).hexdigest()
    raw_path = write_immutable(ROOT / "sources/immutable" / (raw_sha + ".raw"), raw)
    text_path = write_immutable(
        ROOT / "sources/immutable" / (text_sha + ".text"), text_bytes
    )
    return {
        "key": item["key"],
        "id": "local_source_c100_" + item["key"] + "_" + raw_sha[:12],
        "source_url": item["url"],
        "final_url": final_url,
        "source_role": item["role"],
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
        "normalization": "Whitespace-separated visible HTML text plus product-scoped JSON-LD; scripts never executed. Plain text/JSON preserved as decoded text; PDF text extracted with existing pdftotext -layout.",
        "not_native_approval": True,
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("manifest")
    parser.add_argument("--report", required=True)
    args = parser.parse_args()
    verify_boundary()
    target = ROOT / "reports" / args.report
    if Path(args.report).name != args.report or target.exists():
        raise ValueError("New report basename required")
    items = json.loads(Path(args.manifest).read_text())
    results = []

    def safe(item):
        try:
            return capture(item)
        except Exception as exc:
            return {
                "key": item["key"],
                "url": item["url"],
                "failed": type(exc).__name__ + ": " + str(exc)[:180],
            }

    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        for result in pool.map(safe, items):
            results.append(result)
            print(
                json.dumps(
                    {k: result[k] for k in ["key", "id", "failed"] if k in result}
                ),
                flush=True,
            )
    with target.open("x") as stream:
        stream.write(json.dumps(results, indent=2) + "\n")


if __name__ == "__main__":
    main()
