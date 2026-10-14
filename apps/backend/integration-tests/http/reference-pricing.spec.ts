import path from "node:path";
import { createRequire } from "node:module";
import { moduleIntegrationTestRunner } from "@medusajs/test-utils";
import type { IPricingModuleService } from "@medusajs/framework/types";
import { calculateAmountsWithTax, Modules } from "@medusajs/framework/utils";

const runNativeFixture = process.env.REFERENCE_NATIVE_FIXTURE === "1";

if (runNativeFixture && process.env.DB_HOST !== "127.0.0.1") {
  throw new Error(
    "This integration test requires REFERENCE_NATIVE_FIXTURE=1 and an isolated loopback PostgreSQL fixture.",
  );
}

const resolveFromBackend = createRequire(
  path.join(process.cwd(), "package.json"),
);
const pricingExport = resolveFromBackend.resolve("@medusajs/medusa/pricing");
const pricingEntry = createRequire(pricingExport).resolve("@medusajs/pricing");
const plan =
  require("../../../../docs/hermes/fixtures/reference-offer-plan-2026-10-08.json") as {
    entries: Array<{
      reference_id: string;
      prices: Array<{ currency_code: string; amount: number }>;
    }>;
  };

// An isolated PostgreSQL fixture database only. This creates no native business
// product, source approval, inventory or offer, and calls no payment provider.
if (runNativeFixture) {
  moduleIntegrationTestRunner<IPricingModuleService>({
    moduleName: Modules.PRICING,
    resolve: path.dirname(pricingEntry),
    dbName: `reference_pricing_fixture_${process.pid}`,
    testSuite: ({ service }) => {
      describe("native AUD reference-price representation", () => {
        it("does not claim inclusive prices without a native preference", async () => {
          const priceSet = await service.createPriceSets({
            prices: [{ currency_code: "aud", amount: 58.45 }],
          });
          const [calculated] = await service.calculatePrices(
            { id: [priceSet.id] },
            { context: { currency_code: "aud" } },
          );
          expect(calculated.calculated_amount).toBe(58.45);
          expect(calculated.is_calculated_price_tax_inclusive).toBe(false);
        });

        it.each(plan.entries)(
          "retains the gross major-unit amount for $reference_id with explicit AUD inclusion",
          async (entry) => {
            await service.createPricePreferences({
              attribute: "currency_code",
              value: "aud",
              is_tax_inclusive: true,
            });
            const priceSet = await service.createPriceSets({
              prices: entry.prices,
            });
            const [calculated] = await service.calculatePrices(
              { id: [priceSet.id] },
              { context: { currency_code: "aud" } },
            );
            const amount = entry.prices[0].amount;
            expect(calculated.calculated_amount).toBe(amount);
            expect(calculated.is_calculated_price_tax_inclusive).toBe(true);
            expect(calculated.is_original_price_tax_inclusive).toBe(true);
            // 10% is a synthetic calculation fixture, not a live GST configuration.
            const totals = calculateAmountsWithTax({
              amount,
              includesTax: true,
              taxLines: [{ rate: 10 }],
            });
            expect(totals.priceWithTax).toBe(amount);
            expect(totals.priceWithoutTax).toBeCloseTo(amount / 1.1, 8);
          },
        );

        it("detects a conflicting region preference instead of trusting currency alone", async () => {
          await service.createPricePreferences([
            {
              attribute: "currency_code",
              value: "aud",
              is_tax_inclusive: true,
            },
            {
              attribute: "region_id",
              value: "reg_fixture",
              is_tax_inclusive: false,
            },
          ]);
          const priceSet = await service.createPriceSets({
            prices: [
              {
                currency_code: "aud",
                amount: 58.45,
                rules: { region_id: "reg_fixture" },
              },
            ],
          });
          const [calculated] = await service.calculatePrices(
            { id: [priceSet.id] },
            { context: { currency_code: "aud", region_id: "reg_fixture" } },
          );
          expect(calculated.calculated_amount).toBe(58.45);
          expect(calculated.is_calculated_price_tax_inclusive).toBe(false);
        });
      });
    },
  });
} else {
  it.skip("native AUD reference pricing requires REFERENCE_NATIVE_FIXTURE=1", () => {});
}
