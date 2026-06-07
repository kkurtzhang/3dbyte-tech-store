import {
  buildIdentityIssuesQuery,
  formatIdentityIssueDate,
  getIdentityIssueCustomerPath,
  getIdentityIssueStatusColor,
  labelizeIdentityIssueValue,
} from "../identity-issues";

describe("identity issues admin helpers", () => {
  it("builds a compact query from active filters", () => {
    expect(
      buildIdentityIssuesQuery({
        dateFrom: "2026-06-01",
        dateTo: "2026-06-07",
        email: "owner@example.com",
        issueType: "all",
        limit: 15,
        offset: 30,
        provider: "google",
        status: "open",
      }),
    ).toEqual({
      date_from: "2026-06-01T00:00:00.000Z",
      date_to: "2026-06-07T23:59:59.999Z",
      email: "owner@example.com",
      limit: 15,
      offset: 30,
      provider: "google",
      status: "open",
    });
  });

  it("formats issue values and customer links for the read-only table", () => {
    expect(labelizeIdentityIssueValue("no_usable_login")).toBe(
      "No Usable Login",
    );
    expect(getIdentityIssueStatusColor("open")).toBe("orange");
    expect(getIdentityIssueStatusColor("resolved")).toBe("green");
    expect(getIdentityIssueCustomerPath("cus_123")).toBe("/customers/cus_123");
    expect(getIdentityIssueCustomerPath(null)).toBeNull();
    expect(formatIdentityIssueDate(null)).toBe("-");
  });
});
