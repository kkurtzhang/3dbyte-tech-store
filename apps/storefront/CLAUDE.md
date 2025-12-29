# Storefront (Next.js) - Context Engineering Rules

> **Parent Context**: Always read `/CLAUDE.md` first for global monorepo rules.

## NEXT.JS 16.1.0 & REACT 19 SPECIFICS

### Architecture Overview
- **Framework**: Next.js 16.1.0 with App Router
- **React**: 19.2.3 with Server Components
- **Styling**: Tailwind CSS + Medusa UI
- **State**: React Context + Server State
- **Forms**: React Hook Form + Zod
- **API**: Server Actions + Route Handlers

### Directory Structure
```
storefront/
├── app/
│   ├── (shop)/              # Shop layout group
│   │   ├── page.tsx        # Homepage
│   │   ├── products/
│   │   │   ├── [handle]/
│   │   │   │   └── page.tsx
│   │   │   └── page.tsx
│   │   ├── cart/
│   │   ├── checkout/
│   │   └── account/
│   ├── blog/               # Blog from CMS
│   │   ├── [slug]/
│   │   └── page.tsx
│   ├── api/               # API routes
│   │   ├── revalidate/
│   │   └── webhooks/
│   ├── layout.tsx         # Root layout
│   └── error.tsx          # Error boundary
├── components/
│   ├── ui/               # Base UI components
│   ├── shop/             # Shop-specific components
│   ├── blog/             # Blog components
│   └── layout/           # Layout components
├── lib/
│   ├── medusa/           # Medusa client & helpers
│   ├── strapi/           # Strapi client & helpers
│   ├── utils/            # Utility functions
│   └── hooks/            # Custom React hooks
├── actions/              # Server Actions
├── types/                # TypeScript definitions
└── public/               # Static assets
```

## SERVER COMPONENTS (DEFAULT)

### Server Component Patterns
```typescript
// app/(shop)/products/page.tsx
import { getProducts } from '@/lib/medusa/products';
import { ProductGrid } from '@/components/shop/product-grid';

// This is a Server Component by default
export default async function ProductsPage({
  searchParams
}: {
  searchParams: { page?: string; category?: string }
}) {
  // Data fetching happens on server
  const page = Number(searchParams.page) || 1;
  const category = searchParams.category;
  
  const { products, count } = await getProducts({
    page,
    category,
    limit: 20
  });

  return (
    <div>
      <h1>Products</h1>
      <ProductGrid products={products} />
      <Pagination totalPages={Math.ceil(count / 20)} currentPage={page} />
    </div>
  );
}

// Generate metadata
export async function generateMetadata({
  searchParams
}: {
  searchParams: { category?: string }
}) {
  return {
    title: searchParams.category 
      ? `${searchParams.category} Products` 
      : 'All Products',
    description: 'Browse our product catalog'
  };
}
```

### Static Generation with Dynamic Paths
```typescript
// app/(shop)/products/[handle]/page.tsx
import { getProduct, getProductHandles } from '@/lib/medusa/products';
import { ProductDetails } from '@/components/shop/product-details';
import { notFound } from 'next/navigation';

// Generate static params at build time
export async function generateStaticParams() {
  const handles = await getProductHandles();
  
  return handles.map((handle) => ({
    handle
  }));
}

// Revalidate every hour
export const revalidate = 3600;

export default async function ProductPage({
  params
}: {
  params: { handle: string }
}) {
  const product = await getProduct(params.handle);

  if (!product) {
    notFound();
  }

  return <ProductDetails product={product} />;
}

export async function generateMetadata({
  params
}: {
  params: { handle: string }
}) {
  const product = await getProduct(params.handle);

  if (!product) {
    return {
      title: 'Product Not Found'
    };
  }

  return {
    title: product.title,
    description: product.description,
    openGraph: {
      images: [product.thumbnail]
    }
  };
}
```

## CLIENT COMPONENTS

### Use 'use client' When Needed
```typescript
// components/shop/add-to-cart-button.tsx
'use client';

import { useState } from 'react';
import { useCart } from '@/lib/hooks/use-cart';
import { Button } from '@3dbyte-tech-store/shared-ui';

interface AddToCartButtonProps {
  variantId: string;
  quantity?: number;
}

export function AddToCartButton({ 
  variantId, 
  quantity = 1 
}: AddToCartButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { addItem } = useCart();

  const handleAddToCart = async () => {
    setIsLoading(true);
    try {
      await addItem(variantId, quantity);
      // Show success toast
    } catch (error) {
      // Show error toast
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      onClick={handleAddToCart}
      disabled={isLoading}
      isLoading={isLoading}
    >
      {isLoading ? 'Adding...' : 'Add to Cart'}
    </Button>
  );
}
```

