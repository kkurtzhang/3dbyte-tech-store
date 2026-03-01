import { strapiClient } from "./client";
import qs from "qs";
import {
  StrapiResponse,
  AboutUsData,
  FAQData,
  LegalPageData,
  BlogListResponse,
  BlogCategoryListResponse,
  HomepageData,
  BrandDescriptionData,
  CollectionDescriptionData,
} from "./types";

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
      Timeline: {
        populate: "*",
      },
      Team: {
        populate: {
          image: {
            populate: "*",
          },
        },
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

export async function getHomepage() {
  const query = qs.stringify(
    {
      populate: {
        HeroBanner: {
          populate: {
            CTA: true,
            SecondaryCTA: true,
            FeatureTags: true,
            Image: true,
          },
        },
        MidBanner: {
          populate: {
            CTA: true,
            SecondaryCTA: true,
            FeatureTags: true,
            Image: true,
          },
        },
        QuickLinks: true,
        TrustStats: true,
      },
    },
    { encodeValuesOnly: true }
  );

  return strapiClient.fetch<StrapiResponse<HomepageData>>(`/homepage?${query}`);
}

export async function getBrandDescriptions() {
  const query = qs.stringify(
    {
      pagination: {
        page: 1,
        pageSize: 200,
      },
      sort: ["brand_name:asc"],
      populate: {
        brand_logo: true,
      },
    },
    { encodeValuesOnly: true }
  );

  return strapiClient.fetch<StrapiResponse<BrandDescriptionData[]>>(
    `/brand-descriptions?${query}`,
    {
      tags: ["brand-descriptions"],
    }
  );
}

export async function getBrandDescriptionByHandle(handle: string) {
  const query = qs.stringify(
    {
      filters: {
        brand_handle: {
          $eq: handle,
        },
      },
      pagination: {
        page: 1,
        pageSize: 1,
      },
      populate: {
        brand_logo: true,
      },
    },
    { encodeValuesOnly: true }
  );

  const response = await strapiClient.fetch<StrapiResponse<BrandDescriptionData[]>>(
    `/brand-descriptions?${query}`,
    {
      tags: [`brand-description-${handle}`],
    }
  );

  return response.data[0] || null;
}

export async function getCollectionDescriptions() {
  const query = qs.stringify(
    {
      pagination: {
        page: 1,
        pageSize: 200,
      },
      sort: ["Title:asc"],
      populate: {
        Image: true,
      },
    },
    { encodeValuesOnly: true }
  );

  return strapiClient.fetch<StrapiResponse<CollectionDescriptionData[]>>(
    `/collections?${query}`,
    {
      tags: ["collections-content"],
    }
  );
}

export async function getCollectionDescriptionByHandle(handle: string) {
  const query = qs.stringify(
    {
      filters: {
        Handle: {
          $eq: handle,
        },
      },
      pagination: {
        page: 1,
        pageSize: 1,
      },
      populate: {
        Image: true,
      },
    },
    { encodeValuesOnly: true }
  );

  const response = await strapiClient.fetch<StrapiResponse<CollectionDescriptionData[]>>(
    `/collections?${query}`,
    {
      tags: [`collection-content-${handle}`],
    }
  );

  return response.data[0] || null;
}

export interface RichTextContent {
  id: number;
  rich_text: string;
  medusa_id: string;
  createdAt: string;
  updatedAt: string;
}

// Blog Functions
export async function getBlogPosts(options?: {
  sortBy?: string;
  category?: string;
  query?: string;
  limit?: number;
}) {
  const { sortBy = 'publishedAt:desc', category, query, limit = 100 } = options || {};

  let endpoint = `/blogs?populate[0]=FeaturedImage&populate[1]=Categories&sort=${sortBy}&pagination[limit]=${limit}`;

  if (query) {
    endpoint += `&filters[Title][$contains]=${encodeURIComponent(query)}`;
  }

  if (category) {
    endpoint += `&filters[Categories][Slug][$eq]=${encodeURIComponent(category)}`;
  }

  return strapiClient.fetch<BlogListResponse>(endpoint, {
    tags: ['blog'],
  });
}

export async function getBlogPostBySlug(slug: string) {
  const endpoint = `/blogs?filters[Slug][$eq]=${encodeURIComponent(slug)}&populate=*`;

  return strapiClient.fetch<BlogListResponse>(endpoint, {
    tags: [`blog-${slug}`],
  });
}

export async function getBlogPostCategories() {
  const endpoint = `/blog-post-categories?sort=createdAt:desc&pagination[limit]=100`;

  return strapiClient.fetch<BlogCategoryListResponse>(endpoint, {
    tags: ['blog-categories'],
  });
}
