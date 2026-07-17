import {
  createOrderAccessToken,
  verifyOrderAccessToken,
} from "../token"

const secret = "test-order-access-secret-that-is-at-least-32-bytes"
const now = new Date("2026-07-17T08:00:00.000Z").getTime()

describe("order access tokens", () => {
  it("authorizes only the order encoded in the signed token", () => {
    const token = createOrderAccessToken({
      orderId: "order_123",
      secret,
      now,
      ttlSeconds: 900,
    })

    expect(
      verifyOrderAccessToken({ token, orderId: "order_123", secret, now })
    ).toBe(true)
    expect(
      verifyOrderAccessToken({ token, orderId: "order_456", secret, now })
    ).toBe(false)
  })

  it("rejects tampered and expired tokens", () => {
    const token = createOrderAccessToken({
      orderId: "order_123",
      secret,
      now,
      ttlSeconds: 60,
    })
    const tamperedToken = `${token.slice(0, -1)}${token.endsWith("a") ? "b" : "a"}`

    expect(
      verifyOrderAccessToken({
        token: tamperedToken,
        orderId: "order_123",
        secret,
        now,
      })
    ).toBe(false)
    expect(
      verifyOrderAccessToken({
        token,
        orderId: "order_123",
        secret,
        now: now + 61_000,
      })
    ).toBe(false)
  })
})
