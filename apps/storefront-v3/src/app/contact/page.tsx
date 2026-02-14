import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact Us",
  description: "Get in touch with 3DByte Tech. We're here to help with your questions and support needs.",
};

export default function ContactPage() {
  return (
    <div className="container py-12 md:py-16">
      <div className="mb-12">
        <h1 className="text-4xl font-bold tracking-tight mb-4">
          Contact Us
        </h1>
        <p className="text-lg text-muted-foreground">
          Have a question or need help? We're here for you.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
        {/* Contact Form */}
        <section>
          <h2 className="text-2xl font-semibold mb-6">Send us a Message</h2>
          <form className="space-y-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium mb-2">
                Name
              </label>
              <input
                type="text"
                id="name"
                name="name"
                className="w-full rounded-md border bg-background px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Your name"
              />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-2">
                Email
              </label>
              <input
                type="email"
                id="email"
                name="email"
                className="w-full rounded-md border bg-background px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="your@email.com"
              />
            </div>
            <div>
              <label htmlFor="subject" className="block text-sm font-medium mb-2">
                Subject
              </label>
              <select
                id="subject"
                name="subject"
                className="w-full rounded-md border bg-background px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Select a topic</option>
                <option value="order">Order Inquiry</option>
                <option value="product">Product Question</option>
                <option value="support">Technical Support</option>
                <option value="returns">Returns & Refunds</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label htmlFor="message" className="block text-sm font-medium mb-2">
                Message
              </label>
              <textarea
                id="message"
                name="message"
                rows={5}
                className="w-full rounded-md border bg-background px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="How can we help?"
              />
            </div>
            <button
              type="submit"
              className="rounded-md bg-primary px-6 py-3 font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Send Message
            </button>
          </form>
        </section>

        {/* Contact Info */}
        <section>
          <h2 className="text-2xl font-semibold mb-6">Get in Touch</h2>
          <div className="space-y-6">
            <div className="rounded-lg border bg-card p-6">
              <h3 className="font-semibold mb-2">📧 Email</h3>
              <p className="text-muted-foreground">support@3dbyte.tech</p>
            </div>
            <div className="rounded-lg border bg-card p-6">
              <h3 className="font-semibold mb-2">📍 Location</h3>
              <p className="text-muted-foreground">Hobart, Tasmania, Australia</p>
            </div>
            <div className="rounded-lg border bg-card p-6">
              <h3 className="font-semibold mb-2">🕐 Business Hours</h3>
              <p className="text-muted-foreground">
                Monday - Friday: 9:00 AM - 5:00 PM (AEST)<br />
                Weekend: Closed
              </p>
            </div>
          </div>

          <div className="mt-8">
            <h3 className="font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2 text-muted-foreground">
              <li>
                <a href="/faq" className="hover:text-primary transition-colors">
                  → FAQ - Common Questions
                </a>
              </li>
              <li>
                <a href="/help" className="hover:text-primary transition-colors">
                  → Help Center
                </a>
              </li>
              <li>
                <a href="/returns" className="hover:text-primary transition-colors">
                  → Returns & Refunds
                </a>
              </li>
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
}
