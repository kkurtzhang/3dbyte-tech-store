import { renderAccountSecurityEmail } from "../renderers/account-security";

describe("renderAccountSecurityEmail", () => {
  it("uses the shared transactional theme for sensitive account changes", async () => {
    const rendered = await renderAccountSecurityEmail({
      message: "Google login was disconnected from your account.",
      subject: "Google login disconnected",
    });

    expect(rendered.subject).toBe("Google login disconnected");
    expect(rendered.html).toContain('alt="3D Byte Tech"');
    expect(rendered.html).toContain("Account security");
    expect(rendered.html).toContain(
      "Google login was disconnected from your account.",
    );
    expect(rendered.text).toContain(
      "If this was not you, contact 3D Byte Tech support.",
    );
  });
});
