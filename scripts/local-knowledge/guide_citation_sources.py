"""Seal linked normalized selector/transcription versions without refreshing capture dates."""

import hashlib
import json
from html.parser import HTMLParser
from pathlib import Path
from local_store import ROOT, clock
from reconcile_evidence import checked_source, raw_variant_proof, SEED
from source_snapshots import copy_immutable, write_immutable


class PublicJSON(HTMLParser):
    def __init__(self):
        super().__init__()
        self.in_script = False
        self.parts = []
        self.objects = []

    def parse(self, value):
        try:
            self.objects.append(json.loads(value))
        except ValueError:
            pass

    def handle_starttag(self, tag, attrs):
        if tag == "script":
            self.in_script = True
            self.parts = []
        for _, value in attrs:
            if value and value.startswith(("{", "[")):
                self.parse(value)

    def handle_data(self, data):
        if self.in_script:
            self.parts.append(data)

    def handle_endtag(self, tag):
        if tag == "script" and self.in_script:
            self.parse("".join(self.parts))
            self.in_script = False


def walk(value):
    if isinstance(value, dict):
        yield value
        for item in value.values():
            yield from walk(item)
    elif isinstance(value, list):
        for item in value:
            yield from walk(item)


def seal_derived(store, prior, label, text, derivation):
    data = text.encode()
    text_sha = hashlib.sha256(data).hexdigest()
    identifier = (
        "local_source_guide_"
        + label
        + "_"
        + hashlib.sha256((prior["sha256"] + text_sha).encode()).hexdigest()[:16]
    )
    existing = store.db.execute(
        "SELECT payload FROM sources WHERE id=?", (identifier,)
    ).fetchone()
    if existing:
        source = checked_source(store, identifier)
        if source["sha256"] != prior["sha256"] or source["text_sha256"] != text_sha:
            raise ValueError("Derived-version collision")
        return source
    raw_path = copy_immutable(
        Path(prior["raw_path"]), ROOT / "sources/immutable" / (prior["sha256"] + ".raw")
    )
    text_path = write_immutable(ROOT / "sources/immutable" / (text_sha + ".text"), data)
    source = {
        **prior,
        "id": identifier,
        "raw_path": str(raw_path),
        "text_path": str(text_path),
        "text_sha256": text_sha,
        "derived_from_local_source_id": prior["id"],
        "derived_at": clock(),
        "derivation": derivation,
        "raw_capture_available": True,
        "capture_version_immutable": True,
        "original_capture_time_preserved": True,
        "not_native_approval": True,
    }
    store.source(source)
    return source


def prepare_sources(store):
    seed = json.loads(SEED.read_text())
    sources = []
    for source_id, label, title_key in [
        ("local_source_earlier_S27", "selector_retailer", "retailer_title"),
        ("local_source_earlier_S28", "selector_manufacturer", "manufacturer_title"),
    ]:
        prior = checked_source(store, source_id)
        lines = []
        proofs = []
        for variant in seed["selector_variants"]:
            proof = raw_variant_proof(
                store, source_id, variant["sku"], variant[title_key]
            )
            if not proof:
                raise ValueError("Uncoupled selector identity")
            lines.append(variant[title_key] + " | SKU " + variant["sku"])
            proofs.append(proof)
        if label == "selector_retailer":
            parser = PublicJSON()
            parser.feed(Path(prior["raw_path"]).read_text())
            offers = [
                obj
                for root in parser.objects
                for obj in walk(root)
                if obj.get("@type") == "Offer" and obj.get("sku")
            ]
            expected = {
                "4008030090": 29.95,
                "4008030074": 29.95,
                "4008030073": 29.95,
                "4008030091": 29.95,
                "4008030075": 95.95,
            }
            for sku, amount in expected.items():
                matching = [
                    obj
                    for obj in offers
                    if obj.get("sku") == sku and obj.get("priceCurrency") == "AUD"
                ]
                if not matching or any(
                    float(obj["price"]) != amount for obj in matching
                ):
                    raise ValueError("Captured dated price/SKU mismatch")
                lines.append("SKU " + sku + " | captured AUD" + f"{amount:.2f}")
        text = "\n".join(lines) + "\n"
        sources.append(
            seal_derived(
                store,
                prior,
                label,
                text,
                {
                    "kind": "bounded_embedded_variant_normalization",
                    "raw_pair_proofs": proofs,
                    "scope": "Exact archived manufacturer/retailer selector pairs; retailer price observations remain dated external references, not live store offers.",
                },
            )
        )
    prior = checked_source(store, "local_source_earlier_K2IMAGE6")
    source = seal_derived(
        store,
        prior,
        "diagram",
        Path(prior["text_path"]).read_text().rstrip()
        + "\n350°C High Temperature Resistance\n",
        {
            "kind": "manual_image_transcription",
            "reviewer_actor": "codex_local_guide_citation_review",
            "scope": "Original diagram pixels independently viewed; marketing resistance headline, not maximum operating temperature.",
            "native_source_kind": None,
        },
    )
    sources.append(source)
    public = json.loads(
        (ROOT / "reports/guide-equivalent-public-capture-v1.json").read_text()
    )
    if (
        public.get("id")
        and public.get("exact_part_found")
        and public.get("exact_named_model_found")
    ):
        store.source(public)
        sources.append(checked_source(store, public["id"]))
    return sources
