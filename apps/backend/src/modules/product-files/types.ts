import type {
  ProductRegistrationSource,
  ProductRegistrationStatus,
} from "./models/product-registration";

export interface ClaimProductSerialInput {
  serialNumber: string;
  medusaProductId: string;
  customerId: string;
  orderId?: string;
}

export interface CreateEntitledDownloadLinkInput {
  fileId: string;
  customerId: string;
  retrieveFile?: (fileKey: string) => Promise<{ url?: string }>;
}

export interface ProductRegistrationRecord {
  id: string;
  serial_number: string;
  medusa_product_id: string;
  customer_id?: string | null;
  order_id?: string | null;
  status: ProductRegistrationStatus;
  source?: ProductRegistrationSource;
  claimed_at?: Date | string | null;
}

export interface ProductEntitlementFileRecord {
  id: string;
  medusa_product_id: string;
  title: string;
  document_type: string;
  file_key: string;
  file_name?: string | null;
  mime_type?: string | null;
  file_size?: number | null;
  version?: string | null;
  release_notes?: string | null;
  is_active: boolean;
}

export interface CustomerProductFile extends ProductEntitlementFileRecord {
  registration: ProductRegistrationRecord;
}

export interface ProductFileDownload {
  url: string;
  expires_in: number;
}
