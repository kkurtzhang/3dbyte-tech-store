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
