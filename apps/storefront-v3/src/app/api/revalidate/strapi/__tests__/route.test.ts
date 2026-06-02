jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
  revalidateTag: jest.fn(),
}))

jest.mock("next/server", () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) =>
      ({
        status: init?.status ?? 200,
        json: async () => body,
      }),
  },
}))

const { revalidatePath, revalidateTag } = jest.requireMock("next/cache")
const { POST } = jest.requireActual("../route")

function buildRequest({
  body,
  secret,
  headerName = "x-strapi-webhook-secret",
}: {
  body?: unknown
  secret?: string
  headerName?: string
}) {
  const headers = new Headers({
    "Content-Type": "application/json",
  })

  if (secret) {
    headers.set(headerName, secret)
  }

  return {
    headers,
    json: async () => body ?? {},
  } as Request
}

describe("POST /api/revalidate/strapi", () => {
  const originalSecret = process.env.STRAPI_WEBHOOK_REVALIDATION_SECRET

  beforeEach(() => {
    process.env.STRAPI_WEBHOOK_REVALIDATION_SECRET = "secret-token"
    revalidatePath.mockReset()
    revalidateTag.mockReset()
  })

  afterAll(() => {
    if (originalSecret === undefined) {
      delete process.env.STRAPI_WEBHOOK_REVALIDATION_SECRET
      return
    }

    process.env.STRAPI_WEBHOOK_REVALIDATION_SECRET = originalSecret
  })

  it("rejects requests when the webhook secret is not configured", async () => {
    delete process.env.STRAPI_WEBHOOK_REVALIDATION_SECRET

    const response = await POST(buildRequest({ secret: "secret-token" }))
    const body = await response.json()

    expect(response.status).toBe(503)
    expect(body).toEqual({ revalidated: false, error: "Revalidation is not configured." })
    expect(revalidateTag).not.toHaveBeenCalled()
  })

  it("rejects requests with a missing or invalid secret", async () => {
    const response = await POST(buildRequest({ secret: "wrong-token" }))
    const body = await response.json()

    expect(response.status).toBe(401)
    expect(body).toEqual({ revalidated: false, error: "Unauthorized." })
    expect(revalidateTag).not.toHaveBeenCalled()
  })

  it("revalidates homepage tags for a valid Strapi homepage webhook", async () => {
    const response = await POST(
      buildRequest({
        secret: "secret-token",
        body: {
          model: "api::homepage.homepage",
          event: "entry.update",
        },
      })
    )
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual({
      revalidated: true,
      tags: ["homepage", "homepage-announcements"],
      paths: ["/"],
    })
    expect(revalidateTag).toHaveBeenCalledWith("homepage", "max")
    expect(revalidateTag).toHaveBeenCalledWith("homepage-announcements", "max")
    expect(revalidatePath).toHaveBeenCalledWith("/")
  })

  it("accepts the legacy x-webhook-secret header and ignores disallowed tags", async () => {
    const response = await POST(
      buildRequest({
        secret: "secret-token",
        headerName: "x-webhook-secret",
        body: {
          tags: ["homepage", "admin-users"],
        },
      })
    )
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual({
      revalidated: true,
      tags: ["homepage"],
      paths: ["/"],
    })
    expect(revalidateTag).toHaveBeenCalledTimes(1)
    expect(revalidateTag).toHaveBeenCalledWith("homepage", "max")
  })
})
