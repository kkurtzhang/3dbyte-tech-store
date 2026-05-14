import {
  AdminProduct,
  FindParams,
  PaginatedResponse,
} from "@medusajs/framework/types";

export type AdminBrand = {
  id: string;
  name: string;
  handle: string;
  products: AdminProduct[];
};
export type AdminBrandResponse = {
  brand: AdminBrand;
};

export type AdminBrandsResponse = PaginatedResponse<{
  brands: AdminBrand[];
}>;

export type AdminCreateBrand = {
  name: string;
  handle?: string;
};

export type AdminCreateBrandResponse = {
  id: string;
  name: string;
  handle: string;
};

export type AdminUpdateBrand = {
  name: string;
  handle?: string;
};

export type AdminUpdateBrandResponse = {
  id: string;
  name: string;
  handle: string;
};

export interface BrandQueryParams extends FindParams {}

export type RemoveProductFromBrandParams = {
  products: string[];
};

export type AddProductToBrandParams = {
  products: string[];
};

export type UpdateLinkParams = {
  products: string[];
};

export type BatchDismissLinksBrandsProductsParams = {
  ids: { product_id: string; brand_id: string }[];
};

export type AdminBundledProductItem = {
  id: string;
  quantity: number;
  product?: {
    id: string;
    title: string;
  } | {
    id: string;
    title: string;
  }[] | null;
};

export type AdminBundledProduct = {
  id: string;
  title: string;
  product?: {
    id: string;
    title?: string | null;
  } | {
    id: string;
    title?: string | null;
  }[] | null;
  items?: AdminBundledProductItem[] | null;
  created_at: string;
  updated_at: string;
};

export type AdminBundledProductsResponse = {
  bundled_products: AdminBundledProduct[];
  count: number;
  limit: number;
  offset: number;
};

export interface BundledProductQueryParams extends FindParams {}

export type AdminWaitlistEntry = {
  id: string;
  customer_email: string;
  customer_id?: string | null;
  product_id: string;
  product_variant_id?: string | null;
  product_handle: string;
  product_title: string;
  variant_title?: string | null;
  notified: boolean;
  notification_count?: number | null;
  created_at?: string | null;
  notified_at?: string | null;
  last_notified_at?: string | null;
};

export type AdminWaitlistDemand = {
  product_id: string;
  product_variant_id: string | null;
  product_handle: string;
  product_title: string;
  variant_title: string | null;
  queued_count: number;
  notified_count: number;
  total_count: number;
};

export type AdminWaitlistEntriesResponse = {
  entries: AdminWaitlistEntry[];
  count: number;
  limit: number;
  offset: number;
};

export type AdminWaitlistDemandResponse = {
  demand: AdminWaitlistDemand[];
};

export interface WaitlistQueryParams extends FindParams {
  product_id?: string;
  q?: string;
  status?: "all" | "queued" | "notified";
}

export type SendWaitlistTestNotificationParams = {
  email: string;
  waitlist_id: string;
};
