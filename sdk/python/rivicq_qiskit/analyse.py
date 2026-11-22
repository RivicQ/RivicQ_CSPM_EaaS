from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any

from .pipeline import score_findings


def extract_findings(payload: Any) -> list[dict[str, Any]]:
    if isinstance(payload, list):
        items = payload
    elif isinstance(payload, dict):
        items = payload.get("findings") or payload.get("algorithms") or payload.get("results") or []
    else:
        items = []
    findings: list[dict[str, Any]] = []
    for item in items:
        if not isinstance(item, dict):
            continue
        entry = dict(item)
        if "keyLength" in entry and "key_length" not in entry:
            entry["key_length"] = entry.pop("keyLength")
        if "quantumSafe" in entry and "quantum_safe" not in entry:
            entry["quantum_safe"] = entry.pop("quantumSafe")
        findings.append(entry)
    return findings


def load_payload(path: str) -> Any:
    if path == "-":
        raw = "" if sys.stdin.isatty() else sys.stdin.read()
        if raw.strip():
            return json.loads(raw)
        return [
            {"algorithm": "RSA-2048", "key_length": 2048, "scanner": "tls"},
            {"algorithm": "AES-256", "key_length": 256, "scanner": "http"},
            {"algorithm": "ML-KEM-768", "scanner": "sbom"},
        ]
    return json.loads(Path(path).read_text())


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Analyse a RivicQ report with the Qiskit-aligned profile")
    parser.add_argument("report", nargs="?", default="-", help="JSON report path, or - for stdin")
    args = parser.parse_args(argv)
    result = score_findings(extract_findings(load_payload(args.report)))
    json.dump(result.to_dict(), sys.stdout, indent=2)
    sys.stdout.write("\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
