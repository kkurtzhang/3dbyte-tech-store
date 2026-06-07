import { GET, GetAdminIdentityIssuesSchema } from "../route";
import { listAdminIdentityIssues } from "../identity-issues";

jest.mock("../identity-issues", () => ({
  listAdminIdentityIssues: jest.fn(),
}));

const mockListIdentityIssues = listAdminIdentityIssues as jest.MockedFunction<
  typeof listAdminIdentityIssues
>;

it("returns the sanitized filtered identity issue list", async () => {
  mockListIdentityIssues.mockResolvedValue({
    issues: [
      {
        id: "icf_1",
        issue_type: "provider_identity_owned_by_other_customer",
        status: "open",
        provider: "google",
        email: "owner@example.com",
        customer_id: "cus_1",
        occurred_at: "2026-06-07T03:00:00.000Z",
        summary: "Google identity needs review.",
      },
    ],
    count: 1,
    limit: 20,
    offset: 0,
  });
  const req = {
    scope: { resolve: jest.fn() },
    validatedQuery: {
      issue_type: "provider_identity_owned_by_other_customer",
      status: "open",
      provider: "google",
      email: "owner@example.com",
      date_from: "2026-06-01T00:00:00.000Z",
      date_to: "2026-06-08T00:00:00.000Z",
      limit: 20,
      offset: 0,
    },
  };
  const res = { json: jest.fn() };

  await GET(req as never, res as never);

  expect(mockListIdentityIssues).toHaveBeenCalledWith({
    container: req.scope,
    filters: req.validatedQuery,
  });
  expect(res.json).toHaveBeenCalledWith({
    identity_issues: expect.any(Array),
    count: 1,
    limit: 20,
    offset: 0,
  });
});

it("validates pagination and ISO date filters for middleware registration", () => {
  expect(GetAdminIdentityIssuesSchema.parse({})).toEqual({
    limit: 20,
    offset: 0,
  });
  expect(() =>
    GetAdminIdentityIssuesSchema.parse({
      date_from: "not-a-date",
      limit: 101,
    }),
  ).toThrow();
});
