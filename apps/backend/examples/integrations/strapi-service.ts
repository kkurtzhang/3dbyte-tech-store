/**
 * Strapi Service for Medusa Backend
 * 
 * Demonstrates:
 * - Integrating Strapi with Medusa
 * - Caching strategies
 * - Data transformation
 * - Error handling
 */

import { StrapiClient, createStrapiClient } from './strapi-client';

// Content type definitions
export interface BlogPost {
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  publishedAt: string;
  author: {
    name: string;
    avatar: string;
  };
  coverImage: {
    url: string;
    alternativeText: string;
  };
  categories: Array<{
    name: string;
    slug: string;
  }>;
  seo: {
    metaTitle: string;
    metaDescription: string;
  };
}

export interface LandingPage {
  title: string;
  slug: string;
  sections: Array<{
    __component: string;
    [key: string]: any;
  }>;
}

export interface FAQItem {
  question: string;
  answer: string;
  category: string;
  order: number;
}

/**
 * Service for managing CMS content from Strapi
 */
export class StrapiService {
  private client: StrapiClient;
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private cacheTTL: number = 5 * 60 * 1000; // 5 minutes

  constructor() {
    this.client = createStrapiClient({
      url: process.env.STRAPI_URL || 'http://localhost:1337',
      token: process.env.STRAPI_API_TOKEN || '',
      timeout: 10000,
    });
  }

  /**
   * Get a single blog post by slug
   */
  async getBlogPost(slug: string): Promise<BlogPost | null> {
    const cacheKey = `blog-post:${slug}`;
    
    // Check cache first
    const cached = this.getFromCache<BlogPost>(cacheKey);
    if (cached) return cached;

    try {
      const { data } = await this.client.findMany<BlogPost>('blog-posts', {
        filters: {
          slug: { $eq: slug },
          publishedAt: { $notNull: true },
        },
        populate: ['author', 'coverImage', 'categories', 'seo'],
      });

      const post = data[0] || null;
      
      if (post) {
        this.setCache(cacheKey, post);
      }

      return post;
    } catch (error) {
      console.error(`Error fetching blog post ${slug}:`, error);
      return null;
    }
  }

  /**
   * Get paginated blog posts
   */
  async getBlogPosts(params?: {
    page?: number;
    pageSize?: number;
    category?: string;
    tag?: string;
  }): Promise<{
    posts: BlogPost[];
    pagination: {
      page: number;
      pageSize: number;
      pageCount: number;
      total: number;
    };
  }> {
    const filters: any = {
      publishedAt: { $notNull: true },
    };

    if (params?.category) {
      filters.categories = {
        slug: { $eq: params.category },
      };
    }

    if (params?.tag) {
      filters.tags = {
        slug: { $eq: params.tag },
      };
    }

    try {
      const result = await this.client.findMany<BlogPost>('blog-posts', {
        filters,
        sort: ['publishedAt:desc'],
        pagination: {
          page: params?.page || 1,
          pageSize: params?.pageSize || 10,
        },
        populate: ['author', 'coverImage', 'categories'],
      });

      return {
        posts: result.data,
        pagination: result.pagination,
      };
    } catch (error) {
      console.error('Error fetching blog posts:', error);
      return {
        posts: [],
        pagination: { page: 1, pageSize: 10, pageCount: 0, total: 0 },
      };
    }
  }

  /**
   * Get landing page by slug
   */
  async getLandingPage(slug: string): Promise<LandingPage | null> {
    const cacheKey = `landing-page:${slug}`;
    
    const cached = this.getFromCache<LandingPage>(cacheKey);
    if (cached) return cached;

    try {
      const { data } = await this.client.findMany<LandingPage>('landing-pages', {
        filters: { slug: { $eq: slug } },
        populate: 'deep', // Populate all nested components
      });

      const page = data[0] || null;
      
      if (page) {
        this.setCache(cacheKey, page);
      }

      return page;
    } catch (error) {
      console.error(`Error fetching landing page ${slug}:`, error);
      return null;
    }
  }

  /**
   * Get FAQs by category
   */
  async getFAQs(category?: string): Promise<FAQItem[]> {
    const cacheKey = category ? `faqs:${category}` : 'faqs:all';
    
    const cached = this.getFromCache<FAQItem[]>(cacheKey);
    if (cached) return cached;

    try {
      const filters = category
        ? { category: { $eq: category } }
        : undefined;

      const faqs = await this.client.findAll<FAQItem>('faqs', {
        filters,
        sort: ['order:asc', 'question:asc'],
      });

      this.setCache(cacheKey, faqs);
      return faqs;
    } catch (error) {
      console.error('Error fetching FAQs:', error);
      return [];
    }
  }

  /**
   * Search blog posts
   */
  async searchBlogPosts(query: string): Promise<BlogPost[]> {
    try {
      const posts = await this.client.search<BlogPost>('blog-posts', query, {
        fields: ['title', 'content', 'excerpt'],
        populate: ['author', 'coverImage', 'categories'],
      });

      // Filter published posts only
      return posts.filter(post => post.publishedAt);
    } catch (error) {
      console.error('Error searching blog posts:', error);
      return [];
    }
  }

  /**
   * Clear cache for specific key or all
   */
  clearCache(key?: string): void {
    if (key) {
      this.cache.delete(key);
    } else {
      this.cache.clear();
    }
  }

  /**
   * Get item from cache if not expired
   */
  private getFromCache<T>(key: string): T | null {
    const cached = this.cache.get(key);
    
    if (!cached) return null;
    
    const isExpired = Date.now() - cached.timestamp > this.cacheTTL;
    
    if (isExpired) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.data as T;
  }

  /**
   * Set item in cache
   */
  private setCache(key: string, data: any): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }
}

// Singleton instance
let strapiServiceInstance: StrapiService;

/**
 * Get or create Strapi service instance
 */
export function getStrapiService(): StrapiService {
  if (!strapiServiceInstance) {
    strapiServiceInstance = new StrapiService();
  }
  return strapiServiceInstance;
}