import { POST } from "../route";

const originalResponse = globalThis.Response;

class TestResponse {
  readonly status: number;
  private readonly body: BodyInit | null;

  constructor(body: BodyInit | null, init?: ResponseInit) {
    this.body = body;
    this.status = init?.status ?? 200;
  }

  async text() {
    return typeof this.body === "string" ? this.body : "";
  }
}

function createRequest(body: unknown, init: RequestInit = {}) {
  const requestBody = typeof body === "string" ? body : JSON.stringify(body);

  return {
    headers: new Map(
      Object.entries({
      "content-type": "application/csp-report",
      ...init.headers,
      })
    ),
    text: async () => requestBody,
  } as unknown as Request;
}

describe("CSP report route", () => {
  const originalWarn = console.warn;

  beforeAll(() => {
    Object.defineProperty(globalThis, "Response", {
      configurable: true,
      value: TestResponse,
    });
  });

  afterAll(() => {
    Object.defineProperty(globalThis, "Response", {
      configurable: true,
      value: originalResponse,
    });
  });

  beforeEach(() => {
    console.warn = jest.fn();
  });

  afterEach(() => {
    console.warn = originalWarn;
  });

  it("accepts browser CSP reports without echoing response data", async () => {
    const response = await POST(
      createRequest({
        "csp-report": {
          "document-uri": "https://store.test/products/petg",
          "violated-directive": "script-src-elem",
          "blocked-uri": "https://evil.example/payload.js?token=secret",
        },
      })
    );

    expect(response.status).toBe(204);
    expect(await response.text()).toBe("");
    expect(console.warn).toHaveBeenCalledWith(
      "CSP report-only violation",
      expect.objectContaining({
        documentUri: "https://store.test/products/petg",
        violatedDirective: "script-src-elem",
        blockedUri: "https://evil.example",
      })
    );
  });

  it("drops oversized reports before parsing them", async () => {
    const response = await POST(createRequest("x".repeat(10_241)));

    expect(response.status).toBe(413);
    expect(console.warn).not.toHaveBeenCalled();
  });

  it("acknowledges malformed report payloads to avoid browser retry loops", async () => {
    const response = await POST(createRequest("{not-json"));

    expect(response.status).toBe(204);
    expect(console.warn).not.toHaveBeenCalled();
  });
});
