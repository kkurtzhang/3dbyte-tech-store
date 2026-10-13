"""Regression for observed universal-compatibility and live-commerce intent misses."""

import unittest
from query_constraints import (
    universal_scope_requested,
    live_commerce_requested,
    nozzle_interchangeability_requested,
)


class ScopeTests(unittest.TestCase):
    def test_observed_universal_surface(self):
        self.assertTrue(
            universal_scope_requested(
                "Will Supergrip work on every brand of PEI-coated build surface?",
                "surface",
            )
        )

    def test_observed_universal_sock(self):
        self.assertTrue(
            universal_scope_requested(
                "Are V6 Pro socks compatible with all hotend models?", "hotend"
            )
        )

    def test_advice_is_not_a_universal_guarantee(self):
        self.assertFalse(
            universal_scope_requested(
                "Any tips for applying Supergrip to my PEI sheet?", "surface"
            )
        )
        self.assertFalse(
            universal_scope_requested(
                "What does E3D say about V6 Pro sock coverage?", "hotend"
            )
        )

    def test_current_price_and_shipping(self):
        self.assertTrue(
            live_commerce_requested(
                "Can you quote my store price and say whether PA6-CF20 can ship to Sydney today?"
            )
        )
        self.assertTrue(
            live_commerce_requested(
                "How much does it cost and can it dispatch tomorrow?"
            )
        )

    def test_material_properties_are_not_commerce(self):
        self.assertFalse(
            live_commerce_requested("What is a low-cost material for prototyping?")
        )
        self.assertFalse(
            live_commerce_requested(
                "Does drying improve the availability of moisture-free filament?"
            )
        )

    def test_unspecified_nozzle_interchangeability(self):
        self.assertTrue(
            nozzle_interchangeability_requested(
                "Are all hardened steel nozzles interchangeable with any K1 hotend?"
            )
        )
        self.assertTrue(
            nozzle_interchangeability_requested("Will any nozzle fit this hotend?")
        )
        self.assertFalse(
            nozzle_interchangeability_requested(
                "What does hardened nozzle mean for PA6-CF20?"
            )
        )


if __name__ == "__main__":
    unittest.main()
