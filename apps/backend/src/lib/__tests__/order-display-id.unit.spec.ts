import { generateOrderCustomDisplayId } from "../order-display-id";

describe("generateOrderCustomDisplayId", () => {
  it("generates a 3D Byte Tech order reference from a millisecond timestamp", () => {
    expect(generateOrderCustomDisplayId(1777978800123)).toBe(
      "3DB-1777978800123",
    );
  });
});
