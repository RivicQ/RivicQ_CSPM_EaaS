import unittest

from sdk.python.rivicq_qiskit.pipeline import (
    ATTACK_PQC,
    ATTACK_SHOR,
    classify,
    grover_iterations,
    score_findings,
)


class QiskitPipelineTest(unittest.TestCase):
    def test_classify_rsa_shor(self):
        s = classify("RSA-2048", 2048)
        self.assertEqual(s.attack_class, ATTACK_SHOR)
        self.assertFalse(s.quantum_safe)

    def test_classify_mlkem_pqc(self):
        s = classify("ML-KEM-768")
        self.assertEqual(s.attack_class, ATTACK_PQC)
        self.assertTrue(s.quantum_safe)

    def test_estate_score(self):
        result = score_findings(
            [
                {"algorithm": "RSA", "key_length": 2048, "scanner": "tls"},
                {"algorithm": "ML-KEM", "scanner": "sbom"},
                {"algorithm": "AES-256", "key_length": 256, "scanner": "http"},
            ]
        )
        self.assertEqual(result.shor_vulnerable, 1)
        self.assertEqual(result.pqc_ready, 1)
        self.assertEqual(result.grover_affected, 1)
        self.assertTrue(0 < result.estate_score <= 100)
        self.assertTrue(result.resources["tls"])
        self.assertTrue(result.resources["http"])
        self.assertIn("Not a hardware", result.method)

    def test_grover_iterations_positive(self):
        self.assertGreater(grover_iterations(128), 0)
        self.assertEqual(grover_iterations(0), 0)


if __name__ == "__main__":
    unittest.main()
