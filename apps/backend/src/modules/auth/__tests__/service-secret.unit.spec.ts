import { readFileSync } from "node:fs";
import path from "node:path";

describe("AuthModuleService secret handling", () => {
  it("does not fall back to the development JWT secret in service code", () => {
    const source = readFileSync(
      path.resolve(__dirname, "../service.ts"),
      "utf8",
    );

    expect(source).toContain("resolveRuntimeSecret");
    expect(source).not.toContain('process.env.JWT_SECRET || "supersecret"');
  });
});
