/**
 * Strapi CMS Integration Client
 * 
 * Demonstrates:
 * - Fetching content from Strapi
 * - Type-safe API calls
 * - Error handling
 * - Response caching
 * - Pagination handling
 */

import axios, { AxiosInstance } from 'axios';

interface StrapiConfig {
  url: string;
  token: string;
  timeout?: number;
}

interface StrapiPagination {
  page: number;
  pageSize: number;
  pageCount: number;
  total: number;
}

interface StrapiResponse<T> {
  data: T;
  meta: {
    pagination?: StrapiPagination;
  };
}

interface StrapiSingleResponse<T> {
  data: {
    id: number;
    attributes: T;
  };
  meta: {};
}

interface StrapiCollectionResponse<T> {
  data: Array<{
    id: number;
    attributes: T;
  }>;
  meta: {
    pagination: StrapiPagination;
  };
}

/**
 * Strapi CMS Client
 * Handles all communication with Strapi headless CMS
 */
export class StrapiClient {
  private client: AxiosInstance;

  constructor(config: StrapiConfig) {
    this.client = axios.create({
      baseURL: `${config.url}/api`,
      timeout: config.timeout || 5000,
      headers: {
        'Authorization': `Bearer ${config.token}`,
        'Content-Type': 'application/json',
      },
    });

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        console.error('Strapi API Error:', {
          message: error.message,
          status: error.response?.status,
          data: error.response?.data,
        });
        throw new Error(`Strapi API Error: ${error.message}`);
      }
    );
  }

  /**
   * Fetch a single item by ID
   * 
   * @example
   * const blogPost = await client.findOne('blog-posts', '1', {
   *   populate: ['author', 'categories']
   * });
   */
  async findOne<T>(
    collection: string,
    id: string | number,
    params?: {
      populate?: string | string[];
      fields?: string[];
    }
  ): Promise<T> {
    const response = await this.client.get<StrapiSingleResponse<T>>(
      `/${collection}/${id}`,
      { params: this.buildQueryParams(params) }
    );
    return response.data.data.attributes;
  }

  /**
   * Fetch multiple items with pagination
   * 
   * @example
   * const { data, pagination } = await client.findMany('blog-posts', {
   *   filters: { category: { slug: { $eq: 'tech' } } },
   *   sort: ['publishedAt:desc'],
   *   pagination: { page: 1, pageSize: 10 },
   *   populate: ['author', 'coverImage']
   * });
   */
  async findMany<T>(
    collection: string,
    params?: {
      filters?: Record<string, any>;
      sort?: string[];
      pagination?: {
        page?: number;
        pageSize?: number;
      };
      populate?: string | string[];
      fields?: string[];
    }
  ): Promise<{
    data: T[];
    pagination: StrapiPagination;
  }> {
    const response = await this.client.get<StrapiCollectionResponse<T>>(
      `/${collection}`,
      { params: this.buildQueryParams(params) }
    );

    return {
      data: response.data.data.map(item => item.attributes),
      pagination: response.data.meta.pagination,
    };
  }

  /**
   * Fetch all items (handles pagination automatically)
   * Use with caution for large datasets
   * 
   * @example
   * const allPosts = await client.findAll('blog-posts', {
   *   filters: { status: { $eq: 'published' } }
   * });
   */
  async findAll<T>(
    collection: string,
    params?: {
      filters?: Record<string, any>;
      sort?: string[];
      populate?: string | string[];
      fields?: string[];
    }
  ): Promise<T[]> {
    const allItems: T[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const { data, pagination } = await this.findMany<T>(collection, {
        ...params,
        pagination: { page, pageSize: 100 },
      });

      allItems.push(...data);
      hasMore = page < pagination.pageCount;
      page++;
    }

    return allItems;
  }

  /**
   * Search across content
   * 
   * @example
   * const results = await client.search('blog-posts', 'typescript', {
   *   fields: ['title', 'content']
   * });
   */
  async search<T>(
    collection: string,
    query: string,
    params?: {
      fields?: string[];
      populate?: string | string[];
    }
  ): Promise<T[]> {
    const filters = params?.fields
      ? {
          $or: params.fields.map(field => ({
            [field]: { $containsi: query },
          })),
        }
      : { $search: query };

    const { data } = await this.findMany<T>(collection, {
      filters,
      populate: params?.populate,
    });

    return data;
  }

  /**
   * Build query parameters for Strapi API
   */
  private buildQueryParams(params?: any): Record<string, any> {
    if (!params) return {};

    const query: Record<string, any> = {};

    // Handle filters
    if (params.filters) {
      query.filters = params.filters;
    }

    // Handle sort
    if (params.sort) {
      query.sort = Array.isArray(params.sort) 
        ? params.sort 
        : [params.sort];
    }

    // Handle pagination
    if (params.pagination) {
      query.pagination = params.pagination;
    }

    // Handle populate
    if (params.populate) {
      query.populate = Array.isArray(params.populate)
        ? params.populate.join(',')
        : params.populate;
    }

    // Handle fields
    if (params.fields) {
      query.fields = Array.isArray(params.fields)
        ? params.fields.join(',')
        : params.fields;
    }

    return query;
  }
}

/**
 * Factory function to create Strapi client
 */
export function createStrapiClient(config: StrapiConfig): StrapiClient {
  return new StrapiClient(config);
}