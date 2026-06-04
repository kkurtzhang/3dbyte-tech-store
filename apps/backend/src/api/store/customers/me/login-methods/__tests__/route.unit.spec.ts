import { Modules } from "@medusajs/framework/utils";

import { GET } from "../route";

function createResponse() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  };
}

describe("GET /store/customers/me/login-methods", () => {
  it("requires an authenticated customer", async () => {
    const res = createResponse();

    await GET({ auth_context: undefined } as never, res as never);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: "Unauthorized" });
  });

  it("returns every login provider linked to the authenticated customer", async () => {
    const authModule = {
      listAuthIdentities: jest.fn().mockResolvedValue([
        {
          id: "auth_email",
          app_metadata: { customer_id: "cus_123" },
          provider_identities: [{ provider: "emailpass" }],
        },
        {
          id: "auth_google",
          app_metadata: { customer_id: "cus_123" },
          provider_identities: [{ provider: "google" }],
        },
      ]),
    };
    const req = {
      auth_context: { actor_id: "cus_123" },
      scope: {
        resolve: jest.fn((key: string) => {
          if (key === Modules.AUTH) return authModule;
          throw new Error(`Unexpected module ${key}`);
        }),
      },
    };
    const res = createResponse();

    await GET(req as never, res as never);

    expect(authModule.listAuthIdentities).toHaveBeenCalledWith(
      { app_metadata: { customer_id: "cus_123" } },
      expect.objectContaining({ relations: ["provider_identities"] }),
    );
    expect(res.json).toHaveBeenCalledWith({
      login_methods: {
        emailpass: true,
        google: true,
        providers: ["emailpass", "google"],
      },
    });
  });

  it("falls back to local customer filtering if metadata filtering is unavailable", async () => {
    const authModule = {
      listAuthIdentities: jest
        .fn()
        .mockRejectedValueOnce(new Error("Unsupported filter"))
        .mockResolvedValueOnce([
          {
            id: "auth_google",
            app_metadata: { customer_id: "cus_123" },
            provider_identities: [{ provider: "google" }],
          },
          {
            id: "auth_other",
            app_metadata: { customer_id: "cus_other" },
            provider_identities: [{ provider: "emailpass" }],
          },
        ]),
    };
    const req = {
      auth_context: { actor_id: "cus_123" },
      scope: {
        resolve: jest.fn((key: string) => {
          if (key === Modules.AUTH) return authModule;
          throw new Error(`Unexpected module ${key}`);
        }),
      },
    };
    const res = createResponse();

    await GET(req as never, res as never);

    expect(authModule.listAuthIdentities).toHaveBeenNthCalledWith(
      2,
      {},
      expect.objectContaining({ relations: ["provider_identities"] }),
    );
    expect(res.json).toHaveBeenCalledWith({
      login_methods: {
        emailpass: false,
        google: true,
        providers: ["google"],
      },
    });
  });
});
