const {
  assertStagingSimulationRuntime,
  buildStockSimulationPlan,
  attachSimulationMetadata,
} = require("../../../scripts/catalogue-simulation.cjs");
const {
  verifyCatalogueSimulationRuntime,
} = require("../../../scripts/guard-catalogue-simulation.cjs");

const staging = {
  APP_ENV: "staging",
  STRIPE_SECRET_KEY: "sk_test_fixture",
  NEXT_PUBLIC_STRIPE_KEY: "pk_test_fixture",
  MEDUSA_BACKEND_URL: "https://api.staging.3dbytetech.com.au",
  STORE_CORS: "https://store.staging.3dbytetech.com.au",
  DATABASE_URL: "postgresql://localhost/test_fixture",
};
const references = ["hotend", "plate", "filament", "dryer"].map(
  (reference_id) => ({ reference_id, packet_sha256: "a".repeat(64) }),
);

describe("staging stock simulation isolation", () => {
  it("requires explicit staging target and both Stripe keys in test mode", () => {
    expect(() => assertStagingSimulationRuntime(staging)).not.toThrow();
    for (const env of [
      { ...staging, APP_ENV: "production" },
      { ...staging, APP_ENV: undefined, NODE_ENV: "production" },
      { ...staging, STRIPE_SECRET_KEY: "sk_live_fixture" },
      { ...staging, NEXT_PUBLIC_STRIPE_KEY: "pk_live_fixture" },
      { ...staging, STRIPE_SECRET_KEY: undefined },
      { ...staging, MEDUSA_BACKEND_URL: "https://api.3dbytetech.com.au" },
      {
        ...staging,
        STORE_CORS: `${staging.STORE_CORS},https://store.3dbytetech.com.au`,
      },
    ])
      expect(() => assertStagingSimulationRuntime(env)).toThrow();
  });

  it("produces reproducible zero, low, and normal stock independent of input order", () => {
    const plan = buildStockSimulationPlan(references, "20261008-v1");
    expect(
      buildStockSimulationPlan([...references].reverse(), "20261008-v1"),
    ).toEqual(plan);
    expect(plan.entries).toHaveLength(4);
    expect(
      plan.entries.filter(
        (entry: { quantity: number }) => entry.quantity === 0,
      ),
    ).toHaveLength(1);
    expect(
      plan.entries.some(
        (entry: { quantity: number }) =>
          entry.quantity >= 1 && entry.quantity <= 4,
      ),
    ).toBe(true);
    expect(
      plan.entries.filter(
        (entry: { quantity: number }) =>
          entry.quantity >= 8 && entry.quantity <= 30,
      ),
    ).toHaveLength(2);
    expect(plan).toMatchObject({
      scope: "staging",
      real_stock: false,
      applied: false,
    });
  });

  it("rejects duplicate references, invalid hashes, seed and quantity inputs", () => {
    for (const input of [
      references.slice(0, 3),
      [...references.slice(0, 3), references[0]],
      [
        ...references.slice(0, 3),
        { reference_id: "dryer", packet_sha256: "bad" },
      ],
    ]) {
      expect(() => buildStockSimulationPlan(input, "seed")).toThrow();
    }
    expect(() => buildStockSimulationPlan(references, "")).toThrow();
  });

  it("preserves unrelated metadata and requires exact target binding before marking stock", () => {
    const entry = buildStockSimulationPlan(references, "seed").entries[0];
    const metadata = { ai_core: { product_kind: "hotend" }, keep: true };
    const binding = {
      product_id: "prod_fixture",
      variant_id: "variant_fixture",
      applied_at: "2026-10-08T00:00:00Z",
    };
    const marked = attachSimulationMetadata(metadata, entry, binding);
    expect(metadata).toEqual({
      ai_core: { product_kind: "hotend" },
      keep: true,
    });
    expect(marked).toMatchObject({
      ...metadata,
      catalogue_simulation: {
        real_stock: false,
        scope: "staging",
        product_id: "prod_fixture",
        variant_id: "variant_fixture",
        packet_sha256: "a".repeat(64),
      },
    });
    expect(attachSimulationMetadata(marked, entry, binding)).toEqual(marked);
    expect(() =>
      attachSimulationMetadata(metadata, entry, { ...binding, product_id: "" }),
    ).toThrow();
    expect(() =>
      attachSimulationMetadata(
        marked,
        { ...entry, quantity: entry.quantity + 1 },
        binding,
      ),
    ).toThrow();
    expect(
      attachSimulationMetadata(metadata, entry, {
        ...binding,
        scope: "production",
        real_stock: true,
      }),
    ).toMatchObject({
      catalogue_simulation: { scope: "staging", real_stock: false },
    });
  });

  function client(hasSimulation: boolean) {
    return {
      connect: jest.fn(),
      query: jest.fn(async (sql: string) => ({
        rows: sql.includes("has_simulation")
          ? [{ has_simulation: hasSimulation }]
          : [],
      })),
      end: jest.fn(),
    };
  }

  it("blocks production promotion of marked products or inventory through a read-only database check", async () => {
    const db = client(true);
    await expect(
      verifyCatalogueSimulationRuntime({
        env: { ...staging, APP_ENV: "production" },
        clientFactory: () => db,
      }),
    ).rejects.toThrow();
    expect(db.query).toHaveBeenCalledWith("BEGIN READ ONLY");
    expect(
      db.query.mock.calls.some(
        ([sql]: [string]) =>
          sql.includes("product") && sql.includes("inventory_item"),
      ),
    ).toBe(true);
    expect(db.end).toHaveBeenCalled();
  });

  it("allows staging simulation and leaves unmarked production catalogues usable", async () => {
    await expect(
      verifyCatalogueSimulationRuntime({
        env: staging,
        clientFactory: () => client(true),
      }),
    ).resolves.toEqual({ has_simulation: true, allowed: true });
    await expect(
      verifyCatalogueSimulationRuntime({
        env: { ...staging, APP_ENV: "production" },
        clientFactory: () => client(false),
      }),
    ).resolves.toEqual({ has_simulation: false, allowed: true });
  });

  it("fails closed without exposing database cleanup details", async () => {
    const db = client(false);
    db.end.mockRejectedValue(new Error("private connection detail"));
    await expect(
      verifyCatalogueSimulationRuntime({
        env: staging,
        clientFactory: () => db,
      }),
    ).rejects.toThrow("Catalogue simulation safety check failed");
  });

  it("fails closed on database failure, missing configuration or malformed probe results", async () => {
    const db = client(false);
    db.query.mockRejectedValue(new Error("private connection detail"));
    await expect(
      verifyCatalogueSimulationRuntime({
        env: staging,
        clientFactory: () => db,
      }),
    ).rejects.toThrow("Catalogue simulation safety check failed");
    expect(db.end).toHaveBeenCalled();
    await expect(
      verifyCatalogueSimulationRuntime({
        env: {},
        clientFactory: () => client(false),
      }),
    ).rejects.toThrow();
    const malformed = client(false);
    malformed.query.mockResolvedValue({ rows: [] });
    await expect(
      verifyCatalogueSimulationRuntime({
        env: staging,
        clientFactory: () => malformed,
      }),
    ).rejects.toThrow();
  });
});
