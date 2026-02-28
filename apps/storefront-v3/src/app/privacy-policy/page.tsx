import { Metadata } from "next";
import { MdxContent } from "@/features/cms/components/mdx-content";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Read our privacy policy to understand how we handle your data.",
};

export const revalidate = 3600;

const FALLBACK_CONTENT = `
## Privacy Policy

Your privacy is important to us. This policy outlines how 3DByte Tech collects, uses, and protects your personal information.

### Information We Collect

- **Personal Information**: Name, email, shipping address, payment details
- **Usage Data**: Browser type, pages visited, time on site
- **Device Information**: IP address, device type

### How We Use Your Information

- Process and fulfill orders
- Send order updates and promotional emails (with consent)
- Improve our website and services
- Prevent fraud and ensure security

### Data Protection

We implement industry-standard security measures to protect your data. Your payment information is encrypted and processed securely through our payment providers.

### Third-Party Services

We may share data with trusted third parties for:
- Payment processing (Stripe)
- Shipping carriers
- Analytics (with anonymized data)

### Your Rights

You can request access to, correction of, or deletion of your personal data by contacting us at **support@3dbyte.tech**.

### Contact

Questions about this policy? Email us at **support@3dbyte.tech**.
`;

export default async function PrivacyPolicyPage() {
  let pageContent = FALLBACK_CONTENT;

  try {
    const { getContentPage } = await import("@/lib/strapi/content");
    const response = await getContentPage("privacy-policy");
    if (response?.data?.PageContent) {
      pageContent = response.data.PageContent;
    }
  } catch {
  }

  return (
    <div className="container py-12 md:py-16 max-w-4xl">
      <h1 className="text-4xl font-bold tracking-tight mb-8">Privacy Policy</h1>
      <MdxContent content={pageContent} />
    </div>
  );
}
