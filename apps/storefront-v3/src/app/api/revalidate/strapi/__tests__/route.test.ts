import { revalidatePath, revalidateTag } from "next/cache"

import { POST } from "../route"

jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
  revalidateTag: jest.fn(),
}))

jest.mock("next/server", () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      body,
    }),
  },
}))

describe("POST /api/revalidate/strapi", () => {
  const originalSecret = process.env.STRAPI_WEBHOOK_REVALIDATION_SECRET

  function createRequest(headers: Record<string, string>, body: Record<string, unknown>) {
    return {
      headers: new Headers(headers),
      json: jest.fn().mockResolvedValue(body),
    } as unknown as Request
  }

  beforeEach(() => {
    process.env.STRAPI_WEBHOOK_REVALIDATION_SECRET = "test-secret"
    jest.clearAllMocks()
  })

  afterAll(() => {
    process.env.STRAPI_WEBHOOK_REVALIDATION_SECRET = originalSecret
  })

  it("rejects requests with an invalid secret", async () => {
    const response = await POST(
      createRequest(
        {
          "content-type": "application/json",
        },
        {
          model: "homepage",
        }
      )
    )

    expect(response.status).toBe(401)
    expect(revalidateTag).not.toHaveBeenCalled()
    expect(revalidatePath).not.toHaveBeenCalled()
  })

  it("revalidates inferred homepage targets when the secret is valid", async () => {
    const response = await POST(
      createRequest(
        {
          "content-type": "application/json",
          "x-strapi-webhook-secret": "test-secret",
        },
        {
          model: "homepage",
        }
      )
    )

    expect(response.status).toBe(200)
    expect(revalidateTag).toHaveBeenCalledWith("homepage", "max")
    expect(revalidateTag).toHaveBeenCalledWith("homepage-announcements", "max")
    expect(revalidatePath).toHaveBeenCalledWith("/")
  })
})
