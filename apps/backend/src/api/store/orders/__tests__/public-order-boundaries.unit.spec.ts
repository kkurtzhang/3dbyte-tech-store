import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("public order API boundaries", () => {
  it("does not expose tracking or lookup data through GET routes", () => {
    const ordersDirectory = resolve(__dirname, "..");
    const lookupSource = readFileSync(
      resolve(ordersDirectory, "lookup/route.ts"),
      "utf8",
    );

    expect(existsSync(resolve(ordersDirectory, "[id]/tracking/route.ts"))).toBe(
      false,
    );
    expect(lookupSource).toMatch(/export const POST/);
    expect(lookupSource).not.toMatch(/export const GET/);
  });
});
