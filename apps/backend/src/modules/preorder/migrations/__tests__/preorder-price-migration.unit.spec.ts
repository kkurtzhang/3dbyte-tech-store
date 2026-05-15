import { Migration20260403113000 } from "../Migration20260403113000";

describe("Migration20260403113000", () => {
  it("guards product pricing backfill when core Medusa pricing tables are absent", async () => {
    const migration = new Migration20260403113000();
    const statements: string[] = [];

    (migration as unknown as { addSql: (sql: string) => void }).addSql = (
      sql
    ) => {
      statements.push(sql);
    };

    await migration.up();

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
