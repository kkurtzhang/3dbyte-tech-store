"""Source-condition retrieval regressions on actual local records."""

import unittest
from local_store import Store
from retrieval import Retriever
from nozzle_conditions import nozzle_family


class NozzleTests(unittest.TestCase):
    def test_explicit_family_parser(self):
        self.assertEqual(
            nozzle_family("E3D Revo brass nozzle maximum temperature"), "revo_brass"
        )
        self.assertEqual(
            nozzle_family("E3D V6 hardened steel 1.75mm nozzle 400 C"),
            "v6_hardened_175",
        )
        self.assertIsNone(nozzle_family("Do V6 Pro socks fit all hotends?"))

    def test_actual_claim_conditions_and_limits(self):
        store = Store()
        try:
            retriever = Retriever(store)
            revo = retriever.answer(
                "What maximum temperature does E3D give for its Revo brass nozzle?"
            )
            self.assertEqual(revo["status"], "source_grounded_context")
            selected = [c for c in revo["context_pack"] if c["scope_conditions"]]
            self.assertTrue(selected)
            self.assertTrue(
                all(
                    c["scope_conditions"]["nozzle_family"] == "revo_brass"
                    for c in selected
                )
            )
            self.assertIn("300°C", revo["answer"])
            self.assertNotIn("500°C", revo["answer"])
            for question in [
                "Can the E3D V6 hardened steel 1.75mm nozzle print abrasive filament at 400 C?",
                "Can an E3D Revo brass nozzle operate at 350 C?",
            ]:
                response = retriever.answer(question)
                self.assertEqual(response["status"], "limited")
                self.assertEqual(response["reason"], "above_named_nozzle_condition")
                self.assertTrue(
                    all(store.cite(c) for c in response["rating_citations"])
                )
        finally:
            store.close()


if __name__ == "__main__":
    unittest.main()
