import { renderCustomerEmailVerificationEmail } from "../renderers/customer-email-verification";

describe("renderCustomerEmailVerificationEmail", () => {
  it("tells customers the verification link expires in 24 hours", async () => {
    const rendered = await renderCustomerEmailVerificationEmail({
      customerEmail: "customer@example.com",
      verificationUrl: "https://store.example.com/verify-email?token=test",
    });

    expect(rendered.subject).toBe("Confirm your 3D Byte Tech account");
    expect(rendered.text).toContain("This verification link expires in 24 hours.");
    expect(rendered.html).toContain("This verification link expires in 24 hours.");
  });

  it("uses the same 24-hour expiry copy for email-change confirmation", async () => {
    const rendered = await renderCustomerEmailVerificationEmail({
      customerEmail: "new@example.com",
      purpose: "email_change",
      verificationUrl: "https://store.example.com/verify-email?token=test",
    });

    expect(rendered.subject).toBe("Confirm your new 3D Byte Tech email");
    expect(rendered.text).toContain("This verification link expires in 24 hours.");
    expect(rendered.html).toContain("This verification link expires in 24 hours.");
  });
});
