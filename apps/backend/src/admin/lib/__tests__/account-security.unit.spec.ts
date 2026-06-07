import {
  getAccountSecurityProviderRows,
  getAccountSecurityWarningLabel,
  getProviderBadgeColor,
} from "../account-security";

describe("account security admin helpers", () => {
  it("shows email/password and Google with explicit linked states", () => {
    expect(
      getAccountSecurityProviderRows([
        {
          provider: "google",
          linked: true,
          linked_at: "2026-06-07T00:00:00.000Z",
        },
      ]),
    ).toEqual([
      {
        key: "emailpass",
        label: "Email/password",
        linked: false,
        linkedAt: null,
      },
      {
        key: "google",
        label: "Google",
        linked: true,
        linkedAt: "2026-06-07T00:00:00.000Z",
      },
    ]);

    expect(getAccountSecurityProviderRows([])).toEqual([
      {
        key: "emailpass",
        label: "Email/password",
        linked: false,
        linkedAt: null,
      },
      {
        key: "google",
        label: "Google",
        linked: false,
        linkedAt: null,
      },
    ]);
  });

  it("maps provider and warning states to stable labels and badge colors", () => {
    expect(getProviderBadgeColor(true)).toBe("green");
    expect(getProviderBadgeColor(false)).toBe("grey");
    expect(getAccountSecurityWarningLabel("no_usable_login")).toBe(
      "No usable login method",
    );
    expect(getAccountSecurityWarningLabel("identity_conflict")).toBe(
      "Identity conflict",
    );
  });
});
