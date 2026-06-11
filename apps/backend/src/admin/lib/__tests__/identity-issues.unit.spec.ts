import {
  buildIdentityIssuesQuery,
  formatIdentityIssueDate,
  getIdentityIssueCustomerDisplay,
  getIdentityIssueCustomerPath,
  getIdentityIssueResolutionConfirmation,
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

  it("formats useful customer identity and repair confirmation text", () => {
    const issue = {
      id: "duplicate_registered_customers:0123456789abcdef",
      issue_type: "duplicate_registered_customers",
      status: "open",
      provider: null,
      email: "owner@example.com",
      customer_id: "cus_primary",
      customer: {
        id: "cus_primary",
        email: "owner@example.com",
        name: "Primary Owner",
        account_type: "registered" as const,
        providers: ["emailpass", "google"],
        created_at: "2026-06-01T00:00:00.000Z",
      },
      related_customers: [
        {
          id: "cus_primary",
          email: "owner@example.com",
          name: "Primary Owner",
          account_type: "registered" as const,
          providers: ["emailpass", "google"],
          created_at: "2026-06-01T00:00:00.000Z",
        },
        {
          id: "cus_duplicate",
          email: "owner@example.com",
          name: null,
          account_type: "registered" as const,
          providers: [],
          created_at: "2026-06-02T00:00:00.000Z",
        },
      ],
      occurred_at: "2026-06-07T00:00:00.000Z",
      summary: "2 registered customer records share this email.",
      resolution: {
        action: "merge_duplicate_customers" as const,
        allowed: true,
        label: "Merge duplicate customers",
        description: "Transfers eligible history.",
        affected_customer_ids: ["cus_primary", "cus_duplicate"],
      },
    };

    expect(getIdentityIssueCustomerDisplay(issue)).toEqual({
      primary: "Primary Owner",
      secondary: "owner@example.com · Registered · Email/password + Google",
    });
    expect(getIdentityIssueResolutionConfirmation(issue)).toEqual({
      title: "Merge duplicate customers?",
      description:
        "Transfers eligible history. This affects 2 customer records and retains the non-canonical records as history.",
    });
  });
});
