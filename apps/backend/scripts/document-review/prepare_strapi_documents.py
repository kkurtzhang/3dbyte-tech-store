"""Offline, review-only preparation of public Strapi document captures.

Strapi remains the source of truth. This program has no HTTP, model, database,
upload, publication or index client. PDF extraction requires local Poppler tools.
"""
import argparse
from datetime import datetime
import hashlib
import json
import os
from pathlib import Path
import re
import resource
import shutil
import stat
import subprocess
import tempfile
import unicodedata
from urllib.parse import urlsplit

POLICY = "strapi-document-text-preparation-v1"
MAX_FILE = 10 * 1024 * 1024
MAX_TEXT = 2 * 1024 * 1024
MAX_BATCH_TEXT = 8 * 1024 * 1024
ID = re.compile(r"[A-Za-z0-9_-]{1,100}\Z")
DIGEST = re.compile(r"[a-f0-9]{64}\Z")


def canonical(value):
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def sha(data):
    return hashlib.sha256(data).hexdigest()


def identifier(value):
    return isinstance(value, str) and ID.fullmatch(value)


def timestamp(value):
    if not isinstance(value, str) or len(value) > 60:
        raise ValueError("Invalid timestamp")
    result = datetime.fromisoformat(value.replace("Z", "+00:00"))
    if result.tzinfo is None:
        raise ValueError("Timestamp requires an offset")
    return result


def https_url(value):
    if not isinstance(value, str) or not value or len(value) > 2048:
        raise ValueError("Invalid public source URL")
    parsed = urlsplit(value)
    if (
        parsed.scheme != "https"
        or not parsed.hostname
        or parsed.username
        or parsed.password
    ):
        raise ValueError("Invalid public source URL")
    return value


def read_capture(root, artifact):
    name = artifact.get("path")
    expected = artifact.get("sha256")
    if not isinstance(name, str) or not re.fullmatch(
        r"[A-Za-z0-9][A-Za-z0-9_.-]{0,145}\.(pdf|txt)", name
    ):
        raise ValueError("Unsafe capture path")
    if (
        not isinstance(expected, str)
        or not DIGEST.fullmatch(expected)
        or root.is_symlink()
    ):
        raise ValueError("Invalid capture binding")
    descriptor = os.open(root / name, os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK)
    with os.fdopen(descriptor, "rb") as source:
        info = os.fstat(source.fileno())
        if not stat.S_ISREG(info.st_mode) or info.st_size > MAX_FILE:
            raise ValueError("Oversized or invalid capture")
        data = source.read(MAX_FILE + 1)
    if len(data) > MAX_FILE or sha(data) != expected:
        raise ValueError("Capture hash mismatch")
    return data


def subprocess_limits():
    resource.setrlimit(resource.RLIMIT_FSIZE, (MAX_TEXT, MAX_TEXT))
    resource.setrlimit(resource.RLIMIT_CPU, (20, 20))


def extract_pages(data, mime):
    if mime == "text/plain":
        if len(data) > MAX_TEXT:
            raise ValueError("Oversized text")
        text = data.decode("utf-8", errors="strict")
        parser = "utf8-formfeed-pages-v1"
    elif mime == "application/pdf":
        if (
            not data.startswith(b"%PDF-")
            or not shutil.which("pdfinfo")
            or not shutil.which("pdftotext")
        ):
            raise ValueError("PDF extractor unavailable or invalid PDF")
        with tempfile.TemporaryDirectory(prefix="strapi-text-") as directory:
            source = Path(directory) / "source.pdf"
            output = Path(directory) / "text.txt"
            info = Path(directory) / "info.txt"
            source.write_bytes(data)
            with info.open("wb") as destination:
                subprocess.run(
                    ["pdfinfo", str(source)],
                    stdin=subprocess.DEVNULL,
                    stdout=destination,
                    stderr=subprocess.DEVNULL,
                    check=True,
                    timeout=30,
                    preexec_fn=subprocess_limits,
                )
            description = info.read_bytes()
            if len(description) > 16_384:
                raise ValueError("Oversized PDF metadata")
            counts = re.findall(rb"^Pages:\s+(\d+)\s*$", description, re.MULTILINE)
            if len(counts) != 1 or not 1 <= int(counts[0]) <= 100:
                raise ValueError("PDF page limit exceeded")
            expected_pages = int(counts[0])
            subprocess.run(
                ["pdftotext", "-layout", str(source), str(output)],
                stdin=subprocess.DEVNULL,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                check=True,
                timeout=30,
                preexec_fn=subprocess_limits,
            )
            if output.stat().st_size > MAX_TEXT:
                raise ValueError("Oversized extracted text")
            text = output.read_bytes().decode("utf-8", errors="strict")
        parser = "poppler-pdftotext-layout-v1"
    else:
        raise ValueError("Unsupported document media type")
    pages = text.split("\f")
    if len(pages) > 1 and not pages[-1].strip():
        pages.pop()
    if not 1 <= len(pages) <= 100:
        raise ValueError("Extracted page limit exceeded")
    if mime == "application/pdf" and len(pages) != expected_pages:
        raise ValueError("Incomplete PDF extraction")
    pages = [
        unicodedata.normalize(
            "NFC",
            re.sub(r"[\x00-\x08\x0b\x0e-\x1f\x7f]", "", page).replace("\r\n", "\n"),
        ).strip()
        for page in pages
    ]
    if not any(pages):
        raise ValueError("No readable text; OCR or manual extraction required")
    return pages, parser


