import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("/webhooks/strapi", () => {
  it("does not expose a discovery GET handler", () => {
    const routeSource = readFileSync(resolve(__dirname, "../route.ts"), "utf8");

    expect(routeSource).toMatch(/export async function POST/);
    expect(routeSource).not.toMatch(/export async function GET/);
    expect(routeSource).not.toContain("X-Webhook-Secret\": process.env");
  });
});
