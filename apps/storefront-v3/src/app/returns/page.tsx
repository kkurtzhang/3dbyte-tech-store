import { Metadata } from "next";
import { getContentPage } from "@/lib/strapi/content";
import { MdxContent } from "@/features/cms/components/mdx-content";

export const metadata: Metadata = {
  title: "Returns & Refunds",
  description: "Learn about our returns and refunds policy.",
};

export const revalidate = 3600;

export default async function ReturnsPage() {
  const response = await getContentPage("returns");
  const { PageContent } = response.data;

  return (
    <div className="container py-12 md:py-16 max-w-4xl">
      <h1 className="text-4xl font-bold tracking-tight mb-8">Returns & Refunds</h1>
      <MdxContent content={PageContent} />
    </div>
  );
}
