"""Qiskit-aligned scoring pipeline for RivicQ.

Production scoring lives in Go: ``internal/quantum/qiskitprofile``.
This module is the educational Python companion:

* Default path — the same Shor / Grover / NIST PQC taxonomy, classically.
* Optional path — Qiskit Aer circuits when ``qiskit`` is installed.
* Never claims IBM Quantum hardware. Runtime / IBM Cloud is Enterprise opt-in
  in Go (``internal/quantum/ibmquantum``) and is not invoked here.
"""

from __future__ import annotations

import json
import math
from dataclasses import asdict, dataclass, field
from typing import Any, Iterable

ENGINE = "rivicq-qiskit-profile"
BACKEND_LOCAL = "local-classical"
BACKEND_AER = "qiskit-aer-simulator"
METHOD = (
    "Qiskit-aligned attack-class scoring (Shor / Grover / NIST PQC). "
    "Not a hardware quantum measurement."
)

ATTACK_SHOR = "shor"
ATTACK_GROVER = "grover"
ATTACK_PQC = "pqc"
ATTACK_NONE = "none"


@dataclass
class AlgorithmScore:
    algorithm: str
    attack_class: str
    qiskit_family: str
    quantum_safe: bool
    migration: str = ""
    estimated_logical_qubits: str = ""
    note: str = ""


@dataclass
class PipelineResult:
    engine: str = ENGINE
    backend: str = BACKEND_LOCAL
    method: str = METHOD
    estate_score: int = 0
    shor_vulnerable: int = 0
    grover_affected: int = 0
    pqc_ready: int = 0
    unclassified: int = 0
    algorithms: list[AlgorithmScore] = field(default_factory=list)
    resources: dict[str, bool] = field(
        default_factory=lambda: {
            "tls": False,
            "http": False,
            "ssh": False,
            "sbom": False,
            "github": False,
        }
    )
    aer_available: bool = False
    note: str = (
        "Local classical profile aligned to Qiskit's Shor/Grover/PQC taxonomy. "
        "IBM Quantum Runtime is not invoked."
    )

    def to_dict(self) -> dict[str, Any]:
        data = asdict(self)
        return data


def classify(algorithm: str, key_length: int = 0) -> AlgorithmScore:
    a = (algorithm or "").upper().strip()
    score = AlgorithmScore(
        algorithm=algorithm,
        attack_class=ATTACK_NONE,
        qiskit_family="unclassified",
        quantum_safe=False,
    )
    if not a or a == "UNKNOWN":
        return score
    if any(
        token in a
        for token in (
            "ML-KEM",
            "KYBER",
            "ML-DSA",
            "DILITHIUM",
            "SLH-DSA",
            "SPHINCS",
            "FALCON",
            "HYBRID",
        )
    ):
        return AlgorithmScore(
            algorithm=algorithm,
            attack_class=ATTACK_PQC,
            qiskit_family="nist_pqc",
            quantum_safe=True,
            migration="Already on a NIST PQC (or hybrid) primitive",
            note="FIPS 203/204/205 class — not Shor-vulnerable",
        )
    if (
        "RSA" in a
        or ("DSA" in a and "ECDSA" not in a and "ML-DSA" not in a)
        or "DH" in a
        or "ECDH" in a
        or "ECDSA" in a
        or "ECDHE" in a
        or "P-256" in a
        or "P-384" in a
        or "SECP" in a
        or "ED25519" in a
        or "EDDSA" in a
        or "CURVE25519" in a
        or "X25519" in a
    ):
        return AlgorithmScore(
            algorithm=algorithm,
            attack_class=ATTACK_SHOR,
            qiskit_family="shor",
            quantum_safe=False,
            migration=(
                "Hybrid classical + ML-KEM (KEM) and/or ML-DSA (signatures); "
                "SLH-DSA where stateless hash signatures are required"
            ),
            estimated_logical_qubits="order-of-magnitude public estimates only (not a device run)",
            note="Shor's algorithm — public-key integer-factor / discrete-log family",
        )
    if any(token in a for token in ("MD5", "SHA-1", "SHA1", "RC4", "3DES", "DES")):
        return AlgorithmScore(
            algorithm=algorithm,
            attack_class=ATTACK_GROVER,
            qiskit_family="broken_classical",
            quantum_safe=False,
            migration="Replace immediately (broken classically); do not wait for PQC",
            note="Broken or legacy even without a quantum computer",
        )
    if any(token in a for token in ("AES", "SHA", "HMAC", "CHACHA", "POLY1305")):
        grover_safe = (
            key_length >= 256
            or "SHA-384" in a
            or "SHA-512" in a
            or "SHA3-256" in a
            or "SHA3-512" in a
        )
        return AlgorithmScore(
            algorithm=algorithm,
            attack_class=ATTACK_GROVER,
            qiskit_family="grover",
            quantum_safe=grover_safe,
            migration="Use AES-256 / SHA-384+ so Grover still leaves classical-equivalent security",
            note="Grover's algorithm reduces symmetric/hash security roughly in half (query model)",
        )
    score.note = "Not mapped to a Qiskit attack class"
    return score


