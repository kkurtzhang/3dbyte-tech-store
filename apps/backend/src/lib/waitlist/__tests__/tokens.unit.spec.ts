import {
  createWaitlistManageToken,
  normalizeEmail,
  verifyWaitlistManageToken,
} from "../tokens"

describe("waitlist manage tokens", () => {
  it("normalizes emails for duplicate checks and token payloads", () => {
    expect(normalizeEmail("  Ava@Example.COM  ")).toBe("ava@example.com")
  })

  it("verifies signed waitlist manage tokens", () => {
    const token = createWaitlistManageToken({
      email: "Ava@Example.COM",
      secret: "test-secret",
      waitlistId: "wait_1",
    })

    expect(
      verifyWaitlistManageToken(token, {
        secret: "test-secret",
      })
    ).toEqual({
      email: "ava@example.com",
      waitlist_id: "wait_1",
    })
  })

  it("rejects tampered waitlist manage tokens", () => {
    const token = createWaitlistManageToken({
      email: "ava@example.com",
      secret: "test-secret",
      waitlistId: "wait_1",
    })

    expect(
      verifyWaitlistManageToken(`${token}tampered`, {
        secret: "test-secret",
      })
    ).toBeNull()
  })
})
