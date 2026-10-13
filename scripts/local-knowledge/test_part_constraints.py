"""Regressions for public part identity and unresolved source specifications."""

import unittest
from query_constraints import part_reference_groups, requested_part_fields


class PartConstraints(unittest.TestCase):
    def test_only_supported_exact_public_identity_resolves(self):
        claims = [
            {"group_key": "prior_R01", "status": "supported", "value": "4007010136"},
            {"group_key": "prior_R02", "status": "unknown", "value": "4007010137"},
            {"group_key": None, "status": "supported", "value": "4007010138"},
        ]
        self.assertEqual(
            part_reference_groups("Part 4007010136 versus 4007010137", claims),
            ["prior_R01"],
        )
        self.assertEqual(part_reference_groups("Serial 14007010136", claims), [])

    def test_comparison_preserves_multiple_identity_scopes(self):
        claims = [
            {"group_key": key, "status": "supported", "value": value}
            for key, value in [("prior_R01", "4007010136"), ("prior_R03", "4001040056")]
        ]
        self.assertEqual(
            part_reference_groups("4007010136 and 4001040056", claims),
            ["prior_R01", "prior_R03"],
        )

    def test_electrical_request_is_separate_from_component_material(self):
        self.assertEqual(
            requested_part_fields("What voltage and heater wattage are verified?"),
            ["voltage_v", "heater_power_w"],
        )
        self.assertEqual(
            requested_part_fields(
                "Does the copper body establish maximum operating temperature and heater power?"
            ),
            ["heater_power_w", "max_operating_temperature_c"],
        )
        self.assertEqual(requested_part_fields("What is the nozzle tip material?"), [])


if __name__ == "__main__":
    unittest.main()
