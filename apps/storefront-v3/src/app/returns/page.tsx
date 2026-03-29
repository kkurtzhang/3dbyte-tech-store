import { Metadata } from "next"
import { Contact, LifeBuoy, Package } from "lucide-react"

import { ContentPageShell } from "@/features/cms/components/content-page-shell"
import { MdxContent } from "@/features/cms/components/mdx-content"
import { stripLeadingMarkdownHeading } from "@/features/cms/lib/content-page"

export const metadata: Metadata = {
  title: "Returns & Refunds",
  description: "Learn about our returns and refunds policy.",
}

export const revalidate = 3600;

// Fallback content when Strapi is unavailable
const FALLBACK_CONTENT = `
*Last updated: March 2026*

We want you to feel confident ordering from 3DByte Tech. If something arrives faulty or is not right, contact us first so we can confirm the fastest resolution.

### 30-Day Return Policy

You have 30 days from the date of delivery to request a return for eligible items. To qualify:

- Item must be unused and in the same condition as received
- Item must be in original packaging
- Proof of purchase required
- Return must be approved by our support team before sending the item back

### How to Return

1. Contact our support team at **support@3dbytetech.com.au**
2. Include your order number and reason for return
3. Wait for return instructions before dispatching the item
4. Ship the item back with the approved return reference

### Refunds

Once we receive your return, we'll inspect it and notify you of the refund status. Approved refunds are processed within 5-7 business days.

### Faulty, Damaged, or Incorrect Items

If your order arrives damaged, faulty, or incorrect, contact us as soon as possible with your order number and clear photos where relevant. We will work with you on a replacement, repair path, or refund depending on the issue.

### Non-Returnable Items

- Opened consumables (filament, resin, etc.)
- Custom or personalized items
- Items marked as final sale
- Items damaged through misuse, improper setup, or unauthorized modification

### Questions?

Contact us at **support@3dbytetech.com.au** for any questions about returns.
`

export default async function ReturnsPage() {
  let pageContent = FALLBACK_CONTENT

  try {
    const { getContentPage } = await import("@/lib/strapi/content")
    const response = await getContentPage("returns")
    if (response?.data?.PageContent) {
      pageContent = stripLeadingMarkdownHeading(response.data.PageContent, [
        "Returns & Refunds",
        "Returns & Refunds Policy",
        "Returns and Refunds",
      ])
    }
  } catch {
    // Use fallback content if Strapi unavailable
  }

  return (
    <ContentPageShell
      eyebrow="SUPPORT"
      title="Returns & Refunds"
      description="Eligibility, return approval steps, and refund timing for faulty or change-of-mind purchases."
      links={[
        {
          title: "Shipping Policy",
          description: "See dispatch timing, delivery expectations, and tracking guidance.",
          href: "/shipping",
          icon: Package,
        },
        {
          title: "Help Center",
          description: "Browse more support topics across orders, tracking, and account questions.",
          href: "/help",
          icon: LifeBuoy,
        },
        {
          title: "Contact Support",
          description: "Start a return or report a damaged item with the support team.",
          href: "/contact",
          icon: Contact,
        },
      ]}
    >
      <MdxContent content={pageContent} />
    </ContentPageShell>
  )
}
