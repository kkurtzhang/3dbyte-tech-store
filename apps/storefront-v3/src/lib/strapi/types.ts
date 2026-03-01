export interface StrapiImage {
  id: number;
  url: string;
  alternativeText?: string;
  width: number;
  height: number;
}

export interface StrapiResponse<T> {
  data: T;
  meta: {
    pagination?: {
      page: number;
      pageSize: number;
      pageCount: number;
      total: number;
    };
  };
}

export interface ContentSection {
  id: number;
  Title: string;
  Text: string;
  Image?: StrapiImage;
}

export interface Tile {
  id: number;
  Title: string;
  Text: string;
  Image?: StrapiImage;
}

export interface WhyUsSection {
  id: number;
  Title: string;
  Tile: Tile[];
}

export interface NumericalContent {
  id: number;
  Title: string;
  Text: string;
}

export interface FAQItem {
  id: number;
  Title: string;
  Text: string;
}

export interface FAQSection {
  id: number;
  Title: string;
  Bookmark: string;
  Question: FAQItem[];
}

export interface TimelineItem {
  id: number;
  year: number;
  title: string;
  description: string;
}

export interface TeamMember {
  id: number;
  name: string;
  role: string;
  bio: string;
  image?: StrapiImage;
}

export interface AboutUsData {
  id: number;
  documentId: string;
  Banner: StrapiImage[];
  OurStory: ContentSection;
  WhyUs: WhyUsSection;
  OurCraftsmanship: ContentSection | null;
  Numbers: NumericalContent[];
  Timeline: TimelineItem[];
  Team: TeamMember[];
}

export interface FAQData {
  id: number;
  FAQSection: FAQSection[];
}

export interface LegalPageData {
  id: number;
  PageContent: string;
}

export interface HomepageCta {
  id: number;
  BtnText?: string;
  BtnLink?: string;
}

export interface HomepageFeatureTag {
  id: number;
  Text: string;
}

export interface HomepageStat {
  id: number;
  Value: string;
  Label: string;
}

export interface HomepageHeroBanner {
  id: number;
  Eyebrow?: string;
  Headline: string;
  Text?: string;
  CTA?: HomepageCta | null;
  SecondaryCTA?: HomepageCta | null;
  FeatureTags?: HomepageFeatureTag[];
  Image?: StrapiImage | null;
}

export interface HomepageData {
  id: number;
  HeroBanner?: HomepageHeroBanner | null;
  MidBanner?: HomepageHeroBanner | null;
  QuickLinksHeading?: string | null;
  QuickLinks?: HomepageCta[];
  TrustStats?: HomepageStat[];
}

export interface BrandDescriptionData {
  id: number;
  medusa_brand_id: string;
  brand_name: string;
  brand_handle: string;
  brand_logo?: StrapiImage | null;
  rich_description?: string | null;
  seo_title?: string | null;
  seo_description?: string | null;
  sync_status?: "synced" | "outdated" | "manual";
}

export interface CollectionDescriptionData {
  id: number;
  documentId: string;
  Title: string;
  Handle: string;
  Description: string;
  Image?: StrapiImage | null;
}

// Blog Types
export interface BlogPostCategory {
  id: number;
  documentId: string;
  Title: string;
  Slug: string;
}

export interface BlogPost {
  id: number;
  documentId: string;
  Title: string;
  Slug: string;
  Content: string;
  Excerpt?: string;
  FeaturedImage?: StrapiImage;
  Categories?: BlogPostCategory[];
  publishedAt: string;
  createdAt: string;
}

export interface BlogListResponse {
  data: BlogPost[];
  meta: {
    pagination: {
      page: number;
      pageSize: number;
      pageCount: number;
      total: number;
    };
  };
}

export interface BlogCategoryListResponse {
  data: BlogPostCategory[];
  meta: {
    pagination: {
      page: number;
      pageSize: number;
      pageCount: number;
      total: number;
    };
  };
}
