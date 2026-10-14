"""Import-pure exclusive writes and verified idempotent source sealing."""

import hashlib
from pathlib import Path


def write_once(path: Path, data: bytes):
    with path.open("xb") as stream:
        stream.write(data)
    return path


def write_immutable(path: Path, data: bytes):
    try:
        return write_once(path, data)
    except FileExistsError:
        if hashlib.sha256(path.read_bytes()).digest() != hashlib.sha256(data).digest():
            raise ValueError(
                "Existing source snapshot has different bytes; replacement refused: "
                + str(path)
            )
        return path


def copy_immutable(source: Path, target: Path):
    return write_immutable(target, source.read_bytes())
