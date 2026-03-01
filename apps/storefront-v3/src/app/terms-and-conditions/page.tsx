import { Metadata } from "next";
import { MdxContent } from "@/features/cms/components/mdx-content";

export const metadata: Metadata = {
  title: "Terms and Conditions",
  description: "Read our terms and conditions for using our website and services.",
};

export const revalidate = 3600;

function stripLeadingMarkdownH2(content: string): string {
  return content.replace(/^\s*##\s+Terms(?:\s+and|\s*&)\s+Conditions\s*\n+/i, "");
}

const FALLBACK_CONTENT = `
## Terms and Conditions

By using the 3DByte Tech website and purchasing our products, you agree to these terms.

### General Terms

- You must be 18 years or older to make a purchase
- All prices are in AUD unless otherwise specified
- We reserve the right to refuse service to anyone

### Product Information

We make every effort to display products accurately. However, we cannot guarantee that:
- Colors displayed on your screen are 100% accurate
- Product descriptions are error-free

### Orders and Payment

- Orders are confirmed upon successful payment
- We reserve the right to cancel orders due to pricing errors or stock issues
- Payment is processed securely through our payment providers

### Intellectual Property

All content on this website (text, images, logos) is owned by 3DByte Tech and protected by copyright laws.

### Limitation of Liability

3DByte Tech is not liable for any indirect, incidental, or consequential damages arising from the use of our products or services.

### Changes to Terms

We may update these terms at any time. Continued use of our website constitutes acceptance of updated terms.

### Contact

Questions? Email us at **support@3dbyte.tech**.
`;

export default async function TermsAndConditionsPage() {
  let pageContent = FALLBACK_CONTENT;

  try {
    const { getContentPage } = await import("@/lib/strapi/content");
    const response = await getContentPage("terms-and-condition");
    if (response?.data?.PageContent) {
      pageContent = stripLeadingMarkdownH2(response.data.PageContent);
    }
  } catch {
  }

  return (
    <div className="container py-12 md:py-16 max-w-4xl">
      <h1 className="text-4xl font-bold tracking-tight mb-8">Terms and Conditions</h1>
      <MdxContent content={pageContent} />
    </div>
  );
}