### Client Component Patterns
```typescript
// Only mark client when you need:
// 1. Event handlers (onClick, onChange, etc.)
// 2. React hooks (useState, useEffect, etc.)
// 3. Browser APIs (localStorage, window, etc.)
// 4. Third-party libraries that use hooks

// Keep server components as default
// Pass server data as props to client components
```

## SERVER ACTIONS

### Creating Server Actions
```typescript
// actions/cart.ts
'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { medusaClient } from '@/lib/medusa/client';

export async function addToCart(variantId: string, quantity: number) {
  try {
    // Get cart ID from cookies
    const cartId = cookies().get('cart_id')?.value;

    if (!cartId) {
      // Create new cart
      const cart = await medusaClient.carts.create();
      cookies().set('cart_id', cart.id);
      
      await medusaClient.carts.lineItems.create(cart.id, {
        variant_id: variantId,
        quantity
      });
      
      revalidatePath('/cart');
      return { success: true };
    }

    // Add to existing cart
    await medusaClient.carts.lineItems.create(cartId, {
      variant_id: variantId,
      quantity
    });

    revalidatePath('/cart');
    return { success: true };
  } catch (error) {
    console.error('Failed to add to cart:', error);
    return { 
      success: false, 
      error: 'Failed to add item to cart' 
    };
  }
}

export async function updateCartItem(lineItemId: string, quantity: number) {
  const cartId = cookies().get('cart_id')?.value;

  if (!cartId) {
    return { success: false, error: 'No cart found' };
  }

  try {
    await medusaClient.carts.lineItems.update(cartId, lineItemId, {
      quantity
    });

    revalidatePath('/cart');
    return { success: true };
  } catch (error) {
    return { success: false, error: 'Failed to update cart' };
  }
}
```

### Using Server Actions
```typescript
// components/cart/cart-item.tsx
'use client';

import { updateCartItem } from '@/actions/cart';
import { useState } from 'react';

export function CartItem({ item }) {
  const [isUpdating, setIsUpdating] = useState(false);

  const handleQuantityChange = async (newQuantity: number) => {
    setIsUpdating(true);
    const result = await updateCartItem(item.id, newQuantity);
    setIsUpdating(false);

    if (!result.success) {
      // Show error toast
    }
  };

  return (
    <div>
      {/* Cart item UI */}
      <input
        type="number"
        value={item.quantity}
        onChange={(e) => handleQuantityChange(Number(e.target.value))}
        disabled={isUpdating}
      />
    </div>
  );
}
```

## API ROUTES

### Route Handlers
```typescript
// app/api/webhooks/strapi/route.ts
import { revalidatePath } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  // Verify webhook secret
  const secret = request.headers.get('authorization');
  
  if (secret !== `Bearer ${process.env.STRAPI_WEBHOOK_SECRET}`) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const { event, model, entry } = body;

    // Handle different events
    switch (event) {
      case 'entry.create':
      case 'entry.update':
      case 'entry.publish':
        if (model === 'blog-post') {
          revalidatePath('/blog');
          if (entry?.slug) {
            revalidatePath(`/blog/${entry.slug}`);
          }
        }
        break;

      case 'entry.delete':
      case 'entry.unpublish':
        if (model === 'blog-post') {
          revalidatePath('/blog');
        }
        break;
    }

    return NextResponse.json({ 
      revalidated: true,
      timestamp: Date.now() 
    });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}
```

## DATA FETCHING

### Storefront Composition Pattern (Recommended)

**IMPORTANT**: For rendering enriched pages, use **Storefront Composition**, NOT Medusa proxy.

**Why?**
- Parallel fetching is faster than waterfall (Next.js → Medusa → Strapi)
- If Strapi goes down, product page still loads
- Can cache Strapi (1hr) separately from Medusa (fresh)

### Parallel Fetching Implementation

```typescript
// app/(shop)/products/[handle]/page.tsx
import { getProductByHandle } from "@/lib/medusa/products";
import { getStrapiContent } from "@/lib/strapi/content";

export default async function ProductPage({
  params,
}: {
  params: { handle: string };
}) {
  // ✅ RIGHT: Parallel fetching - Storefront Composition
  const [product, strapiData] = await Promise.all([
    getProductByHandle(params.handle),
    getStrapiContent("product-description", {
      filters: { medusa_id: { $eq: null } }
    }),
  ]);

  // Match Strapi content by medusa_id
  const enrichedContent = strapiData?.data?.find(
    (item) => item.attributes.medusa_id === product.id
  );

  return (
    <ProductTemplate
      product={product}
      richDescription={enrichedContent?.attributes?.rich_text}
    />
  );
}
```

