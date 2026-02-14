"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function DocsPage() {
  const [activeSection, setActiveSection] = useState("getting-started");

  const sections = [
    { id: "getting-started", label: "Getting Started" },
    { id: "api-reference", label: "API Reference" },
    { id: "code-examples", label: "Code Examples" },
  ];

  return (
    <div className="container py-12 md:py-16">
      <div className="mb-12">
        <h1 className="text-4xl font-bold tracking-tight mb-4">
          Documentation
        </h1>
        <p className="text-lg text-muted-foreground">
          Developer documentation, API reference, and code examples to help you
          integrate with our platform.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-12 lg:grid-cols-[250px_1fr]">
        {/* Sidebar Navigation */}
        <aside className="hidden lg:block sticky top-24 self-start">
          <nav className="space-y-2">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                  activeSection === section.id
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                }`}
              >
                {section.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Main Content */}
        <div className="space-y-16">
          {/* Getting Started Section */}
          <section id="getting-started" className="space-y-8">
            <div>
              <h2 className="text-3xl font-bold tracking-tight mb-2">
                Getting Started
              </h2>
              <p className="text-muted-foreground">
                Get up and running with our API in minutes
              </p>
            </div>

            <Alert>
              <AlertDescription>
                <strong>Note:</strong> All API requests require authentication.
                Sign up for an API key in your account settings.
              </AlertDescription>
            </Alert>

            <Card>
              <CardHeader>
                <CardTitle>Prerequisites</CardTitle>
                <CardDescription>
                  What you need before getting started
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2">
                  <li className="flex items-start gap-2">
                    <Badge variant="secondary">1</Badge>
                    <span>Active account on our platform</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Badge variant="secondary">2</Badge>
                    <span>API key from account settings</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Badge variant="secondary">3</Badge>
                    <span>Basic understanding of REST APIs</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Badge variant="secondary">4</Badge>
                    <span>Node.js, Python, or any HTTP client</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quick Start</CardTitle>
                <CardDescription>
                  Make your first API call in 30 seconds
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <h4 className="font-semibold">Step 1: Set up your environment</h4>
                  <p className="text-sm text-muted-foreground">
                    Store your API key securely as an environment variable
                  </p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold">Step 2: Make your first request</h4>
                  <p className="text-sm text-muted-foreground">
                    Use the API key to authenticate your requests
                  </p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold">Step 3: Handle the response</h4>
                  <p className="text-sm text-muted-foreground">
                    Parse the JSON response and integrate with your application
                  </p>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* API Reference Section */}
          <section id="api-reference" className="space-y-8">
            <div>
              <h2 className="text-3xl font-bold tracking-tight mb-2">
                API Reference
              </h2>
              <p className="text-muted-foreground">
                Complete reference for all available endpoints
              </p>
            </div>

            <Accordion type="single" collapsible className="space-y-4">
              {/* Products API */}
              <AccordionItem value="products" className="border rounded-lg px-6">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3">
                    <Badge>GET</Badge>
                    <span className="font-semibold">/api/products</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-4">
                  <div className="space-y-2">
                    <h4 className="font-semibold">Description</h4>
                    <p className="text-sm text-muted-foreground">
                      Retrieve a list of all available products with optional
                      filtering and pagination.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-semibold">Query Parameters</h4>
                    <ul className="space-y-1 text-sm">
                      <li>
                        <code className="bg-muted px-2 py-1 rounded">
                          page
                        </code>{" "}
                        - Page number (default: 1)
                      </li>
                      <li>
                        <code className="bg-muted px-2 py-1 rounded">
                          limit
                        </code>{" "}
                        - Items per page (default: 20, max: 100)
                      </li>
                      <li>
                        <code className="bg-muted px-2 py-1 rounded">
                          category
                        </code>{" "}
                        - Filter by category slug
                      </li>
                    </ul>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-semibold">Response</h4>
                    <p className="text-sm text-muted-foreground">
                      Returns array of products with pagination metadata
                    </p>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Product Details API */}
              <AccordionItem value="product-details" className="border rounded-lg px-6">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3">
                    <Badge>GET</Badge>
                    <span className="font-semibold">/api/products/{`{handle}`}</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-4">
                  <div className="space-y-2">
                    <h4 className="font-semibold">Description</h4>
                    <p className="text-sm text-muted-foreground">
                      Retrieve detailed information about a specific product by
                      its handle (slug).
                    </p>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-semibold">Path Parameters</h4>
                    <ul className="space-y-1 text-sm">
                      <li>
                        <code className="bg-muted px-2 py-1 rounded">
                          handle
                        </code>{" "}
                        - Product handle (string, required)
                      </li>
                    </ul>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-semibold">Response</h4>
                    <p className="text-sm text-muted-foreground">
                      Returns complete product details including variants, images,
                      and pricing
                    </p>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Cart API */}
              <AccordionItem value="cart" className="border rounded-lg px-6">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3">
                    <Badge>POST</Badge>
                    <span className="font-semibold">/api/cart/items</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-4">
                  <div className="space-y-2">
                    <h4 className="font-semibold">Description</h4>
                    <p className="text-sm text-muted-foreground">
                      Add items to the shopping cart or update existing cart items.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-semibold">Request Body</h4>
                    <ul className="space-y-1 text-sm">
                      <li>
                        <code className="bg-muted px-2 py-1 rounded">
                          productId
                        </code>{" "}
                        - Product ID (string, required)
                      </li>
                      <li>
                        <code className="bg-muted px-2 py-1 rounded">
                          variantId
                        </code>{" "}
                        - Product variant ID (string, required)
                      </li>
                      <li>
                        <code className="bg-muted px-2 py-1 rounded">
                          quantity
                        </code>{" "}
                        - Quantity to add (number, required, min: 1)
                      </li>
                    </ul>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-semibold">Response</h4>
                    <p className="text-sm text-muted-foreground">
                      Returns updated cart with new item added
                    </p>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Checkout API */}
              <AccordionItem value="checkout" className="border rounded-lg px-6">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3">
                    <Badge>POST</Badge>
                    <span className="font-semibold">/api/checkout</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-4">
                  <div className="space-y-2">
                    <h4 className="font-semibold">Description</h4>
                    <p className="text-sm text-muted-foreground">
                      Initiate the checkout process for the current cart.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-semibold">Request Body</h4>
                    <ul className="space-y-1 text-sm">
                      <li>
                        <code className="bg-muted px-2 py-1 rounded">
                          cartId
                        </code>{" "}
                        - Cart ID (string, required)
                      </li>
                      <li>
                        <code className="bg-muted px-2 py-1 rounded">
                          email
                        </code>{" "}
                        - Customer email (string, required)
                      </li>
                    </ul>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-semibold">Response</h4>
                    <p className="text-sm text-muted-foreground">
                      Returns checkout URL and session information
                    </p>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </section>

          {/* Code Examples Section */}
          <section id="code-examples" className="space-y-8">
            <div>
              <h2 className="text-3xl font-bold tracking-tight mb-2">
                Code Examples
              </h2>
              <p className="text-muted-foreground">
                Practical examples to help you get started quickly
              </p>
            </div>

            <Tabs defaultValue="javascript" className="w-full">
              <TabsList>
                <TabsTrigger value="javascript">JavaScript</TabsTrigger>
                <TabsTrigger value="python">Python</TabsTrigger>
                <TabsTrigger value="curl">cURL</TabsTrigger>
              </TabsList>

              <TabsContent value="javascript" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Fetch Products</CardTitle>
                    <CardDescription>Get a list of products using fetch API</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
                      <code>{`const API_KEY = process.env.NEXT_PUBLIC_API_KEY;

