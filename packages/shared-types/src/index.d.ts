export { default as MedusaSdkClient } from '@medusajs/js-sdk';
export * from './meilisearch';
export interface StoreConfig {
    name: string;
    description: string;
    url: string;
    currency: string;
    supportedCountries: string[];
}
export interface ApiResponse<T = any> {
    data: T;
    status: number;
    message?: string;
}
export interface PaginationParams {
    page?: number;
    limit?: number;
    offset?: number;
}
export interface PaginatedResponse<T> extends ApiResponse<T[]> {
    pagination: {
        page: number;
        limit: number;
        offset: number;
        total: number;
        totalPages: number;
    };
}
export interface ProductOption {
    id: string;
    title: string;
    values: string[];
}
export interface ProductVariant {
    id: string;
    title: string;
    sku: string;
    price: number;
    compareAtPrice?: number;
    inventoryQuantity: number;
    options: Record<string, string>;
    requiresShipping?: boolean;
}
export interface Address {
    firstName: string;
    lastName: string;
    company?: string;
    address1: string;
    address2?: string;
    city: string;
    province?: string;
    country: string;
    postalCode: string;
    phone?: string;
}
export interface Customer {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    addresses?: Address[];
}
export interface ApiError {
    code: string;
    message: string;
    field?: string;
}
//# sourceMappingURL=index.d.ts.map