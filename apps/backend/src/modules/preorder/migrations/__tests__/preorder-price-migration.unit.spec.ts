import { Migration20260403113000 } from "../Migration20260403113000";

describe("Migration20260403113000", () => {
  it("guards product pricing backfill when core Medusa pricing tables are absent", async () => {
    const statements: string[] = [];
    // This migration only queues SQL; exercise it with a bounded SQL writer.
    await Migration20260403113000.prototype.up.call({
      addSql: (sql: string) => statements.push(sql),
    });

    const pricingBackfill = statements.find((statement) =>
      statement.includes('from "product_variant_price_set"')
    );

    expect(pricingBackfill).toContain(
      "to_regclass('public.product_variant_price_set')"
    );
    expect(pricingBackfill).toContain("to_regclass('public.price_set')");
    expect(pricingBackfill).toContain("to_regclass('public.price')");
  });
});
