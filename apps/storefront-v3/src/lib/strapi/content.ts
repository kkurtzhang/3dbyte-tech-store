import { strapiClient } from "./client";
import qs from "qs";
import { StrapiResponse, AboutUsData, FAQData, LegalPageData } from "./types";

export async function getStrapiContent<T = any>(
  collectionType: string,
  params: Record<string, any> = {},
) {
  const query = qs.stringify(
    {
      populate: "*",
      ...params,
    },
    {
      encodeValuesOnly: true,
    },
  );

  return strapiClient.fetch<T>(`/${collectionType}?${query}`);
}

export async function getAboutUs() {
  const query = qs.stringify({
    populate: {
      Banner: {
        populate: "*",
      },
      OurStory: {
        populate: {
          Image: {
            populate: "*",
          },
        },
      },
      WhyUs: {
        populate: {
          Tile: {
            populate: {
              Image: {
                populate: "*",
              },
            },
          },
        },
      },
      OurCraftsmanship: {
        populate: {
          Image: {
            populate: "*",
          },
        },
      },
      Numbers: {
        populate: "*",
      },
    },
  });

  return strapiClient.fetch<StrapiResponse<AboutUsData>>(`/about-us?${query}`);
}

export async function getFAQ() {
  const query = qs.stringify({
    populate: {
      FAQSection: {
        populate: {
          Question: "*",
        },
      },
    },
  });

  return strapiClient.fetch<StrapiResponse<FAQData>>(`/faq?${query}`);
}

export async function getContentPage(slug: string) {
  // Mapping slugs to content types if they differ
  // Based on the provided file paths:
  // privacy-policy -> privacy-policy
  // terms-and-conditions -> terms-and-condition

  return strapiClient.fetch<StrapiResponse<LegalPageData>>(`/${slug}`);
}

export interface RichTextContent {
  id: number;
  rich_text: string;
  medusa_id: string;
  createdAt: string;
  updatedAt: string;
}
