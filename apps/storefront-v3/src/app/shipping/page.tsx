import { Metadata } from "next";
import { MdxContent } from "@/features/cms/components/mdx-content";

export const metadata: Metadata = {
  title: "Shipping Policy",
  description: "Learn about our shipping options and delivery times.",
};

export const revalidate = 3600;

const FALLBACK_CONTENT = `
## Shipping Policy

We offer reliable shipping options to get your order to you quickly and safely.

### Shipping Options

| Method | Delivery Time | Cost |
|--------|---------------|------|
| Standard | 5-7 business days | Calculated at checkout |
| Express | 2-3 business days | Calculated at checkout |
| Overnight | 1 business day | Calculated at checkout |

### Order Processing

Orders are processed within 1-2 business days. You'll receive a tracking number via email once your order ships.

### Shipping Locations

We currently ship to:
- Australia
- New Zealand
- Select international destinations

### Shipping Restrictions

Some items (e.g., lithium batteries, certain chemicals) may have shipping restrictions. These will be noted on the product page.

### Delivery Issues

If your package is lost or damaged during shipping, please contact us immediately at **support@3dbyte.tech**.

### Questions?

Contact us at **support@3dbyte.tech** for shipping inquiries.
`;

export default async function ShippingPage() {
  let pageContent = FALLBACK_CONTENT;

  try {
    const { getContentPage } = await import("@/lib/strapi/content");
    const response = await getContentPage("shipping");
    if (response?.data?.PageContent) {
      pageContent = response.data.PageContent;
    }
  } catch (error) {
    console.log("Using fallback shipping content");
  }

  return (
    <div className="container py-12 md:py-16 max-w-4xl">
      <h1 className="text-4xl font-bold tracking-tight mb-8">Shipping Policy</h1>
      <MdxContent content={pageContent} />
    </div>
  );
}