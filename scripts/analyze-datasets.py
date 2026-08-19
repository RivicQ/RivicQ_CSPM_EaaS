#!/usr/bin/env python3
"""Compare rivicq scan JSON against datasets/**/expected.json."""
from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BIN = ROOT / "bin" / "rivicq"


def load_expected() -> list[tuple[Path, dict]]:
    out = []
    for path in sorted((ROOT / "datasets").rglob("expected.json")):
        out.append((path, json.loads(path.read_text())))
    return out


def scan(source: str, include_fixtures: bool) -> dict:
    cmd = [str(BIN), "scan", str(ROOT / source), "--format", "json", "--fail-on", "NONE"]
    if include_fixtures:
        cmd.append("--include-fixtures")
    proc = subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True)
    text = proc.stdout.strip() or proc.stderr
    try:
        return json.loads(text[text.find("{") :])
    except json.JSONDecodeError as exc:
        raise SystemExit(f"scan failed for {source}: {proc.returncode}\n{text}\n{exc}") from exc


def blob(report: dict) -> str:
    return json.dumps(report).lower()


def evaluate(spec: dict, report: dict) -> list[str]:
    errors: list[str] = []
    body = blob(report)
    findings = report.get("findings") or report.get("Findings") or []
    n = len(findings) if isinstance(findings, list) else 0
    if n < int(spec.get("min_findings") or 0):
        errors.append(f"min_findings {spec['min_findings']} not met (got {n})")
    for needle in spec.get("must_match") or []:
        if needle.lower() not in body:
            errors.append(f"missing must_match {needle!r}")
    for needle in spec.get("must_not_match") or []:
        if needle.lower() in body:
            errors.append(f"hit must_not_match {needle!r}")
    gate = ((report.get("gate") or report.get("Gate") or {}).get("decision") or "").upper()
    if spec.get("max_block") and gate == "BLOCK":
        errors.append(f"known-good dataset BLOCKED ({gate})")
    return errors


def main() -> int:
    if not BIN.exists():
        print("bin/rivicq missing — run make build-rivicq", file=sys.stderr)
        return 2
    rows = load_expected()
    if not rows:
        print("no datasets found")
        return 1
    failed = 0
    print("RivicQ dataset analysis")
    print("======================")
    for path, spec in rows:
        source = spec.get("source") or str(path.parent.relative_to(ROOT))
        include = bool(spec.get("include_fixtures", True if spec.get("source", "").startswith("fixtures/") else False))
        report = scan(source, include)
        errors = evaluate(spec, report)
        status = "PASS" if not errors else "FAIL"
        if errors:
            failed += 1
        print(f"{status:4}  {spec.get('id', path)}  ({source})")
        for err in errors:
            print(f"      - {err}")
    print(f"\n{len(rows) - failed}/{len(rows)} datasets passed")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