def prepare(manifest, root, previous=None):
    if (
        not isinstance(manifest, dict)
        or manifest.get("version") != 1
        or manifest.get("snapshot_complete") is not True
    ):
        raise ValueError("A complete, explicitly scoped snapshot is required")
    captured_at = manifest.get("captured_at")
    timestamp(captured_at)
    scope = manifest.get("scope_document_ids")
    documents = manifest.get("documents")
    artifacts = manifest.get("artifacts")
    if (
        not isinstance(scope, list)
        or not 1 <= len(scope) <= 100
        or not all(identifier(item) for item in scope)
        or len(set(scope)) != len(scope)
        or not isinstance(documents, list)
        or len(documents) > len(scope)
        or not isinstance(artifacts, list)
        or len(artifacts) > len(scope)
    ):
        raise ValueError("Invalid bounded snapshot")
    by_id, captures = {}, {}
    for document in documents:
        if (
            not isinstance(document, dict)
            or document.get("documentId") not in scope
            or document["documentId"] in by_id
        ):
            raise ValueError("Duplicate or out-of-scope document")
        by_id[document["documentId"]] = document
    for artifact in artifacts:
        if (
            not isinstance(artifact, dict)
            or artifact.get("document_id") not in by_id
            or artifact["document_id"] in captures
        ):
            raise ValueError("Duplicate or out-of-scope capture")
        captures[artifact["document_id"]] = artifact
    prior = {}
    if previous is not None:
        if (
            not isinstance(previous, dict)
            or previous.get("version") != 1
            or previous.get("policy") != POLICY
            or not isinstance(previous.get("entries"), list)
            or len(previous["entries"]) > 100
        ):
            raise ValueError("Invalid previous preparation")
        for entry in previous["entries"]:
            if not isinstance(entry, dict):
                raise ValueError("Invalid previous preparation")
            key = entry.get("document_id")
            if (
                not identifier(key)
                or key in prior
                or not isinstance(entry.get("chunks"), list)
                or len(entry["chunks"]) > 2000
            ):
                raise ValueError("Invalid previous preparation")
            if any(
                not isinstance(chunk, dict)
                or not re.fullmatch(r"chunk_[a-f0-9]{64}", chunk.get("id", ""))
                for chunk in entry["chunks"]
            ):
                raise ValueError("Invalid previous chunk identity")
            prior[key] = entry
    entries, text_bytes = [], 0
    for key in sorted(scope):
        document = by_id.get(key)
        entry = {
            "document_id": key,
            "status": "withdrawn",
            "retrieval_eligible": False,
            "chunks": [],
            "change": "new" if key not in prior else "withdrawn",
        }
        if (
            not document
            or document.get("is_public") is not True
            or not document.get("publishedAt")
        ):
            entries.append(entry)
            continue
        timestamp(document["publishedAt"])
        if not identifier(document.get("medusa_product_id")):
            raise ValueError("An exact Medusa product link is required")
        file = document.get("file") or {}
        if not isinstance(file, dict):
            raise ValueError("Invalid public file metadata")
        for field in (
            "title",
            "product_handle",
            "product_title",
            "version",
            "language",
            "source_kind",
        ):
            value = document.get(field)
            if value is not None and (not isinstance(value, str) or len(value) > 500):
                raise ValueError("Invalid document citation metadata")
        for field in ("source_checked_at", "updatedAt"):
            if document.get(field):
                timestamp(document[field])
        asset_url = https_url(file.get("url") or document.get("source_url"))
        source_url = https_url(document.get("source_url") or asset_url)
        citation = {
            "document_id": key,
            "medusa_product_id": document["medusa_product_id"],
            "product_handle": document.get("product_handle"),
            "product_title": document.get("product_title"),
            "title": document.get("title"),
            "version": document.get("version"),
            "language": document.get("language"),
            "source_kind": document.get("source_kind"),
            "source_url": source_url,
            "asset_url": asset_url,
            "source_checked_at": document.get("source_checked_at"),
            "published_at": document["publishedAt"],
            "updated_at": document.get("updatedAt"),
        }
        # Copies cannot prove source authority, exact variant match, or factual truth.
        entry.update(
            status="extraction_failed",
            change="failed",
            citation=citation,
            review_requirements=[
                "extraction_accuracy",
                "source_authority_and_variant_scope",
                "freshness",
                "citation_accuracy",
            ],
        )
        try:
            artifact = captures.get(key) or {}
            if artifact.get("origin_url") != asset_url:
                raise ValueError("Capture origin mismatch")
            data = read_capture(Path(root), artifact)
            pages, parser = extract_pages(
                data, file.get("mime") or artifact.get("mime")
            )
            text_bytes += sum(len(page.encode("utf-8")) for page in pages)
            citation["source_sha256"] = sha(data)
            revision = sha(
                canonical(
                    {
                        "policy": POLICY,
                        "citation": citation,
                        "parser": parser,
                        "pages": pages,
                    }
                ).encode()
            )
            chunks = []
            for page_number, page in enumerate(pages, 1):
                for start in range(0, len(page), 1600):
                    end = min(start + 1600, len(page))
                    chunk_id = "chunk_" + sha(
                        f"{key}:{revision}:{page_number}:{start}:{end}".encode()
                    )
                    chunks.append(
                        {
                            "id": chunk_id,
                            "text": page[start:end],
                            "citation": {
                                **citation,
                                "page": page_number,
                                "start_char": start,
                                "end_char": end,
                                "offset_basis": "normalized_extracted_page",
                            },
                        }
                    )
            entry.update(
                status="prepared_requires_review",
                revision_sha256=revision,
                chunks=chunks,
                parser=parser,
                page_count=len(pages),
                text_characters=sum(map(len, pages)),
                change="unchanged"
                if prior.get(key, {}).get("revision_sha256") == revision
                else "updated"
                if key in prior
                else "new",
            )
        except (OSError, ValueError, subprocess.SubprocessError):
            entry["failure"] = "capture_or_extraction_failed"
        entries.append(entry)
    if text_bytes > MAX_BATCH_TEXT:
        raise ValueError("Batch text limit exceeded; prepare a smaller explicit scope")
    active = {chunk["id"] for entry in entries for chunk in entry["chunks"]}
    removal = sorted(
        {
            chunk["id"]
            for key, entry in prior.items()
            if key in scope
            for chunk in entry["chunks"]
        }
        - active
    )
    return {
        "version": 1,
        "policy": POLICY,
        "source_system": "strapi",
        "captured_at": captured_at,
        "scope_document_ids": sorted(scope),
        "review_only": True,
        "applied": False,
        "entries": entries,
        "remove_chunk_ids": removal,
    }


