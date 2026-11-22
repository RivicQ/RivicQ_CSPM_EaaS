import unittest

from .analyse import extract_findings
from .pipeline import score_findings


class AnalyseTests(unittest.TestCase):
    def test_extract_findings_normalises_camel_case(self):
        payload = {
            "findings": [
                {"algorithm": "RSA-2048", "keyLength": 2048, "scanner": "tls"},
                {"algorithm": "ML-KEM-768", "quantumSafe": True, "scanner": "sbom"},
            ]
        }
        findings = extract_findings(payload)
        self.assertEqual(findings[0]["key_length"], 2048)
        self.assertTrue(findings[1]["quantum_safe"])
        result = score_findings(findings)
        self.assertEqual(result.shor_vulnerable, 1)
        self.assertEqual(result.pqc_ready, 1)

    def test_extract_findings_accepts_report_list(self):
        findings = extract_findings([{"algorithm": "AES-256", "key_length": 256}])
        self.assertEqual(len(findings), 1)
        self.assertEqual(score_findings(findings).grover_affected, 1)


if __name__ == "__main__":
    unittest.main()
