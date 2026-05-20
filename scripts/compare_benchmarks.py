#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path
from typing import Any

BENCHMARK_LINE = re.compile(
    r"^(?P<name>Benchmark.+?)-\d+\s+\d+\s+(?P<ns>[\d.]+)\s+ns/op(?:\s+(?P<b>[\d.]+)\s+B/op\s+(?P<allocs>[\d.]+)\s+allocs/op)?$"
)


def parse_benchmark_results(path: Path) -> dict[str, dict[str, float]]:
    results: dict[str, dict[str, float]] = {}
    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        match = BENCHMARK_LINE.match(line)
        if not match:
            continue

        current: dict[str, float] = {"ns_per_op": float(match.group("ns"))}
        if match.group("b") is not None:
            current["b_per_op"] = float(match.group("b"))
        if match.group("allocs") is not None:
            current["allocs_per_op"] = float(match.group("allocs"))

        results[match.group("name")] = current

    return results


def load_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def compare_metrics(
    current: dict[str, dict[str, float]],
    baseline: dict[str, dict[str, float]],
    threshold_percent: float,
) -> dict[str, Any]:
    report: dict[str, Any] = {
        "threshold_percent": threshold_percent,
        "benchmarks": {},
        "regressions": [],
    }

    for benchmark_name, baseline_metrics in baseline.items():
        current_metrics = current.get(benchmark_name)
        benchmark_report: dict[str, Any] = {
            "baseline": baseline_metrics,
            "current": current_metrics,
            "status": "pass",
        }

        if current_metrics is None:
            benchmark_report["status"] = "missing"
            report["regressions"].append(
                {
                    "benchmark": benchmark_name,
                    "metric": "benchmark",
                    "reason": "missing from current benchmark output",
                }
            )
            report["benchmarks"][benchmark_name] = benchmark_report
            continue

        for metric_name, baseline_value in baseline_metrics.items():
            current_value = current_metrics.get(metric_name)
            if current_value is None:
                continue

            allowed_max = baseline_value * (1 + threshold_percent / 100)
            delta_percent = ((current_value - baseline_value) / baseline_value * 100) if baseline_value else 0.0
            benchmark_report.setdefault("metrics", {})[metric_name] = {
                "baseline": baseline_value,
                "current": current_value,
                "delta_percent": round(delta_percent, 2),
            }

            if baseline_value > 0 and current_value > allowed_max:
                benchmark_report["status"] = "regression"
                report["regressions"].append(
                    {
                        "benchmark": benchmark_name,
                        "metric": metric_name,
                        "baseline": baseline_value,
                        "current": current_value,
                        "delta_percent": round(delta_percent, 2),
                        "allowed_increase_percent": threshold_percent,
                    }
                )

        report["benchmarks"][benchmark_name] = benchmark_report

    return report


def main() -> int:
    parser = argparse.ArgumentParser(description="Compare Go benchmark output against a baseline.")
    parser.add_argument("--input", required=True, type=Path, help="Path to benchmark results text file")
    parser.add_argument("--baseline", type=Path, help="Path to baseline JSON file")
    parser.add_argument("--output", type=Path, help="Optional JSON report output path")
    parser.add_argument(
        "--write-baseline",
        type=Path,
        help="Write a new baseline JSON file generated from the benchmark input",
    )
    parser.add_argument(
        "--threshold-percent",
        type=float,
        default=20.0,
        help="Allowed regression percentage before failing",
    )
    parser.add_argument(
        "--fail-on-regression",
        action="store_true",
        help="Exit with non-zero status when regressions are detected",
    )
    args = parser.parse_args()

    current_benchmarks = parse_benchmark_results(args.input)

    if args.write_baseline:
        baseline_payload = {
            "benchmarks": current_benchmarks,
        }
        args.write_baseline.write_text(json.dumps(baseline_payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")
        print(f"Wrote benchmark baseline to {args.write_baseline}")
        return 0

    if args.baseline is None:
        parser.error("--baseline is required unless --write-baseline is used")

    baseline_document = load_json(args.baseline)
    baseline_benchmarks = baseline_document.get("benchmarks", baseline_document)

    report = compare_metrics(current_benchmarks, baseline_benchmarks, args.threshold_percent)
    report["current_benchmarks"] = current_benchmarks
    report["baseline_source"] = str(args.baseline)
    report["input_source"] = str(args.input)
    report["passed"] = len(report["regressions"]) == 0

    if args.output:
        args.output.write_text(json.dumps(report, indent=2, sort_keys=True) + "\n", encoding="utf-8")

    if report["passed"]:
        print(f"Benchmark comparison passed against {args.baseline}")
        return 0

    print("Benchmark regression detected:", file=sys.stderr)
    for regression in report["regressions"]:
        reason = regression.get("reason")
        if reason:
            print(f"- {regression['benchmark']}: {reason}", file=sys.stderr)
            continue
        print(
            f"- {regression['benchmark']} {regression['metric']} increased by {regression['delta_percent']}% "
            f"(baseline {regression['baseline']}, current {regression['current']}, allowed +{regression['allowed_increase_percent']}%)",
            file=sys.stderr,
        )

    return 1 if args.fail_on_regression else 0


if __name__ == "__main__":
    raise SystemExit(main())
