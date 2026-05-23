export type ProductDocumentType =
  | "manual"
  | "datasheet"
  | "install_guide"
  | "safety_sheet"
  | "warranty"
  | "other";

export interface PublicProductDocument {
  id: string;
  medusa_product_id: string;
  product_handle: string;
  product_title: string;
  title: string;
  document_type: ProductDocumentType;
  version?: string;
  language?: string;
  file_name?: string;
  file_size?: number;
  public_download_path: string;
  search_keywords?: string[];
  sort_order?: number;
  published_at_timestamp?: number;
}

export interface CustomerProductFile {
  id: string;
  medusa_product_id: string;
  title: string;
  document_type: string;
  file_name?: string | null;
  file_size?: number | null;
  version?: string | null;
  release_notes?: string | null;
  registration: {
    serial_number: string;
    medusa_product_id: string;
  };
}
