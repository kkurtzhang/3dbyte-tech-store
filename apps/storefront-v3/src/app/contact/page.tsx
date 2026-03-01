import { Metadata } from "next";
import Link from "next/link";
import { ContactForm } from "./contact-form";

export const metadata: Metadata = {
  title: "Contact Support",
  description:
    "Get in touch with 3DByte Tech support for product help, orders, returns, and account questions.",
};

export default function ContactPage() {
  return (
    <div className="container py-12 md:py-16">
      <div className="mb-12">
        <h1 className="text-4xl font-bold tracking-tight mb-4">Contact Support</h1>
        <p className="text-lg text-muted-foreground">
          Tell us what you need and our support team will help with your order,
          product, or account issue.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
        <section>
          <h2 className="text-2xl font-semibold mb-6">Send a Support Request</h2>
          <ContactForm />
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-6">Support Details</h2>
          <div className="space-y-6">
            <div className="rounded-lg border bg-card p-6">
              <h3 className="font-semibold mb-2">Support Email</h3>
              <a
                href="mailto:support@3dbyte.tech"
                className="text-muted-foreground hover:text-primary transition-colors"
              >
                support@3dbyte.tech
              </a>
            </div>
            <div className="rounded-lg border bg-card p-6">
              <h3 className="font-semibold mb-2">Response Time</h3>
              <p className="text-muted-foreground">
                We usually respond within 1 business day.
              </p>
            </div>
            <div className="rounded-lg border bg-card p-6">
              <h3 className="font-semibold mb-2">Support Hours</h3>
              <p className="text-muted-foreground">
                Monday - Friday: 9:00 AM - 5:00 PM (AEST)
                <br />
                Weekend: Closed
              </p>
            </div>
          </div>

          <div className="mt-8">
            <h3 className="font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2 text-muted-foreground">
              <li>
                <Link href="/faq" className="hover:text-primary transition-colors">
                  FAQ and troubleshooting
                </Link>
              </li>
              <li>
                <Link href="/help" className="hover:text-primary transition-colors">
                  Help center
                </Link>
              </li>
              <li>
                <Link href="/returns" className="hover:text-primary transition-colors">
                  Returns and refunds
                </Link>
              </li>
              <li>
                <Link href="/track-order" className="hover:text-primary transition-colors">
                  Track an order
                </Link>
              </li>
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
}
