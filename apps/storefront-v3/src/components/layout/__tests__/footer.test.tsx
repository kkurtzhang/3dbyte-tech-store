import { render, screen } from "@testing-library/react";

import { Footer } from "../footer";

jest.mock("../newsletter-signup", () => ({
  NewsletterSignup: () => <div>Newsletter signup</div>,
}));

jest.mock("@/components/ui/payment-method-support", () => ({
  PaymentMethodSupport: () => <div>Payment method support</div>,
}));

describe("Footer", () => {
  it("surfaces the approved store brand in the footer", () => {
    render(<Footer />);

    const brandLink = screen.getByRole("link", { name: "3D Byte Tech" });

    expect(brandLink).toHaveAttribute("href", "/");
    expect(
      brandLink.querySelector(
        'img[src*="/brand/logos/logo-primary-horizontal-640w.png"]',
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/practical 3d printing tools/i),
    ).toBeInTheDocument();
  });

  it("surfaces customer resource and download destinations", () => {
    render(<Footer />);

    expect(
      screen.getByRole("link", { name: /download center/i }),
    ).toHaveAttribute("href", "/downloads");
    expect(
      screen.getByRole("link", { name: /resource center/i }),
    ).toHaveAttribute("href", "/docs");
    expect(
      screen.queryByRole("link", { name: /documentation/i }),
    ).not.toBeInTheDocument();
  });

  it("shows the current copyright year", () => {
    render(<Footer />);

    expect(
      screen.getByText("© 2026 3D Byte Tech. All rights reserved."),
    ).toBeInTheDocument();
    expect(screen.queryByText(/© 2024 3D Byte Tech/i)).not.toBeInTheDocument();
  });
});
