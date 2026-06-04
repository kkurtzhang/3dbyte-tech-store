import { renderCustomerPasswordResetEmail } from "../renderers/customer-password-reset";

describe("renderCustomerPasswordResetEmail", () => {
  beforeEach(() => {
    process.env.EMAIL_ASSET_BASE_URL = "https://store.3dbytetech.com.au";
  });

  it("renders with the shared customer email theme", async () => {
    const rendered = await renderCustomerPasswordResetEmail({
      customerEmail: "customer@example.com",
      resetPasswordUrl:
        "https://store.3dbytetech.com.au/reset-password?token=reset-token&email=customer%40example.com",
      storeName: "3D Byte Tech",
    });

    expect(rendered.subject).toBe("Reset your 3D Byte Tech password");
    expect(rendered.html).toContain(
      "https://store.3dbytetech.com.au/brand/logos/logo-primary-horizontal-640w.png",
    );
    expect(rendered.html).toContain('alt="3D Byte Tech"');
    expect(rendered.html).toContain("Password reset");
    expect(rendered.html).toContain("Reset your password.");
    expect(rendered.html).toContain("Reset password");
    expect(rendered.html).toContain("background-color:#0f172a");
    expect(rendered.text).toContain("Reset your 3D Byte Tech account password.");
    expect(rendered.text).toContain("Email: customer@example.com");
    expect(rendered.text).toContain(
      "Reset password: https://store.3dbytetech.com.au/reset-password?token=reset-token&email=customer%40example.com",
    );
  });
});