### ❌ Wrong: Waterfall Pattern

```typescript
// ❌ WRONG: Do NOT proxy through Medusa
const product = await medusa.getEnrichedProduct(id);
// This is slow: Next.js → Medusa → Strapi
// And fragile: if Strapi is down, whole page fails
```

### Comparison Table

| Aspect | Storefront Composition | Medusa Proxy |
|--------|----------------------|--------------|
| Performance | Parallel (fast) | Waterfall (slow) |
| Resilience | Strapi down = product still works | Strapi down = page fails |
| Caching | Separate TTL per source | Single TTL (compromise) |

**See also**: `/docs/meilisearch-integration-guide.md` for comprehensive patterns.

### Medusa Client Setup
```typescript
// lib/medusa/client.ts
import Medusa from '@medusajs/medusa-js';

export const medusaClient = new Medusa({
  baseUrl: process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL!,
  maxRetries: 3,
  publishableApiKey: process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY!
});
```

### Fetching Products
```typescript
// lib/medusa/products.ts
import { medusaClient } from './client';
import type { Product } from '@3dbyte-tech-store/shared-types';

export async function getProducts(params: {
  page?: number;
  category?: string;
  limit?: number;
  sort?: string;
}): Promise<{ products: Product[]; count: number }> {
  const { page = 1, limit = 20, category, sort } = params;
  
  const response = await medusaClient.products.list({
    limit,
    offset: (page - 1) * limit,
    category_id: category ? [category] : undefined,
    order: sort
  });

  return {
    products: response.products,
    count: response.count
  };
}

export async function getProduct(handle: string): Promise<Product | null> {
  try {
    const response = await medusaClient.products.list({
      handle
    });

    return response.products[0] || null;
  } catch (error) {
    console.error('Failed to fetch product:', error);
    return null;
  }
}

export async function getProductHandles(): Promise<string[]> {
  const response = await medusaClient.products.list({
    fields: 'handle'
  });

  return response.products.map(p => p.handle);
}
```

### Strapi Client Setup
```typescript
// lib/strapi/client.ts
export const strapiClient = {
  baseUrl: process.env.NEXT_PUBLIC_STRAPI_URL!,
  token: process.env.NEXT_PUBLIC_STRAPI_READ_TOKEN!,

  async fetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = `${this.baseUrl}/api${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
        ...options?.headers
      },
      next: {
        revalidate: 3600, // Revalidate every hour
        ...options?.next
      }
    });

    if (!response.ok) {
      throw new Error(`Strapi fetch failed: ${response.statusText}`);
    }

    return response.json();
  }
};
```

### Fetching Blog Posts
```typescript
// lib/strapi/blog.ts
import { strapiClient } from './client';
import type { BlogPost } from '@3dbyte-tech-store/shared-types';

export async function getBlogPosts(params?: {
  page?: number;
  limit?: number;
  category?: string;
}): Promise<{ posts: BlogPost[]; count: number }> {
  const { page = 1, limit = 10, category } = params || {};

  const query = new URLSearchParams({
    'pagination[page]': page.toString(),
    'pagination[pageSize]': limit.toString(),
    'populate': 'author,featured_image,categories',
    'sort': 'publishedAt:desc'
  });

  if (category) {
    query.append('filters[categories][slug][$eq]', category);
  }

  const response = await strapiClient.fetch<any>(
    `/blog-posts?${query.toString()}`
  );

  return {
    posts: response.data,
    count: response.meta.pagination.total
  };
}

export async function getBlogPost(slug: string): Promise<BlogPost | null> {
  try {
    const response = await strapiClient.fetch<any>(
      `/blog-posts/slug/${slug}?populate=*`
    );

    return response.data;
  } catch (error) {
    return null;
  }
}
```

## FORMS & VALIDATION

### Form with Server Action
```typescript
// components/checkout/checkout-form.tsx
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { processCheckout } from '@/actions/checkout';

const checkoutSchema = z.object({
  email: z.string().email('Invalid email'),
  firstName: z.string().min(2, 'First name required'),
  lastName: z.string().min(2, 'Last name required'),
  address: z.string().min(5, 'Address required'),
  city: z.string().min(2, 'City required'),
  postalCode: z.string().min(4, 'Postal code required'),
  country: z.string().min(2, 'Country required')
});

type CheckoutFormData = z.infer<typeof checkoutSchema>;

