import { Metadata } from "next";
import { getFAQ } from "@/lib/strapi/content";
import { FAQAccordion } from "@/features/cms/components/faq-accordion";
import { SidebarBookmarks } from "@/features/cms/components/sidebar-bookmarks";
import { FAQSection } from "@/lib/strapi/types";

// Force dynamic rendering to avoid build-time CMS dependency
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: "FAQ",
  description: "Frequently asked questions about orders, shipping, returns, and support.",
};

export default async function FAQPage() {
  let faqSections: FAQSection[] = [];

  try {
    const response = await getFAQ();
    faqSections = response.data?.FAQSection || [];
  } catch {
    faqSections = [];
  }

  const bookmarks = faqSections.map((section) => ({
    id: section.Bookmark,
    label: section.Title,
  }));

  return (
    <div className="container py-12 md:py-16">
      <div className="mb-12">
        <h1 className="text-4xl font-bold tracking-tight mb-4">
          Frequently Asked Questions
        </h1>
        <p className="text-lg text-muted-foreground">
          Find quick answers to common questions about our products and
          services.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-12 lg:grid-cols-[250px_1fr]">
        <aside className="hidden lg:block">
          <SidebarBookmarks data={bookmarks} />
        </aside>

        <div className="space-y-16">
          {faqSections.length > 0 ? (
            faqSections.map((section) => <FAQAccordion key={section.id} data={section} />)
          ) : (
            <section className="rounded-lg border bg-card p-6">
              <h2 className="text-xl font-semibold mb-2">FAQ content is being updated</h2>
              <p className="text-muted-foreground">
                Please check back shortly, or contact support at{" "}
                <a href="mailto:support@3dbyte.tech" className="underline underline-offset-4">
                  support@3dbyte.tech
                </a>
                .
              </p>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
