"""Exercise exact Gitleaks exceptions with generated, noncredential fixtures.

Requires Python 3.11+ and an existing Gitleaks 8.24.3 binary. All outputs go under
an explicitly supplied new directory; no scanner, dependency or network install.
"""

import argparse
import collections
import hashlib
import json
import re
import string
import subprocess
import sys
import tomllib
import unittest
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
MANIFEST = REPO / "scripts/security/fixtures/gitleaks-approved-identifiers.json"


def digest(value):
    return hashlib.sha256(value).hexdigest()


def synthetic(label, length=40):
    """Deterministic test data with no account, issuer or real credential source."""

    # Alternating letters/digits avoid accidental dictionary stopwords while
    # keeping entropy above the unchanged detector threshold.
    def order(char):
        return digest((label + char).encode())

    letters = sorted(string.ascii_letters, key=order)
    digits = sorted(string.digits, key=order)
    pairs = (char + digits[index % len(digits)] for index, char in enumerate(letters))
    return "".join(pairs)[:length]


def signature(finding):
    return (
        finding["File"],
        finding["RuleID"],
        finding["StartLine"],
        finding["Match"],
    )


class ExactIdentifierExceptions(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.output = OPTIONS.output.resolve()
        cls.output.mkdir(parents=True, exist_ok=False)
        cls.binary = OPTIONS.gitleaks.resolve(strict=True)
        version = subprocess.check_output([str(cls.binary), "version"], text=True)
        if version.strip() != "8.24.3":
            raise ValueError("Use the reviewed Gitleaks 8.24.3 binary")
        cls.manifest = json.loads(MANIFEST.read_text())
        cls.original = {}
        cls.approved = []
        for item in cls.manifest["files"]:
            data = (REPO / item["path"]).read_bytes()
            if digest(data) != item["sha256"]:
                raise ValueError("Approved source file changed: " + item["path"])
            cls.original[item["path"]] = data.decode()
            lines = data.decode().splitlines()
            for match in item["matches"]:
                pattern = re.escape(match["field"]) + r'(?:": "|=")([a-z][a-z0-9_]+)"'
                found = re.search(pattern, lines[match["line"] - 1])
                if not found or digest(found.group(0).encode()) != match["matchSHA256"]:
                    raise ValueError("Approved assignment changed")
                cls.approved.append(
                    {
                        **match,
                        "file": item["path"],
                        "match": found.group(0),
                        "value": found.group(1),
                    }
                )
        if len(cls.approved) != 53 or len(cls.original) != 5:
            raise ValueError("The approved inventory is exactly 53 matches in 5 files")
        baseline = subprocess.check_output(
            ["git", "show", cls.manifest["sourceCommit"] + ":.gitleaks.toml"],
            cwd=REPO,
        )
        if digest(baseline) != cls.manifest["baselinePolicySHA256"]:
            raise ValueError("Original scanner policy changed")
        cls.baseline = cls.output / "baseline.toml"
        cls.baseline.write_bytes(baseline)
        cls.current = REPO / ".gitleaks.toml"
        cls.scan_results = []

    @classmethod
    def tearDownClass(cls):
        (cls.output / "scan-summary.json").write_text(
            json.dumps(cls.scan_results, indent=2) + "\n"
        )

    def fixture(self, name, contents):
        directory = self.output / name
        directory.mkdir()
        for filename, text in contents.items():
            path = directory / filename
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(text)
        return directory

    def scan(self, directory, policy):
        label = (
            directory.name + "-" + ("before" if policy == self.baseline else "after")
        )
        report = self.output / (label + ".json")
        with (self.output / (label + ".log")).open("x") as log:
            result = subprocess.run(
                [
                    str(self.binary),
                    "dir",
                    ".",
                    "--config",
                    str(policy),
                    "--redact",
                    "--exit-code",
                    "1",
                    "--report-format",
                    "json",
                    "--report-path",
                    str(report),
                ],
                cwd=directory,
                stdout=log,
                stderr=subprocess.STDOUT,
                timeout=30,
            )
        self.assertIn(result.returncode, (0, 1))
        findings = json.loads(report.read_text())
        self.assertEqual(result.returncode, 1 if findings else 0)
        self.scan_results.append(
            {
                "case": label,
                "exitCode": result.returncode,
                "matches": len(findings),
                "rules": dict(collections.Counter(f["RuleID"] for f in findings)),
                "report": str(report),
            }
        )
        return findings

    def test_policy_changes_only_the_approved_rule_local_content(self):
        before = tomllib.loads(self.baseline.read_text())
        after = tomllib.loads(self.current.read_text())
        additions = [r for r in after["rules"] if r["id"] == "generic-api-key"]
        self.assertEqual(len(additions), 1)
        self.assertEqual(set(additions[0]), {"id", "allowlists"})
        after["rules"] = [r for r in after["rules"] if r["id"] != "generic-api-key"]
        self.assertEqual(before, after)
        allowlists = additions[0]["allowlists"]
        self.assertEqual(len(allowlists), 5)
        expected = {
            "^" + re.escape(path) + "$": {
                "^" + re.escape(a["match"]) + "$"
                for a in self.approved
                if a["file"] == path
            }
            for path in self.original
        }
        actual = {}
        for allowlist in allowlists:
            self.assertEqual(
                set(allowlist),
                {"description", "condition", "regexTarget", "paths", "regexes"},
            )
            self.assertEqual(allowlist["condition"], "AND")
            self.assertEqual(allowlist["regexTarget"], "match")
            self.assertEqual(len(allowlist["paths"]), 1)
            self.assertEqual(len(allowlist["regexes"]), len(set(allowlist["regexes"])))
            actual[allowlist["paths"][0]] = set(allowlist["regexes"])
        self.assertEqual(actual, expected)

    def test_all_53_approved_assignments_are_excluded(self):
        directory = self.fixture("approved", self.original)
        before = self.scan(directory, self.baseline)
        expected = {(a["file"], "generic-api-key", a["line"]) for a in self.approved}
        self.assertEqual(len(before), 53)
        self.assertEqual({signature(f)[:3] for f in before}, expected)
        self.assertEqual(self.scan(directory, self.current), [])

    def test_changed_values_at_all_53_original_locations_are_detected(self):
        contents = {name: text.splitlines() for name, text in self.original.items()}
        for index, a in enumerate(self.approved):
            replacement = a["match"].replace(a["value"], synthetic(str(index)))
            lines = contents[a["file"]]
            lines[a["line"] - 1] = lines[a["line"] - 1].replace(
                a["match"], replacement, 1
            )
        directory = self.fixture(
            "changed", {p: "\n".join(v) + "\n" for p, v in contents.items()}
        )
        before, after = (
            self.scan(directory, self.baseline),
            self.scan(directory, self.current),
        )
        self.assertEqual(len(before), 53)
        self.assertEqual(
            collections.Counter(map(signature, before)),
            collections.Counter(map(signature, after)),
        )
        self.assertEqual(
            {signature(f)[:3] for f in after},
            {(a["file"], "generic-api-key", a["line"]) for a in self.approved},
        )

    def test_synthetic_secret_on_the_same_line_is_not_allowlisted(self):
        contents = {name: text.splitlines() for name, text in self.original.items()}
        for index, approved in enumerate(self.approved):
            value = synthetic("same-line:" + str(index))
            contents[approved["file"]][approved["line"] - 1] += (
                ' synthetic_api_key="' + value + '"'
            )
        directory = self.fixture(
            "same-line", {p: "\n".join(v) + "\n" for p, v in contents.items()}
        )
        before, after = (
            self.scan(directory, self.baseline),
            self.scan(directory, self.current),
        )
        self.assertEqual(len(before), 106)
        self.assertEqual(len(after), 53)
        self.assertTrue(all(f["Match"].startswith("synthetic_api_key=") for f in after))
        self.assertEqual(
            {signature(f)[:3] for f in after},
            {(a["file"], "generic-api-key", a["line"]) for a in self.approved},
        )

    def test_identical_assignments_in_other_paths_remain_detected(self):
        contents = {}
        for path, text in self.original.items():
            contents["not-approved/" + path] = text
            contents[path + ".copy"] = text
        directory = self.fixture("wrong-path", contents)
        before, after = (
            self.scan(directory, self.baseline),
            self.scan(directory, self.current),
        )
        self.assertEqual(len(before), 106)
        self.assertEqual(
            collections.Counter(map(signature, before)),
            collections.Counter(map(signature, after)),
        )

    def test_nearby_synthetic_values_and_other_rules_remain_detected(self):
        contents, approved_positions, nearby_positions = {}, set(), set()
        for path, text in self.original.items():
            lines = []
            approved_lines = {a["line"] for a in self.approved if a["file"] == path}
            for number, line in enumerate(text.splitlines(), 1):
                lines.append(line)
                if number in approved_lines:
                    approved_positions.add((path, "generic-api-key", len(lines)))
                    value = synthetic(path + ":" + str(number))
                    lines.append('  "synthetic_api_key": "' + value + '",')
                    nearby_positions.add((path, "generic-api-key", len(lines)))
            # Construct secret-shaped synthetic data only at runtime, never authenticate.
            lines.append('"gh' + "p_" + synthetic("github:" + path, 36) + '"')
            lines.append(
                'curl -H "Authorization: Bearer '
                + synthetic("curl:" + path)
                + '" https://example.invalid'
            )
            contents[path] = "\n".join(lines) + "\n"
        directory = self.fixture("nearby", contents)
        before, after = (
            self.scan(directory, self.baseline),
            self.scan(directory, self.current),
        )
        remaining = [f for f in before if signature(f)[:3] not in approved_positions]
        self.assertEqual(
            collections.Counter(map(signature, remaining)),
            collections.Counter(map(signature, after)),
        )
        self.assertTrue(nearby_positions <= {signature(f)[:3] for f in after})
        self.assertFalse(approved_positions & {signature(f)[:3] for f in after})
        for rule in ["github-pat", "curl-auth-header"]:
            self.assertEqual(sum(f["RuleID"] == rule for f in after), 5)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--gitleaks", type=Path, required=True)
    parser.add_argument(
        "--output",
        type=Path,
        required=True,
        help="New directory for all synthetic fixtures and redacted reports",
    )
    OPTIONS = parser.parse_args()
    unittest.main(argv=[sys.argv[0]], verbosity=2)
