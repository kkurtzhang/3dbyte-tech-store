// Shared utilities for 3D Byte Tech Store
// API utilities
export class ApiClient {
    baseUrl;
    defaultHeaders;
    constructor(baseUrl, defaultHeaders = {}) {
        this.baseUrl = baseUrl.replace(/\/$/, '');
        this.defaultHeaders = {
            'Content-Type': 'application/json',
            ...defaultHeaders,
        };
    }
    async request(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        const headers = {
            ...this.defaultHeaders,
            ...options.headers,
        };
        try {
            const response = await fetch(url, {
                ...options,
                headers,
            });
            const data = await response.json();
            return {
                data: data,
                status: response.status,
                message: data?.message,
            };
        }
        catch (error) {
            throw new Error(`API request failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async get(endpoint) {
        return this.request(endpoint, { method: 'GET' });
    }
    async post(endpoint, data) {
        return this.request(endpoint, {
            method: 'POST',
            body: data ? JSON.stringify(data) : null,
        });
    }
    async put(endpoint, data) {
        return this.request(endpoint, {
            method: 'PUT',
            body: data ? JSON.stringify(data) : null,
        });
    }
    async delete(endpoint) {
        return this.request(endpoint, { method: 'DELETE' });
    }
}
// Format utilities
export const formatPrice = (amount, currency = 'USD', locale = 'en-US') => {
    return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
    }).format(amount / 100); // Assuming amount is in cents
};
export const formatDate = (date, locale = 'en-US') => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString(locale);
};
export const slugify = (text) => {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9 -]/g, '')
        .replace(/[\s-]+/g, '-')
        .replace(/^-+|-+$/g, '');
};
// Validation utilities
export const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};
export const validatePostalCode = (postalCode, country = 'US') => {
    const patterns = {
        US: /^\d{5}(-\d{4})?$/,
        CA: /^[A-Z]\d[A-Z] \d[A-Z]\d$/,
        UK: /^[A-Z]{1,2}\d[A-Z\d]? \d[A-Z]{2}$/,
    };
    const pattern = patterns[country];
    if (!pattern)
        return true; // Accept any format for unspecified countries
    return pattern.test(postalCode.toUpperCase());
};
// Storage utilities
export const storage = {
    get: (key) => {
        if (typeof window === 'undefined')
            return null;
        try {
            const item = window.localStorage.getItem(key);
            return item ? JSON.parse(item) : null;
        }
        catch {
            return null;
        }
    },
    set: (key, value) => {
        if (typeof window === 'undefined')
            return;
        try {
            window.localStorage.setItem(key, JSON.stringify(value));
        }
        catch {
            // Silently fail
        }
    },
    remove: (key) => {
        if (typeof window === 'undefined')
            return;
        window.localStorage.removeItem(key);
    },
};
// Error utilities
export class AppError extends Error {
    code;
    statusCode;
    constructor(message, code = 'UNKNOWN_ERROR', statusCode = 500) {
        super(message);
        this.code = code;
        this.statusCode = statusCode;
        this.name = 'AppError';
    }
}
export const createError = (message, code) => {
    return new AppError(message, code);
};
//# sourceMappingURL=index.js.map