async function getProducts() {
  const response = await fetch(
    'https://api.example.com/products?page=1&limit=20',
    {
      headers: {
        'Authorization': \`Bearer \${API_KEY}\`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    throw new Error(\`HTTP error! status: \${response.status}\`);
  }

  const data = await response.json();
  return data;
}

// Usage
const products = await getProducts();
console.log(products);`}</code>
                    </pre>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Add to Cart</CardTitle>
                    <CardDescription>Add an item to the shopping cart</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
                      <code>{`async function addToCart(productId, variantId, quantity = 1) {
  const response = await fetch(
    'https://api.example.com/cart/items',
    {
      method: 'POST',
      headers: {
        'Authorization': \`Bearer \${API_KEY}\`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        productId,
        variantId,
        quantity,
      }),
    }
  );

  if (!response.ok) {
    throw new Error(\`HTTP error! status: \${response.status}\`);
  }

  const cart = await response.json();
  return cart;
}

// Usage
const cart = await addToCart('prod_123', 'var_456', 2);
console.log(cart);`}</code>
                    </pre>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="python" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Fetch Products</CardTitle>
                    <CardDescription>Get a list of products using requests</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
                      <code>{`import requests
import os

API_KEY = os.environ.get('API_KEY')

def get_products(page=1, limit=20):
    """Fetch products from the API"""
    response = requests.get(
        'https://api.example.com/products',
        params={'page': page, 'limit': limit},
        headers={
            'Authorization': f'Bearer {API_KEY}',
            'Content-Type': 'application/json',
        }
    )
    
    response.raise_for_status()
    return response.json()

# Usage
products = get_products()
print(products)`}</code>
                    </pre>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Add to Cart</CardTitle>
                    <CardDescription>Add an item to the shopping cart</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
                      <code>{`def add_to_cart(product_id, variant_id, quantity=1):
    """Add an item to the cart"""
    response = requests.post(
        'https://api.example.com/cart/items',
        json={
            'productId': product_id,
            'variantId': variant_id,
            'quantity': quantity,
        },
        headers={
            'Authorization': f'Bearer {API_KEY}',
            'Content-Type': 'application/json',
        }
    )
    
    response.raise_for_status()
    return response.json()

# Usage
cart = add_to_cart('prod_123', 'var_456', 2)
print(cart)`}</code>
                    </pre>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="curl" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Fetch Products</CardTitle>
                    <CardDescription>Get a list of products using cURL</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
                      <code>{`curl -X GET "https://api.example.com/products?page=1&limit=20" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json"`}</code>
                    </pre>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Add to Cart</CardTitle>
                    <CardDescription>Add an item to the shopping cart</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
                      <code>{`curl -X POST "https://api.example.com/cart/items" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "productId": "prod_123",
    "variantId": "var_456",
    "quantity": 2
  }'`}</code>
                    </pre>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </section>
        </div>
      </div>
    </div>
  );
}
