import { POST, PostAdminResolveIdentityIssueSchema } from "../route";
import { resolveAdminIdentityIssue } from "../../resolve-identity-issue";

jest.mock("../../resolve-identity-issue", () => ({
  resolveAdminIdentityIssue: jest.fn(),
}));

const mockResolve = resolveAdminIdentityIssue as jest.MockedFunction<
  typeof resolveAdminIdentityIssue
>;

describe("POST /admin/identity-issues/resolve", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("resolves an opaque issue as the authenticated admin", async () => {
    mockResolve.mockResolvedValue({
      action: "delete_orphan_identity",
      removed_provider_count: 1,
    });
    const req = {
      auth_context: { actor_id: "user_admin" },
      scope: { resolve: jest.fn() },
      validatedBody: {
        issue_id: "orphan_auth_identity:0000000000000000",
      },
    };
    const res = { json: jest.fn(), status: jest.fn().mockReturnThis() };

    await POST(req as never, res as never);

    expect(mockResolve).toHaveBeenCalledWith({
      adminId: "user_admin",
      container: req.scope,
      issueId: "orphan_auth_identity:0000000000000000",
    });
    expect(res.json).toHaveBeenCalledWith({
      resolution: expect.objectContaining({
        action: "delete_orphan_identity",
      }),
    });
  });

  it("rejects missing admin authentication", async () => {
    const res = { json: jest.fn(), status: jest.fn().mockReturnThis() };

    await POST(
      {
        auth_context: {},
        scope: {},
        validatedBody: {
          issue_id: "orphan_auth_identity:0000000000000000",
        },
      } as never,
      res as never,
    );

    expect(res.status).toHaveBeenCalledWith(401);
    expect(mockResolve).not.toHaveBeenCalled();
  });

  it("validates opaque issue identifiers", () => {
    expect(
      PostAdminResolveIdentityIssueSchema.parse({
        issue_id: "orphan_auth_identity:0000000000000000",
      }),
    ).toEqual({
      issue_id: "orphan_auth_identity:0000000000000000",
    });
    expect(() =>
      PostAdminResolveIdentityIssueSchema.parse({
        issue_id: "auth_orphan",
      }),
    ).toThrow();
  });
});

