import { Metadata } from "next";
import { MdxContent } from "@/features/cms/components/mdx-content";

export const metadata: Metadata = {
  title: "Returns & Refunds",
  description: "Learn about our returns and refunds policy.",
};

export const revalidate = 3600;

// Fallback content when Strapi is unavailable
const FALLBACK_CONTENT = `
## Returns & Refunds Policy

At 3DByte Tech, we want you to be completely satisfied with your purchase.

### 30-Day Return Policy

You have 30 days from the date of delivery to return your item. To be eligible for a return:

- Item must be unused and in the same condition as received
- Item must be in original packaging
- Proof of purchase required

### How to Return

1. Contact our support team at **support@3dbyte.tech**
2. Include your order number and reason for return
3. We'll provide a return shipping label
4. Ship the item back to us

### Refunds

Once we receive your return, we'll inspect it and notify you of the refund status. Approved refunds are processed within 5-7 business days.

### Non-Returnable Items

- Opened consumables (filament, resin, etc.)
- Custom or personalized items
- Items marked as final sale

### Questions?

Contact us at **support@3dbyte.tech** for any questions about returns.
`;

export default async function ReturnsPage() {
  let pageContent = FALLBACK_CONTENT;

  try {
    const { getContentPage } = await import("@/lib/strapi/content");
    const response = await getContentPage("returns");
    if (response?.data?.PageContent) {
      pageContent = response.data.PageContent;
    }
  } catch {
    // Use fallback content if Strapi unavailable
  }

  return (
    <div className="container py-12 md:py-16 max-w-4xl">
      <h1 className="text-4xl font-bold tracking-tight mb-8">Returns & Refunds</h1>
      <MdxContent content={pageContent} />
    </div>
  );
}
