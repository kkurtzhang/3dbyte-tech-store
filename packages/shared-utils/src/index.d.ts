export interface ApiResponse<T = any> {
    data: T;
    status: number;
    message?: string;
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
export interface StoreConfig {
    name: string;
    description: string;
    url: string;
    currency: string;
    supportedCountries: string[];
}
declare global {
    interface Window {
        localStorage: Storage;
    }
}
export declare class ApiClient {
    private baseUrl;
    private defaultHeaders;
    constructor(baseUrl: string, defaultHeaders?: Record<string, string>);
    private request;
    get<T>(endpoint: string): Promise<ApiResponse<T>>;
    post<T>(endpoint: string, data?: any): Promise<ApiResponse<T>>;
    put<T>(endpoint: string, data?: any): Promise<ApiResponse<T>>;
    delete<T>(endpoint: string): Promise<ApiResponse<T>>;
}
export declare const formatPrice: (amount: number, currency?: string, locale?: string) => string;
export declare const formatDate: (date: string | Date, locale?: string) => string;
export declare const slugify: (text: string) => string;
export declare const validateEmail: (email: string) => boolean;
export declare const validatePostalCode: (postalCode: string, country?: string) => boolean;
export declare const storage: {
    get: <T>(key: string) => T | null;
    set: <T>(key: string, value: T) => void;
    remove: (key: string) => void;
};
export declare class AppError extends Error {
    code: string;
    statusCode: number;
    constructor(message: string, code?: string, statusCode?: number);
}
export declare const createError: (message: string, code?: string) => AppError;
//# sourceMappingURL=index.d.ts.map