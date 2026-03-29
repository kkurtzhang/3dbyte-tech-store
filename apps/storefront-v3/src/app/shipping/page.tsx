import { Metadata } from "next"
import { Contact, LifeBuoy, RefreshCw } from "lucide-react"

import { ContentPageShell } from "@/features/cms/components/content-page-shell"
import { MdxContent } from "@/features/cms/components/mdx-content"
import { stripLeadingMarkdownHeading } from "@/features/cms/lib/content-page"

export const metadata: Metadata = {
  title: "Shipping Policy",
  description: "Learn about our shipping options and delivery times.",
}

export const revalidate = 3600;

const FALLBACK_CONTENT = `
*Last updated: March 2026*

We aim to dispatch stocked orders quickly and provide clear delivery expectations before checkout.

### Shipping Options

| Method | Delivery Time | Cost |
|--------|---------------|------|
| Standard | 3-7 business days | Calculated at checkout |
| Express | 1-3 business days | Calculated at checkout |
| Regional / bulky items | Varies by postcode and carrier | Calculated at checkout |

### Order Processing

Orders are typically processed within 1-2 business days. Orders placed on weekends or public holidays begin processing on the next business day. You will receive a tracking update once your parcel has been dispatched.

### Tracking

Once your order ships, we will email tracking details to the address used at checkout. If tracking has not updated for several business days, contact us and we will investigate with the carrier.

### Shipping Locations

We currently ship to:
- Australia-wide
- New Zealand on selected products
- Other destinations only when shown as available at checkout

### Shipping Restrictions

Some items, oversized products, hazardous goods, or supplier-direct items may have delivery restrictions or longer lead times. Any known limitation will be noted on the product page or at checkout.

### Delivery Issues

If your package is lost or damaged during shipping, please contact us immediately at **support@3dbytetech.com.au**.

### Questions?

Contact us at **support@3dbytetech.com.au** for delivery, tracking, or dispatch questions.
`

export default async function ShippingPage() {
  let pageContent = FALLBACK_CONTENT

  try {
    const { getContentPage } = await import("@/lib/strapi/content")
    const response = await getContentPage("shipping")
    if (response?.data?.PageContent) {
      pageContent = stripLeadingMarkdownHeading(response.data.PageContent, [
        "Shipping Policy",
        "Shipping",
      ])
    }
  } catch {
  }

  return (
    <ContentPageShell
      eyebrow="SUPPORT"
      title="Shipping Policy"
      description="Dispatch timing, carrier expectations, and what to do if something goes wrong in transit."
      links={[
        {
          title: "Returns & Refunds",
          description: "Check eligibility, refund timing, and how return requests are handled.",
          href: "/returns",
          icon: RefreshCw,
        },
        {
          title: "Help Center",
          description: "Browse the rest of our support resources if you need quick answers.",
          href: "/help",
          icon: LifeBuoy,
        },
        {
          title: "Contact Support",
          description: "Reach out if you need help with dispatch delays, tracking, or delivery issues.",
          href: "/contact",
          icon: Contact,
        },
      ]}
    >
      <MdxContent content={pageContent} />
    </ContentPageShell>
  )
}
