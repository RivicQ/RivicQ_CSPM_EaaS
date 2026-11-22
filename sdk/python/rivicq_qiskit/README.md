# RivicQ Qiskit pipeline (Python)

Production scoring is the Go package `internal/quantum/qiskitprofile`, wired
into `GET /api/v1/scans/:id/intelligence` and `GET /api/v1/scans/:id/qiskit`.

This directory is the **educational** Python companion:

| Path | What it does | What it does not do |
|---|---|---|
| Default (`score_findings`) | Same Shor / Grover / NIST PQC taxonomy as Go | Invoke IBM Quantum |
| Optional `qiskit` + `qiskit-aer` | Local Aer Bell-state demo | Claim a cryptographic break |
| IBM Quantum Runtime | Enterprise Go provider, opt-in API key | Required for website or CBOM scans |

```bash
python3 -m pip install -e sdk/python
make quantum-test
make quantum-analyse
make quantum-analyse QUANTUM_REPORT=reports/security/rivicq-scan.json
```

```python
from rivicq_qiskit import classify, score_findings

print(classify("RSA-2048", 2048).attack_class)  # shor
print(score_findings([
    {"algorithm": "RSA", "scanner": "tls"},
    {"algorithm": "ML-KEM", "scanner": "sbom"},
]).estate_score)
```

Install Aer only if you want the educational simulator:

```bash
make quantum-setup-full
```
