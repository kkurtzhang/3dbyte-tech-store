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
