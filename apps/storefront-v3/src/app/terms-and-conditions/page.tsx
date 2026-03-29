import { Metadata } from "next"
import { Contact, Package, ShieldCheck } from "lucide-react"

import { ContentPageShell } from "@/features/cms/components/content-page-shell"
import { MdxContent } from "@/features/cms/components/mdx-content"
import { stripLeadingMarkdownHeading } from "@/features/cms/lib/content-page"

export const metadata: Metadata = {
  title: "Terms and Conditions",
  description: "Read our terms and conditions for using our website and services.",
}

export const revalidate = 3600

const FALLBACK_CONTENT = `
*Last updated: March 2026*

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

Questions? Email us at **support@3dbytetech.com.au**.
`

export default async function TermsAndConditionsPage() {
  let pageContent = FALLBACK_CONTENT

  try {
    const { getContentPage } = await import("@/lib/strapi/content")
    const response = await getContentPage("terms-and-condition")
    if (response?.data?.PageContent) {
      pageContent = stripLeadingMarkdownHeading(response.data.PageContent, [
        "Terms and Conditions",
        "Terms & Conditions",
      ])
    }
  } catch {
  }

  return (
    <ContentPageShell
      eyebrow="LEGAL"
      title="Terms and Conditions"
      description="The commercial and legal terms that govern purchases, pricing, checkout, and site usage."
      links={[
        {
          title: "Privacy Policy",
          description: "See how customer data is collected, stored, and handled.",
          href: "/privacy-policy",
          icon: ShieldCheck,
        },
        {
          title: "Shipping Policy",
          description: "Check delivery timing, carrier expectations, and dispatch notes.",
          href: "/shipping",
          icon: Package,
        },
        {
          title: "Contact Support",
          description: "Reach out if you need clarification before placing an order.",
          href: "/contact",
          icon: Contact,
        },
      ]}
    >
      <MdxContent content={pageContent} />
    </ContentPageShell>
  )
}
