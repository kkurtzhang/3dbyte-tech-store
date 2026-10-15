/** @jest-environment node */
import { POST } from "../support-ticket/route";
import {
  getSupportSession,
  withSupportSession,
  isSupportSameOrigin,
} from "../support-session";
import { checkRateLimit } from "@/lib/security/rate-limit";

jest.mock("@/lib/security/rate-limit", () => ({
  checkRateLimit: jest.fn(async () => ({ allowed: true })),
  getClientIp: () => "127.0.0.1",
}));
const fetchMock = jest.fn();
const id = "a".repeat(64);
const cookie = `__Host-assistant_support_session=${id}`;
const originalFetch = global.fetch;
const originalEnv = process.env;
function request(
  body: unknown,
  headers: Record<string, string | undefined> = {},
) {
  return new Request(
    "https://store.example.invalid/api/ai-shopping-assistant/support-ticket",
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "https://store.example.invalid",
        cookie,
        ...Object.fromEntries(
          Object.entries(headers).filter(
            (entry): entry is [string, string] => entry[1] !== undefined,
          ),
        ),
      },
      body: JSON.stringify(body),
    },
  );
}
beforeEach(() => {
  jest.clearAllMocks();
  global.fetch = fetchMock;
  process.env = {
    ...originalEnv,
    NEXT_PUBLIC_SITE_URL: "https://store.example.invalid",
    INTERNAL_API_TOKEN: "synthetic-internal",
    NEXT_PUBLIC_MEDUSA_BACKEND_URL: "http://127.0.0.1:9000",
  };
  fetchMock.mockResolvedValue(
    Response.json({ status: "confirmation_required", proposalId: id }),
  );
});
afterAll(() => {
  global.fetch = originalFetch;
  process.env = originalEnv;
});
it.each([
  { origin: "https://evil.example.invalid" },
  { origin: "" },
  { "sec-fetch-site": "cross-site" },
  { "content-type": "text/plain" },
])("rejects cross-origin/non-JSON confirmation %j", async (headers) => {
  expect(
    (await POST(request({ action: "preview", proposalId: id }, headers)))
      .status,
  ).toBe(403);
  expect(fetchMock).not.toHaveBeenCalled();
});
it("requires the HttpOnly session, never a client trace session", async () => {
  expect(
    (
      await POST(
        request(
          {
            action: "preview",
            proposalId: id,
            traceContext: { sessionId: id },
          },
          { cookie: "" },
        ),
      )
    ).status,
  ).toBe(409);
  expect(fetchMock).not.toHaveBeenCalled();
});
it.each([
  { action: "confirm", proposalId: id, confirmed: true },
  {
    action: "confirm",
    proposalId: id,
    receipt: id,
    digest: id,
    confirmed: true,
    email: "changed@example.invalid",
  },
  { action: "preview", proposalId: "invalid" },
])("rejects invalid confirmation shape %j", async (body) => {
  expect((await POST(request(body))).status).toBe(400);
  expect(fetchMock).not.toHaveBeenCalled();
});
it("forwards only the exact receipt request and server cookie-derived context", async () => {
  const req = request(
    {
      action: "confirm",
      proposalId: id,
      receipt: id,
      digest: id,
      confirmed: true,
    },
    { cookie: `${cookie}; _medusa_customer_token=synthetic-existing-token` },
  );
  const response = await POST(req);
  expect(response.headers.get("cache-control")).toBe("no-store");
  expect(fetchMock).toHaveBeenCalledWith(
    "http://127.0.0.1:9000/ai/support-ticket",
    expect.objectContaining({
      redirect: "error",
      cache: "no-store",
      headers: expect.objectContaining({
        authorization: "Bearer synthetic-existing-token",
        "x-3db-internal-token": "synthetic-internal",
        "x-3db-assistant-session": getSupportSession(req)!.context,
      }),
      body: JSON.stringify({
        proposalId: id,
        receipt: id,
        digest: id,
        confirmed: true,
      }),
    }),
  );
  expect(JSON.stringify(await response.json())).not.toContain(
    "synthetic-existing-token",
  );
});
it("binds cookie context to account changes and sets a secure HttpOnly session", () => {
  const guest = getSupportSession(request({}))!;
  const account = getSupportSession(
    request(
      {},
      { cookie: `${cookie}; _medusa_customer_token=synthetic-token` },
    ),
  )!;
  expect(guest.context).not.toBe(account.context);
  const req = request({}, { cookie: "" });
  const session = getSupportSession(req, true)!;
  const response = withSupportSession(new Response("stream"), req, session);
  expect(response.headers.get("set-cookie")).toContain(
    "HttpOnly; SameSite=Strict; Path=/; Max-Age=1800; Secure",
  );
  expect(
    withSupportSession(new Response("stream"), request({}), guest).headers.get(
      "set-cookie",
    ),
  ).toBeNull();
});
it("fails closed on rate limits, oversized bodies and backend failures without retrying", async () => {
  jest
    .mocked(checkRateLimit)
    .mockResolvedValueOnce({ allowed: false, retryAfterMs: 1000 });
  expect(
    (await POST(request({ action: "preview", proposalId: id }))).status,
  ).toBe(429);
  expect(
    (
      await POST(
        request({ action: "preview", proposalId: id, extra: "x".repeat(3000) }),
      )
    ).status,
  ).toBe(400);
  fetchMock.mockRejectedValueOnce(
    new Error("synthetic secret must not be exposed"),
  );
  const response = await POST(request({ action: "preview", proposalId: id }));
  expect(response.status).toBe(503);
  expect(JSON.stringify(await response.json())).not.toContain(
    "synthetic secret",
  );
  expect(fetchMock).toHaveBeenCalledTimes(1);
});
it("requires a configured production origin and rejects malformed/duplicate session cookies", () => {
  process.env = {
    ...process.env,
    NODE_ENV: "production",
    NEXT_PUBLIC_SITE_URL: "",
  };
  expect(isSupportSameOrigin(request({}))).toBe(false);
  expect(
    getSupportSession(request({}, { cookie: `${cookie}; ${cookie}` })),
  ).toBeNull();
  expect(
    getSupportSession(
      request({}, { cookie: "__Host-assistant_support_session=%invalid" }),
    ),
  ).toBeNull();
});
