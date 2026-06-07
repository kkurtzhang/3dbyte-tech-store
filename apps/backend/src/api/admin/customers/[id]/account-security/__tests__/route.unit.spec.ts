import { buildAccountSecuritySummary } from "../../../../../../modules/account-coordination/account-security-summary";
import { GET } from "../route";

jest.mock(
  "../../../../../../modules/account-coordination/account-security-summary",
  () => ({
    buildAccountSecuritySummary: jest.fn(),
  }),
);

const mockBuildSummary = buildAccountSecuritySummary as jest.MockedFunction<
  typeof buildAccountSecuritySummary
>;

it("returns a sanitized customer account-security summary to admins", async () => {
  mockBuildSummary.mockResolvedValue({
    customer_id: "cus_123",
    providers: [{ provider: "google", linked: true }],
  } as never);
  const req = {
    params: { id: "cus_123" },
    scope: { resolve: jest.fn() },
  };
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

  await GET(req as never, res as never);

  expect(mockBuildSummary).toHaveBeenCalledWith({
    container: req.scope,
    customerId: "cus_123",
  });
  expect(res.json).toHaveBeenCalledWith({
    account_security: expect.objectContaining({
      customer_id: "cus_123",
    }),
  });
});
