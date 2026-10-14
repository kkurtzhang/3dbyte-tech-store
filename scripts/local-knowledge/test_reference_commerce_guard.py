"""A simulated local variant price/quantity cannot become a live commerce answer."""

import json
import unittest
from local_store import Store, canonical
from retrieval import Retriever


class CommerceTests(unittest.TestCase):
    def test_simulated_values_do_not_supply_live_facts(self):
        store = Store()
        try:
            row = store.db.execute(
                "SELECT id,payload FROM local_reference_variants WHERE group_key='five_E04'"
            ).fetchone()
            payload = json.loads(row["payload"])
            payload.update(
                {
                    "price": "123.45",
                    "physical_stock": 77,
                    "simulated_initial_quantity": 20,
                }
            )
            store.db.execute("SAVEPOINT simulated_price_guard")
            try:
                store.db.execute(
                    "UPDATE local_reference_variants SET payload=? WHERE id=?",
                    (canonical(payload), row["id"]),
                )
                output = Retriever(store).answer(
                    "What is my store price and can PA6-CF20 ship to Sydney today?"
                )
                self.assertEqual(output["status"], "unknown")
                self.assertEqual(output["reason"], "commerce_not_verified")
                self.assertNotIn("123.45", output["answer"])
                self.assertNotIn("77", output["answer"])
            finally:
                store.db.execute("ROLLBACK TO simulated_price_guard")
                store.db.execute("RELEASE simulated_price_guard")
            self.assertEqual(
                store.db.execute(
                    "SELECT payload FROM local_reference_variants WHERE id=?",
                    (row["id"],),
                ).fetchone()[0],
                row["payload"],
            )
        finally:
            store.close()


if __name__ == "__main__":
    unittest.main()
