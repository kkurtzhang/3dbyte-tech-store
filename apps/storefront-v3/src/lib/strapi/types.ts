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

export interface AboutUsData {
  id: number;
  documentId: string;
  Banner: StrapiImage[];
  OurStory: ContentSection;
  WhyUs: WhyUsSection;
  OurCraftsmanship: ContentSection | null;
  Numbers: NumericalContent[];
}

export interface FAQData {
  id: number;
  FAQSection: FAQSection[];
}

export interface LegalPageData {
  id: number;
  PageContent: string;
}