export function CheckoutForm() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<CheckoutFormData>({
    resolver: zodResolver(checkoutSchema)
  });

  const onSubmit = async (data: CheckoutFormData) => {
    const result = await processCheckout(data);
    
    if (result.success) {
      // Redirect to success page
      window.location.href = `/order/confirmed/${result.orderId}`;
    } else {
      // Show error
      alert(result.error);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label htmlFor="email">Email</label>
        <input
          {...register('email')}
          type="email"
          id="email"
          className="input"
        />
        {errors.email && (
          <span className="text-red-500">{errors.email.message}</span>
        )}
      </div>

      {/* More fields... */}

      <button
        type="submit"
        disabled={isSubmitting}
        className="btn btn-primary"
      >
        {isSubmitting ? 'Processing...' : 'Place Order'}
      </button>
    </form>
  );
}
```

## STYLING WITH TAILWIND

### Tailwind Configuration
```typescript
// tailwind.config.ts
import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    '../../packages/shared-ui/src/**/*.{js,ts,jsx,tsx,mdx}'
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#your-color',
          secondary: '#your-color'
        }
      }
    }
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography')
  ]
};

export default config;
```

### Component Styling
```typescript
// Use Tailwind classes with proper organization
<div className="
  flex items-center justify-between
  px-4 py-2
  bg-white dark:bg-gray-900
  border border-gray-200 dark:border-gray-700
  rounded-lg
  hover:shadow-md
  transition-shadow
">
  {/* Component content */}
</div>

// For complex/repeated patterns, use shared-ui components
import { Card, Button } from '@3dbyte-tech-store/shared-ui';
```

## PERFORMANCE OPTIMIZATION

### Image Optimization
```typescript
import Image from 'next/image';

<Image
  src={product.thumbnail}
  alt={product.title}
  width={800}
  height={800}
  priority={isFeatured} // For above-fold images
  placeholder="blur"
  blurDataURL={product.thumbnailBlur}
  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
/>
```

### Dynamic Imports
```typescript
// Lazy load heavy components
import dynamic from 'next/dynamic';

const HeavyChart = dynamic(
  () => import('@/components/analytics/chart'),
  {
    loading: () => <div>Loading chart...</div>,
    ssr: false // Don't render on server
  }
);
```

### Suspense Boundaries
```typescript
import { Suspense } from 'react';

export default function ProductPage() {
  return (
    <div>
      <ProductHero /> {/* Fast, above fold */}
      
      <Suspense fallback={<ReviewsSkeleton />}>
        <ProductReviews /> {/* Slower, below fold */}
      </Suspense>
      
      <Suspense fallback={<RelatedSkeleton />}>
        <RelatedProducts /> {/* Slower, below fold */}
      </Suspense>
    </div>
  );
}
```

## STATE MANAGEMENT

### React Context for Cart
```typescript
// lib/context/cart-context.tsx
'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import type { Cart } from '@3dbyte-tech-store/shared-types';

interface CartContextType {
  cart: Cart | null;
  addItem: (variantId: string, quantity: number) => Promise<void>;
  updateItem: (lineItemId: string, quantity: number) => Promise<void>;
  removeItem: (lineItemId: string) => Promise<void>;
  isLoading: boolean;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<Cart | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Implementation...

  return (
    <CartContext.Provider value={{ cart, addItem, updateItem, removeItem, isLoading }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within CartProvider');
  }
  return context;
}
```

## ENVIRONMENT VARIABLES

```bash
# Medusa
NEXT_PUBLIC_MEDUSA_BACKEND_URL=http://localhost:9000
NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=pk_...

# Strapi
NEXT_PUBLIC_STRAPI_URL=http://localhost:1337
NEXT_PUBLIC_STRAPI_READ_TOKEN=your-read-token

# Webhooks
STRAPI_WEBHOOK_SECRET=your-webhook-secret

# Analytics (optional)
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
```

## BEFORE IMPLEMENTING

1. **Check if Server or Client Component**: Default to Server
2. **Review shared-ui components**: Don't duplicate
3. **Plan data fetching**: Static, dynamic, or revalidated?
4. **Read data fetching doc**: `/apps/storefront/PRPs/docs/data-fetching.md`
4. **Consider SEO**: Metadata, OpenGraph, structured data
5. **Test responsive design**: Mobile-first approach
6. **Plan loading states**: Suspense, skeletons, indicators

## COMMON GOTCHAS

- **'use client' spreads down**: Any imported component becomes client
- **Props serialization**: Can't pass functions to Server Components
- **Cookies in Server Components**: Use `cookies()` from 'next/headers'
- **Revalidation timing**: Balance freshness vs performance
- **Image optimization**: Always use Next.js Image component
- **Environment variables**: Public vars need NEXT_PUBLIC_ prefix

Remember: Read `/CLAUDE.md` for global monorepo rules. This file supplements those rules with Next.js storefront-specific guidance.