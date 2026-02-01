import { Metadata } from "next";
import { getContentPage } from "@/lib/strapi/content";
import { MdxContent } from "@/features/cms/components/mdx-content";

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description: "Read our terms and conditions for using our services.",
};

export const revalidate = 3600;

export default async function TermsAndConditionsPage() {
  // Note: Using 'terms-and-condition' singular as per schema collectionName
  const response = await getContentPage("terms-and-condition");
  const { PageContent } = response.data;

  return (
    <div className="container py-12 md:py-16 max-w-4xl">
      <h1 className="text-4xl font-bold tracking-tight mb-8">
        Terms & Conditions
      </h1>
      <MdxContent content={PageContent} />
    </div>
  );
}
