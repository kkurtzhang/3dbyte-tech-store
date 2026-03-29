import { Metadata } from "next"
import { Contact, FileText, ShieldCheck } from "lucide-react"

import { ContentPageShell } from "@/features/cms/components/content-page-shell"
import { MdxContent } from "@/features/cms/components/mdx-content"
import { stripLeadingMarkdownHeading } from "@/features/cms/lib/content-page"

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Read our privacy policy to understand how we handle your data.",
}

export const revalidate = 3600

const FALLBACK_CONTENT = `
*Last updated: March 2026*

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

You can request access to, correction of, or deletion of your personal data by contacting us at **support@3dbytetech.com.au**.

### Contact

Questions about this policy? Email us at **support@3dbytetech.com.au**.
`

export default async function PrivacyPolicyPage() {
  let pageContent = FALLBACK_CONTENT

  try {
    const { getContentPage } = await import("@/lib/strapi/content")
    const response = await getContentPage("privacy-policy")
    if (response?.data?.PageContent) {
      pageContent = stripLeadingMarkdownHeading(response.data.PageContent, [
        "Privacy Policy",
      ])
    }
  } catch {
  }

  return (
    <ContentPageShell
      eyebrow="LEGAL"
      title="Privacy Policy"
      description="How we collect, use, store, and protect customer information across the storefront, checkout, and support flows."
      links={[
        {
          title: "Terms & Conditions",
          description: "Read the general legal terms that apply to purchases and site usage.",
          href: "/terms-and-conditions",
          icon: FileText,
        },
        {
          title: "Shipping Policy",
          description: "See dispatch, delivery, and carrier expectations before checkout.",
          href: "/shipping",
          icon: ShieldCheck,
        },
        {
          title: "Contact Support",
          description: "Reach out if you need a privacy-related correction or access request.",
          href: "/contact",
          icon: Contact,
        },
      ]}
    >
      <MdxContent content={pageContent} />
    </ContentPageShell>
  )
}
