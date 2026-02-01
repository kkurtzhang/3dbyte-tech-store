import { Metadata } from "next";
import { getFAQ } from "@/lib/strapi/content";
import { FAQAccordion } from "@/features/cms/components/faq-accordion";
import { SidebarBookmarks } from "@/features/cms/components/sidebar-bookmarks";

export const metadata: Metadata = {
  title: "FAQ",
  description: "Frequently Asked Questions about our products and services.",
};

export const revalidate = 3600;

export default async function FAQPage() {
  const response = await getFAQ();
  const { FAQSection } = response.data;

  const bookmarks = FAQSection.map((section) => ({
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
          {FAQSection.map((section, index) => (
            <FAQAccordion key={index} data={section} />
          ))}
        </div>
      </div>
    </div>
  );
}
