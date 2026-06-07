import { Modules } from "@medusajs/framework/utils";

import { ACCOUNT_COORDINATION_MODULE } from "../../../../../../modules/account-coordination";
import { hashOpaqueValue } from "../../../../../../modules/account-coordination/security";
import { POST } from "../route";

function createResponse() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  };
}

describe("POST /store/customers/me/google-link-intents", () => {
  const originalEnv = process.env;
  const nonce = "gS9OZL6f9aEFdH9qbtgV-qYziGC0d6Lu_Vo93JOEMkI";

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = {
      ...originalEnv,
      CUSTOMER_ACCOUNT_COORDINATION_SECRET: "coordination-secret",
    };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("requires an authenticated customer", async () => {
    const res = createResponse();

    await POST({ auth_context: undefined } as never, res as never);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: "Unauthorized" });
  });

  it("creates a one-time customer-bound intent and stores only the nonce hash", async () => {
    const customerModule = {
      retrieveCustomer: jest.fn().mockResolvedValue({
        id: "cus_123",
        email: " Customer@Example.com ",
      }),
    };
    const existingIntent = {
      id: "oli_old",
      customer_id: "cus_123",
      status: "pending",
    };
    const createdIntent = {
      id: "oli_new",
      customer_id: "cus_123",
      expected_email: "customer@example.com",
      nonce_hash: hashOpaqueValue(nonce, "coordination-secret"),
      status: "pending",
      expires_at: new Date("2026-06-07T12:10:00.000Z"),
    };
    const coordinationModule = {
      listOAuthLinkIntents: jest.fn().mockResolvedValue([existingIntent]),
      updateOAuthLinkIntents: jest.fn().mockResolvedValue(existingIntent),
      createOAuthLinkIntents: jest.fn().mockResolvedValue(createdIntent),
      createAccountSecurityEvents: jest.fn().mockResolvedValue({
        id: "ase_123",
      }),
    };
    const req = {
      auth_context: { actor_id: "cus_123" },
      validatedBody: { nonce },
      scope: {
        resolve: jest.fn((key: string) => {
          if (key === Modules.CUSTOMER) return customerModule;
          if (key === ACCOUNT_COORDINATION_MODULE) return coordinationModule;
          throw new Error(`Unexpected module ${key}`);
        }),
      },
    };
    const res = createResponse();
    jest.useFakeTimers().setSystemTime(new Date("2026-06-07T12:00:00.000Z"));

    await POST(req as never, res as never);

    expect(coordinationModule.updateOAuthLinkIntents).toHaveBeenCalledWith({
      id: "oli_old",
      status: "superseded",
      last_failure_reason: "superseded_by_new_intent",
    });
    expect(coordinationModule.createOAuthLinkIntents).toHaveBeenCalledWith({
      customer_id: "cus_123",
      expected_email: "customer@example.com",
      nonce_hash: hashOpaqueValue(nonce, "coordination-secret"),
      status: "pending",
      expires_at: new Date("2026-06-07T12:10:00.000Z"),
    });
    expect(
      coordinationModule.createOAuthLinkIntents.mock.calls[0][0],
    ).not.toHaveProperty("nonce");
    expect(coordinationModule.createAccountSecurityEvents).toHaveBeenCalledWith(
      expect.objectContaining({
        customer_id: "cus_123",
        event_type: "google_link_intent.created",
        provider: "google",
      }),
    );
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      intent_id: "oli_new",
      expires_at: createdIntent.expires_at,
    });

    jest.useRealTimers();
  });
});
