import { generateOrderCustomDisplayId } from "../order-display-id";

describe("generateOrderCustomDisplayId", () => {
  it("generates a readable customer order reference", () => {
    expect(generateOrderCustomDisplayId()).toMatch(
      /^3DBO-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4}-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/,
    );
  });

  it("excludes ambiguous characters from the random segments", () => {
    const references = Array.from({ length: 100 }, () =>
      generateOrderCustomDisplayId(),
    );

    for (const reference of references) {
      const randomSegments = reference.replace(/^3DBO-/, "");

      expect(randomSegments).not.toMatch(/[OI01]/);
    }
  });
});
