import { Metadata } from "next";
import { getContentPage } from "@/lib/strapi/content";
import { MdxContent } from "@/features/cms/components/mdx-content";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Read our privacy policy to understand how we handle your data.",
};

export const revalidate = 3600;

export default async function PrivacyPolicyPage() {
  const response = await getContentPage("privacy-policy");
  const { PageContent } = response.data;

  return (
    <div className="container py-12 md:py-16 max-w-4xl">
      <h1 className="text-4xl font-bold tracking-tight mb-8">Privacy Policy</h1>
      <MdxContent content={PageContent} />
    </div>
  );
}
