import { Metadata } from "next";
import { getContentPage } from "@/lib/strapi/content";
import { MdxContent } from "@/features/cms/components/mdx-content";

export const metadata: Metadata = {
  title: "Shipping Information",
  description: "Learn about our shipping options and delivery times.",
};

export const revalidate = 3600;

export default async function ShippingPage() {
  const response = await getContentPage("shipping");
  const { PageContent } = response.data;

  return (
    <div className="container py-12 md:py-16 max-w-4xl">
      <h1 className="text-4xl font-bold tracking-tight mb-8">Shipping Information</h1>
      <MdxContent content={PageContent} />
    </div>
  );
}
