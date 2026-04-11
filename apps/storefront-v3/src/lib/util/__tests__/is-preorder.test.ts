import { isPreorder } from "../is-preorder"

describe("isPreorder", () => {
  it("returns true for enabled preorder variants with future dates", () => {
    expect(
      isPreorder({
        status: "enabled",
        available_date: "2999-01-01T00:00:00.000Z",
      })
    ).toBe(true)
  })

  it("returns false for disabled preorder variants", () => {
    expect(
      isPreorder({
        status: "disabled",
        available_date: "2999-01-01T00:00:00.000Z",
      })
    ).toBe(false)
  })

  it("returns false when the preorder date is missing or in the past", () => {
    expect(isPreorder(undefined)).toBe(false)
    expect(
      isPreorder({
        status: "enabled",
        available_date: "2000-01-01T00:00:00.000Z",
      })
    ).toBe(false)
  })
})
