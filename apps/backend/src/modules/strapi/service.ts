import { Logger } from "@medusajs/framework/types";

type InjectedDependencies = {
  logger: Logger;
};

interface StrapiConfig {
  apiUrl: string;
  apiToken: string;
}

export interface SyncProductData {
  id: string; //medusaProductId
  title: string;
  handle: string;
}

export interface SyncBrandData {
  id: string; //medusaBrandId
  name: string;
  handle: string;
}

class StrapiModuleService {
  protected logger_: Logger;
  private config_: StrapiConfig;

  constructor({ logger }: InjectedDependencies, options: StrapiConfig) {
    this.logger_ = logger;

    this.config_ = options;

    if (!this.config_.apiToken) {
      this.logger_.warn(
        "STRAPI_API_TOKEN not configured. Strapi integration will be disabled."
      );
    }
  }

  private async makeRequest(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<any> {
    if (!this.config_.apiToken) {
      throw new Error("Strapi API token not configured");
    }

    const url = `${this.config_.apiUrl}/api/${endpoint}`;

    const defaultHeaders = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.config_.apiToken}`,
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...defaultHeaders,
          ...options.headers,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Strapi API error: ${response.status} - ${errorText}`);
      } else if (response.status === 204) {
        return Promise.resolve({}); // Resolve with an empty object for 204
      }

      return await response.json();
    } catch (error) {
      this.logger_.error(
        `Strapi API request failed: ${endpoint}`,
        new Error(error.message)
      );
      throw error;
    }
  }

  //===============Product Description Section===============
  async createProductDescription(product: SyncProductData): Promise<any> {
    try {
      // Check if product description already exists
      const existing = await this.findProductDescription(product.id);
      if (existing) {
        this.logger_.info(
          `Product description already exists for product: ${product.id}`
        );
        return existing;
      }

      const productDescriptionData = {
        data: {
          medusa_product_id: product.id,
          product_title: product.title,
          product_handle: product.handle,
          rich_description: "",
          features: [],
          specifications: {},
          seo_title: product.title,
          seo_description: "",
          meta_keywords: [],
          last_synced: new Date().toISOString(),
          sync_status: "synced",
        },
      };

      const result = await this.makeRequest("product-descriptions", {
        method: "POST",
        body: JSON.stringify(productDescriptionData),
      });

      this.logger_.info(
        `Created product description in Strapi for product: ${product.id}`
      );
      return result.data;
    } catch (error) {
      this.logger_.error(
        `Failed to create product description for ${product.id}`,
        new Error(error.message)
      );
      throw error;
    }
  }

  async updateProductDescription(product: SyncProductData): Promise<any> {
    try {
      const existing = await this.findProductDescription(product.id);
      if (!existing) {
        // If it doesn't exist, create it
        return await this.createProductDescription(product);
      }

      // Only update fields that are synced from Medusa
      const updateData = {
        data: {
          product_title: product.title,
          product_handle: product.handle,
          last_synced: new Date().toISOString(),
          sync_status: "synced",
        },
      };

      const result = await this.makeRequest(
        `product-descriptions/${existing.documentId}`,
        {
          method: "PUT",
          body: JSON.stringify(updateData),
        }
      );

      this.logger_.info(
        `Updated product description in Strapi for product: ${product.id}`
      );
      return result.data;
    } catch (error) {
      this.logger_.error(
        `Failed to update product description for ${product.id}`,
        new Error(error.message)
      );
      throw error;
    }
  }

  async deleteProductDescription(medusaProductId: string): Promise<void> {
    try {
      const existing = await this.findProductDescription(medusaProductId);
      if (!existing) {
        this.logger_.info(
          `No product description found to delete for product: ${medusaProductId}`
        );
        return;
      }

      await this.makeRequest(`product-descriptions/${existing.documentId}`, {
        method: "DELETE",
      });

      this.logger_.info(
        `Deleted product description from Strapi for product: ${medusaProductId}`
      );
    } catch (error) {
      this.logger_.error(
        `Failed to delete product description for ${medusaProductId}`,
        new Error(error.message)
      );
      throw error;
    }
  }

  async findProductDescription(medusaProductId: string): Promise<any> {
    try {
      const response = await this.makeRequest(
        `product-descriptions?filters[medusa_product_id][$eq]=${medusaProductId}`
      );
      return response.data.length > 0 ? response.data[0] : null;
    } catch (error) {
      this.logger_.error(
        `Failed to find product description for ${medusaProductId}`,
        new Error(error.message)
      );
      return null;
    }
  }

  async getProductDescription(medusaProductId: string): Promise<any> {
    try {
      const productDescription = await this.findProductDescription(
        medusaProductId
      );
      return productDescription;
    } catch (error) {
      this.logger_.error(
        `Failed to get product description for ${medusaProductId}`,
        new Error(error.message)
      );
      throw error;
    }
  }

  async markProductDescriptionOutdated(medusaProductId: string): Promise<void> {
    try {
      const existing = await this.findProductDescription(medusaProductId);
      if (!existing) {
        this.logger_.info(
          `No product description found to mark as outdated for product: ${medusaProductId}`
        );
        return;
      }

      const updateData = {
        data: {
          sync_status: "outdated",
          last_synced: new Date().toISOString(),
        },
      };

      await this.makeRequest(`product-descriptions/${existing.documentId}`, {
        method: "PUT",
        body: JSON.stringify(updateData),
      });

      this.logger_.info(
        `Marked product description as outdated for product: ${medusaProductId}`
      );
    } catch (error) {
      this.logger_.error(
        `Failed to mark product description as outdated for ${medusaProductId}`,
        new Error(error.message)
      );
      throw error;
    }
  }

  async getOutdatedProductDescriptions(): Promise<any[]> {
    try {
      const response = await this.makeRequest(
        `product-descriptions?filters[sync_status][$eq]=outdated`
      );

      return response.data;
    } catch (error) {
      this.logger_.error(
        `Failed to get outdated product descriptions`,
        new Error(error.message)
      );
      throw error;
    }
  }
  //====End======Product Description Section===============

  //===============Brand Description Section===============

  async findBrandDescription(medusaBrandId: string): Promise<any> {
    try {
      const response = await this.makeRequest(
        `brand-descriptions?filters[medusa_brand_id][$eq]=${medusaBrandId}`
      );
      return response.data.length > 0 ? response.data[0] : null;
    } catch (error) {
      this.logger_.error(
        `Failed to find brand description for ${medusaBrandId}`,
        new Error(error.message)
      );
      return null;
    }
  }

  async createBrandDescription(brand: SyncBrandData): Promise<any> {
    try {
      // Check if brand description already exists
      const existing = await this.findBrandDescription(brand.id);
      if (existing) {
        this.logger_.info(
          `Brand description already exists for brand: ${brand.id}`
        );
        return existing;
      }

      const brandDescriptionData = {
        data: {
          medusa_brand_id: brand.id,
          brand_name: brand.name,
          brand_handle: brand.handle,
          rich_description: "",
          seo_title: brand.name,
          seo_description: "",
          meta_keywords: [],
          last_synced: new Date().toISOString(),
          sync_status: "synced",
        },
      };

      const result = await this.makeRequest("brand-descriptions", {
        method: "POST",
        body: JSON.stringify(brandDescriptionData),
      });

      this.logger_.info(
        `Created brand description in Strapi for brand: ${brand.id}`
      );
      return result.data;
    } catch (error) {
      this.logger_.error(
        `Failed to create brand description for ${brand.id}`,
        new Error(error.message)
      );
      throw error;
    }
  }

  async updateBrandDescription(brand: SyncBrandData): Promise<any> {
    try {
      const existing = await this.findBrandDescription(brand.id);
      if (!existing) {
        // If it doesn't exist, create it
        return await this.createBrandDescription(brand);
      }

      // Only update fields that are synced from Medusa
      const updateData = {
        data: {
          brand_name: brand.name,
          brand_handle: brand.handle,
          last_synced: new Date().toISOString(),
          sync_status: "synced",
        },
      };

      const result = await this.makeRequest(
        `brand-descriptions/${existing.documentId}`,
        {
          method: "PUT",
          body: JSON.stringify(updateData),
        }
      );

      this.logger_.info(
        `Updated brand description in Strapi for brand: ${brand.id}`
      );
      return result.data;
    } catch (error) {
      this.logger_.error(
        `Failed to update brand description for ${brand.id}`,
        new Error(error.message)
      );
      throw error;
    }
  }

  async deleteBrandDescription(medusaBrandId: string): Promise<void> {
    try {
      const existing = await this.findBrandDescription(medusaBrandId);
      if (!existing) {
        this.logger_.info(
          `No brand description found to delete for brand: ${medusaBrandId}`
        );
        return;
      }

      await this.makeRequest(`brand-descriptions/${existing.documentId}`, {
        method: "DELETE",
      });

      this.logger_.info(
        `Deleted brand description from Strapi for brand: ${medusaBrandId}`
      );
    } catch (error) {
      this.logger_.error(
        `Failed to delete brand description for ${medusaBrandId}`,
        new Error(error.message)
      );
      throw error;
    }
  }

  async getBrandDescription(medusaBrandId: string): Promise<any> {
    try {
      const brandDescription = await this.findBrandDescription(
        medusaBrandId
      );
      return brandDescription;
    } catch (error) {
      this.logger_.error(
        `Failed to get brand description for ${medusaBrandId}`,
        new Error(error.message)
      );
      throw error;
    }
  }

  async markBrandDescriptionOutdated(medusaBrandId: string): Promise<void> {
    try {
      const existing = await this.findBrandDescription(medusaBrandId);
      if (!existing) {
        this.logger_.info(
          `No brand description found to mark as outdated for brand: ${medusaBrandId}`
        );
        return;
      }

      const updateData = {
        data: {
          sync_status: "outdated",
          last_synced: new Date().toISOString(),
        },
      };

      await this.makeRequest(`brand-descriptions/${existing.documentId}`, {
        method: "PUT",
        body: JSON.stringify(updateData),
      });

      this.logger_.info(
        `Marked brand description as outdated for brand: ${medusaBrandId}`
      );
    } catch (error) {
      this.logger_.error(
        `Failed to mark brand description as outdated for ${medusaBrandId}`,
        new Error(error.message)
      );
      throw error;
    }
  }

  async getOutdatedBrandDescriptions(): Promise<any[]> {
    try {
      const response = await this.makeRequest(
        `brand-descriptions?filters[sync_status][$eq]=outdated`
      );

      return response.data;
    } catch (error) {
      this.logger_.error(
        `Failed to get outdated brand descriptions`,
        new Error(error.message)
      );
      throw error;
    }
  }

  //====End======Brand Description Section===============

}

export default StrapiModuleService;
