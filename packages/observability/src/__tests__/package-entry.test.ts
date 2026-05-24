import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("package entrypoint", () => {
  it("points runtime consumers at built JavaScript output", () => {
    const packageJson = JSON.parse(
      readFileSync(join(__dirname, "../../package.json"), "utf8"),
    ) as {
      main?: string;
      types?: string;
    };

    expect(packageJson.main).toBe("./dist/index.js");
    expect(packageJson.types).toBe("./dist/index.d.ts");
  });
});