def unique_object(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise ValueError("Duplicate preparation key")
        result[key] = value
    return result


def read_json(path):
    descriptor = os.open(path, os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK)
    with os.fdopen(descriptor, "rb") as file:
        if (
            not stat.S_ISREG(os.fstat(file.fileno()).st_mode)
            or os.fstat(file.fileno()).st_size > 16 * 1024 * 1024
        ):
            raise ValueError("Invalid or oversized preparation file")
        data = file.read(16 * 1024 * 1024 + 1)
        if len(data) > 16 * 1024 * 1024:
            raise ValueError("Oversized preparation file")
        return json.loads(
            data.decode("utf-8", errors="strict"), object_pairs_hook=unique_object
        )


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("manifest", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--previous", type=Path)
    args = parser.parse_args()
    try:
        result = prepare(
            read_json(args.manifest),
            args.manifest.parent,
            read_json(args.previous) if args.previous else None,
        )
        descriptor = os.open(
            args.output, os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW, 0o600
        )
        with os.fdopen(descriptor, "w", encoding="utf-8") as file:
            json.dump(result, file, ensure_ascii=False, indent=2)
            file.write("\n")
        print(
            json.dumps(
                {
                    "prepared": sum(
                        e["status"] == "prepared_requires_review"
                        for e in result["entries"]
                    ),
                    "failed": sum(
                        e["status"] == "extraction_failed" for e in result["entries"]
                    ),
                    "chunks": sum(len(e["chunks"]) for e in result["entries"]),
                    "review_only": True,
                    "applied": False,
                }
            )
        )
    except (OSError, ValueError, TypeError, KeyError):
        parser.exit(
            1,
            "Document preparation failed; verify the bounded snapshot/captures and choose a new output file.\n",
        )


if __name__ == "__main__":
    main()