def grover_iterations(key_bits: int) -> int:
    """Query-model Grover iteration estimate: π/4 · 2^(n/2). Not a hardware run."""
    if key_bits <= 0:
        return 0
    return int((math.pi / 4.0) * (2 ** (key_bits / 2.0)))


def aer_available() -> bool:
    try:
        import qiskit  # noqa: F401

        return True
    except Exception:
        return False


def educational_aer_demo() -> dict[str, Any]:
    """Tiny Bell-state circuit on Aer. Educational only — not an attack simulation."""
    try:
        from qiskit import QuantumCircuit
        from qiskit_aer import AerSimulator
    except Exception as exc:  # pragma: no cover - optional dependency
        return {
            "available": False,
            "backend": BACKEND_LOCAL,
            "error": str(exc),
            "note": "Install qiskit and qiskit-aer for the educational simulator path.",
        }
    circuit = QuantumCircuit(2, 2)
    circuit.h(0)
    circuit.cx(0, 1)
    circuit.measure([0, 1], [0, 1])
    simulator = AerSimulator()
    result = simulator.run(circuit, shots=256).result()
    return {
        "available": True,
        "backend": BACKEND_AER,
        "counts": dict(result.get_counts()),
        "note": "Bell-state demo on a local Aer simulator. Not IBM Quantum hardware.",
    }


def score_findings(findings: Iterable[dict[str, Any]]) -> PipelineResult:
    seen: dict[str, AlgorithmScore] = {}
    result = PipelineResult(aer_available=aer_available())
    if result.aer_available:
        result.backend = BACKEND_AER
        result.note += " Qiskit is installed; Aer may be used for educational circuits only."
    for item in findings:
        scanner = str(item.get("scanner") or "").lower()
        if scanner:
            result.resources[scanner] = True
        algorithm = str(item.get("algorithm") or "")
        key = algorithm.upper().strip()
        if not key or key in seen:
            continue
        classified = classify(algorithm, int(item.get("key_length") or 0))
        if item.get("quantum_safe") and classified.attack_class != ATTACK_PQC:
            classified.quantum_safe = bool(item.get("quantum_safe"))
        seen[key] = classified
        result.algorithms.append(classified)
        if classified.attack_class == ATTACK_SHOR:
            result.shor_vulnerable += 1
        elif classified.attack_class == ATTACK_GROVER:
            result.grover_affected += 1
        elif classified.attack_class == ATTACK_PQC:
            result.pqc_ready += 1
        else:
            result.unclassified += 1
    score = 100 - result.shor_vulnerable * 12 - result.grover_affected * 4 + result.pqc_ready * 6
    result.estate_score = max(0, min(100, score))
    return result


def pipeline_json(findings: Iterable[dict[str, Any]]) -> str:
    return json.dumps(score_findings(findings).to_dict(), indent=2)


if __name__ == "__main__":
    demo = score_findings(
        [
            {"algorithm": "RSA-2048", "key_length": 2048, "scanner": "tls"},
            {"algorithm": "AES-256", "key_length": 256, "scanner": "http"},
            {"algorithm": "ML-KEM-768", "scanner": "sbom"},
        ]
    )
    print(json.dumps(demo.to_dict(), indent=2))
    print("estate", demo.estate_score, "aer", demo.aer_available)
