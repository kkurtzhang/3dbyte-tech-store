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

export type AnnouncementBarIcon =
  | "sparkles"
  | "truck"
  | "package"
  | "shield-check"
  | "badge-percent"
  | "gift"
  | "clock"
  | "bell";

export interface AnnouncementBarItemData {
  id: number;
  Text: string;
  Link?: string | null;
  Icon?: AnnouncementBarIcon | null;
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

export interface HomepageSection {
  id: number;
  Enabled?: boolean | null;
  Eyebrow?: string | null;
  Heading?: string | null;
  Text?: string | null;
  CTA?: HomepageCta | null;
}

export interface HomepageGuidesHelpCard {
  id: number;
  Eyebrow?: string | null;
  Icon?: string | null;
  Link?: string | null;
  LinkText?: string | null;
  Text?: string | null;
  Title: string;
}

export interface HomepageGuidesHelpSection {
  id: number;
  Enabled?: boolean | null;
  Eyebrow?: string | null;
  Heading?: string | null;
  Text?: string | null;
  Cards?: HomepageGuidesHelpCard[];
}

export interface HomepageSupportStrip {
  id: number;
  Enabled?: boolean | null;
  Label?: string | null;
  Text?: string | null;
  CTA?: HomepageCta | null;
}

export type CampaignPlacementTheme =
  | "default"
  | "sale"
  | "new-arrival"
  | "clearance";

export interface CampaignPlacementData {
  id: number;
  CampaignIdentifier: string;
  Enabled?: boolean | null;
  Priority?: number | null;
  Eyebrow?: string | null;
  Headline: string;
  Text?: string | null;
  Image?: StrapiImage | null;
  CTA?: HomepageCta | null;
  BadgeText?: string | null;
  Theme?: CampaignPlacementTheme | null;
}

export interface HomepageData {
  id: number;
  HeroBanner?: HomepageHeroBanner | null;
  MidBanner?: HomepageHeroBanner | null;
  CollectionsSection?: HomepageSection | null;
  ProductsSection?: HomepageSection | null;
  GuidesHelpSection?: HomepageGuidesHelpSection | null;
  SupportStrip?: HomepageSupportStrip | null;
  QuickLinksHeading?: string | null;
  QuickLinks?: HomepageCta[];
  TrustStats?: HomepageStat[];
  AnnouncementBarItems?: AnnouncementBarItemData[];
}

export interface HelpArticleData {
  id: number;
  Title: string;
}

export interface HelpCategoryData {
  id: number;
  Title: string;
  Description?: string | null;
  Href: string;
  Icon?: string | null;
  Articles?: HelpArticleData[];
}

export interface HelpPopularResourceData {
  id: number;
  Title: string;
  Category?: string | null;
  Href: string;
}

export interface HelpContactOptionData {
  id: number;
  Title: string;
  Description?: string | null;
  Value?: string | null;
  Action?: string | null;
  Href: string;
  Icon?: string | null;
}

export interface HelpCenterData {
  id: number;
  Heading?: string | null;
  Subheading?: string | null;
  Categories?: HelpCategoryData[];
  PopularResources?: HelpPopularResourceData[];
  ContactOptions?: HelpContactOptionData[];
}

export interface GuidesFeaturedGuideData {
  id: number;
  Title: string;
  Category?: string | null;
  ReadTime?: string | null;
  Rating?: string | null;
  Description?: string | null;
  Href?: string | null;
  Icon?: string | null;
}

export interface GuidesGuideLinkData {
  id: number;
  Title: string;
  Href?: string | null;
}

export interface GuidesCategoryData {
  id: number;
  Title: string;
  Description?: string | null;
  Icon?: string | null;
  Tone?: string | null;
  Guides?: GuidesGuideLinkData[];
}

export interface GuidesQuickLinkData {
  id: number;
  Title: string;
  Href: string;
  Icon?: string | null;
}

export interface GuidesPageData {
  id: number;
  Heading?: string | null;
  Subheading?: string | null;
  FeaturedGuides?: GuidesFeaturedGuideData[];
  Categories?: GuidesCategoryData[];
  QuickLinks?: GuidesQuickLinkData[];
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
  seo_title?: string | null;
  seo_description?: string | null;
  search_keywords?: string[] | null;
  FeaturedImage?: StrapiImage;
  open_graph_image?: StrapiImage | null;
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
