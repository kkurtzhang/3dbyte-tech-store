import { Metadata } from "next";
import { getAboutUs } from "@/lib/strapi/content";
import { Banner } from "@/features/cms/components/banner";
import { BasicContentSection } from "@/features/cms/components/basic-content-section";
import { FramedTextSection } from "@/features/cms/components/framed-text-section";
import { NumericalSection } from "@/features/cms/components/numerical-section";

export const metadata: Metadata = {
  title: "About Us",
  description: "Learn more about 3D Byte Tech and our mission.",
};

export const revalidate = 3600;

export default async function AboutUsPage() {
  const response = await getAboutUs();
  const {
    Banner: bannerData,
    OurStory,
    WhyUs,
    OurCraftsmanship,
    Numbers,
  } = response.data;

  return (
    <main>
      {bannerData && <Banner data={bannerData} />}

      <div className="container py-8 space-y-12">
        {OurStory && <BasicContentSection data={OurStory} />}
        {WhyUs && <FramedTextSection data={WhyUs} />}
        {OurCraftsmanship && (
          <BasicContentSection data={OurCraftsmanship} reversed />
        )}
        {Numbers && <NumericalSection data={Numbers} />}
      </div>
    </main>
  );
}
