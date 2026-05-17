import { GET } from "../route";
import { PUT } from "../profiles/[key]/route";
import { POST } from "../profiles/[key]/test/route";

function createResponse() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  };
}

function createRequest({
  body = {},
  emailSettingsModule,
  notificationModule,
  key = "order",
}: {
  body?: Record<string, unknown>;
  emailSettingsModule: Record<string, jest.Mock>;
  key?: string;
  notificationModule?: Record<string, jest.Mock>;
}) {
  return {
    body,
    params: { key },
    validatedBody: body,
    scope: {
      resolve: jest.fn((name: string) => {
        if (name === "emailSettings") {
          return emailSettingsModule;
        }
        if (name === "notification") {
          return notificationModule;
        }
        throw new Error(`Unexpected dependency ${name}`);
      }),
    },
  };
}

const profile = {
  key: "order",
  label: "Order Confirmations",
  from: "3D Byte Tech Orders <staging-order@3dbytetech.com.au>",
  reply_to: "support@3dbytetech.com.au",
};

describe("admin email settings routes", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    process.env.APP_ENV = "staging";
    process.env.RESEND_API_KEY = "re_test";
    process.env.RESEND_FROM_EMAIL =
      "3D Byte Tech <staging-no-reply@3dbytetech.com.au>";
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("returns runtime email settings state", async () => {
    const emailSettingsModule = {
      listResolvedSenderProfiles: jest.fn().mockResolvedValue([profile]),
    };
    const req = createRequest({ emailSettingsModule });
    const res = createResponse();

    await GET(req as never, res as never);

    expect(emailSettingsModule.listResolvedSenderProfiles).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({
      allowed_domain: "3dbytetech.com.au",
      environment: "staging",
      resend_configured: true,
      profiles: [profile],
    });
  });

  it("updates one sender profile", async () => {
    const emailSettingsModule = {
      upsertSenderProfile: jest.fn().mockResolvedValue(profile),
    };
    const req = createRequest({
      body: {
        from: profile.from,
        reply_to: profile.reply_to,
      },
      emailSettingsModule,
    });
    const res = createResponse();

    await PUT(req as never, res as never);

    expect(emailSettingsModule.upsertSenderProfile).toHaveBeenCalledWith(
      "order",
      {
        from: profile.from,
        reply_to: profile.reply_to,
      },
      process.env,
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ profile });
  });

  it("returns 404 for unsupported sender profile keys", async () => {
    const emailSettingsModule = {
      upsertSenderProfile: jest.fn(),
    };
    const req = createRequest({
      emailSettingsModule,
      key: "marketing",
    });
    const res = createResponse();

    await PUT(req as never, res as never);

    expect(emailSettingsModule.upsertSenderProfile).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      message: "Unsupported email sender profile: marketing",
    });
  });

  it("sends a test notification through the selected sender", async () => {
    const emailSettingsModule = {
      getResolvedSenderProfile: jest.fn().mockResolvedValue(profile),
    };
    const notificationModule = {
      createNotifications: jest.fn().mockResolvedValue([{ id: "notif_1" }]),
    };
    const req = createRequest({
      body: { to: "owner@3dbytetech.com.au" },
      emailSettingsModule,
      notificationModule,
    });
    const res = createResponse();

    await POST(req as never, res as never);

    expect(notificationModule.createNotifications).toHaveBeenCalledWith(
      expect.objectContaining({
        channel: "email",
        from: profile.from,
        provider_data: {
          reply_to: profile.reply_to,
        },
        template: "email-settings-test",
        to: "owner@3dbytetech.com.au",
      }),
    );
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("rejects test sends when Resend is not configured", async () => {
    delete process.env.RESEND_API_KEY;
    const emailSettingsModule = {
      getResolvedSenderProfile: jest.fn(),
    };
    const notificationModule = {
      createNotifications: jest.fn(),
    };
    const req = createRequest({
      body: { to: "owner@3dbytetech.com.au" },
      emailSettingsModule,
      notificationModule,
    });
    const res = createResponse();

    await POST(req as never, res as never);

    expect(emailSettingsModule.getResolvedSenderProfile).not.toHaveBeenCalled();
    expect(notificationModule.createNotifications).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: "Resend is not configured.",
    });
  });
});
