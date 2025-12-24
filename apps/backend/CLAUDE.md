# Backend (Medusa) - Context Engineering Rules

> **Parent Context**: Always read `/CLAUDE.md` first for global monorepo rules.

## MEDUSA V2.12.3 SPECIFICS

### Architecture Overview
- **Framework**: Medusa v2 (breaking changes from v1)
- **API**: RESTful + Admin API
- **Database**: PostgreSQL with TypeORM
- **Cache**: Redis for sessions and caching
- **Queue**: Bull for background jobs

### Core Concepts
```
backend/
├── src/
│   ├── api/              # API routes (Store & Admin)
│   ├── models/           # Database entities
│   ├── services/         # Business logic
│   ├── repositories/     # Data access layer
│   ├── subscribers/      # Event subscribers
│   ├── workflows/        # Medusa workflows (v2)
│   ├── types/           # TypeScript definitions
│   └── migrations/      # Database migrations
├── medusa-config.ts     # Medusa configuration
└── package.json
```

## MEDUSA WORKFLOWS (V2 FEATURE)

### What Are Workflows?
Medusa v2 introduced workflows for complex, multi-step operations with built-in:
- Automatic rollback on failure
- Step-by-step execution
- Composition and reusability

### Creating Workflows
```typescript
// src/workflows/custom-order-processing.ts
import { createWorkflow, WorkflowResponse } from "@medusajs/workflows-sdk";
import { createStep } from "@medusajs/workflows-sdk";

// Define individual steps
const validateInventoryStep = createStep(
  "validate-inventory",
  async (input: { productId: string; quantity: number }) => {
    // Step logic
    const available = await checkInventory(input.productId, input.quantity);
    
    if (!available) {
      throw new Error("Insufficient inventory");
    }
    
    return { validated: true };
  },
  // Compensation function (rollback)
  async (input) => {
    // Cleanup if needed
  }
);

const reserveInventoryStep = createStep(
  "reserve-inventory",
  async (input) => {
    const reservation = await reserveStock(input);
    return { reservationId: reservation.id };
  },
  async (input) => {
    // Rollback: release reservation
    await releaseStock(input.reservationId);
  }
);

// Compose workflow
export const customOrderWorkflow = createWorkflow(
  "custom-order-processing",
  (input: { orderId: string; items: Array<any> }) => {
    const validated = validateInventoryStep(input);
    const reserved = reserveInventoryStep(validated);
    
    return new WorkflowResponse(reserved);
  }
);
```

### Using Workflows
```typescript
// In API route or service
import { customOrderWorkflow } from "../../workflows/custom-order-processing";

const { result } = await customOrderWorkflow.run({
  orderId: order.id,
  items: order.items
});
```

## SERVICES

### Service Pattern
```typescript
// src/services/custom-product.ts
import { TransactionBaseService } from "@medusajs/medusa";
import { Product } from "../models/product";
import { ProductRepository } from "../repositories/product";

class CustomProductService extends TransactionBaseService {
  protected productRepository_: typeof ProductRepository;

  constructor(container) {
    super(container);
    this.productRepository_ = container.productRepository;
  }

  async getEnrichedProduct(productId: string): Promise<Product> {
    return await this.atomicPhase_(async (manager) => {
      const productRepo = manager.withRepository(this.productRepository_);
      
      const product = await productRepo.findOne({
        where: { id: productId },
        relations: ["variants", "images", "tags"]
      });

      if (!product) {
        throw new Error("Product not found");
      }

      // Add enrichment logic
      return this.enrichProduct(product);
    });
  }

  private enrichProduct(product: Product): Product {
    // Custom enrichment logic
    return product;
  }
}

export default CustomProductService;
```

### Service Registration
```typescript
// src/services/index.ts
export { default as CustomProductService } from "./custom-product";
```

## API ROUTES

### Store API (Customer-Facing)
```typescript
// src/api/store/custom/route.ts
import type { MedusaRequest, MedusaResponse } from "@medusajs/medusa";
import { z } from "zod";

const querySchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0)
});

export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  try {
    // Validate query params
    const validated = querySchema.parse(req.query);
    
    // Use service
    const customService = req.scope.resolve("customProductService");
    const products = await customService.list(validated);

    res.json({
      products,
      count: products.length,
      offset: validated.offset,
      limit: validated.limit
    });
  } catch (error) {
    res.status(400).json({
      message: error.message,
      type: "invalid_request_error"
    });
  }
}
```

### Admin API (Protected)
```typescript
// src/api/admin/custom/route.ts
import type { 
  AuthenticatedMedusaRequest, 
  MedusaResponse 
} from "@medusajs/medusa";
import { authenticateAdmin } from "@medusajs/medusa";

export async function POST(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
): Promise<void> {
  // Admin is authenticated via middleware
  const adminId = req.user.id;
  
  // Implementation
}

// Apply authentication middleware
export const AUTHENTICATE = [authenticateAdmin()];
```

## MODELS & ENTITIES

### Custom Entity
```typescript
// src/models/custom-entity.ts
import { BeforeInsert, Column, Entity, Index } from "typeorm";
import { BaseEntity } from "@medusajs/medusa";
import { generateEntityId } from "@medusajs/medusa/dist/utils";

@Entity()
export class CustomEntity extends BaseEntity {
  @Column({ type: "varchar" })
  name: string;

  @Column({ type: "text", nullable: true })
  description: string | null;

  @Index()
  @Column({ type: "varchar" })
  status: "active" | "inactive";

  @Column({ type: "jsonb", nullable: true })
  metadata: Record<string, unknown> | null;

  @BeforeInsert()
  private beforeInsert(): void {
    this.id = generateEntityId(this.id, "cent"); // custom prefix
  }
}
```

### Extending Core Models
```typescript
// src/models/product.ts
import { Product as MedusaProduct } from "@medusajs/medusa";
import { Column, Entity } from "typeorm";

@Entity()
export class Product extends MedusaProduct {
  @Column({ type: "varchar", nullable: true })
  custom_field?: string;
  
  @Column({ type: "int", default: 0 })
  view_count: number;
}
```

## MIGRATIONS

### Creating Migrations
```bash
# Generate migration
npx typeorm migration:generate -n AddCustomField

# Run migrations
npm run migrations
```

### Migration Template
```typescript
// src/migrations/1234567890-AddCustomField.ts
import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class AddCustomField1234567890 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      "product",
      new TableColumn({
        name: "custom_field",
        type: "varchar",
        isNullable: true
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn("product", "custom_field");
  }
}
```

## SUBSCRIBERS (Event Handlers)

### Event Subscriber Pattern
```typescript
// src/subscribers/order-placed.ts
import { 
  type SubscriberConfig, 
  type SubscriberArgs 
} from "@medusajs/medusa";

export default async function orderPlacedHandler({
  data,
  container
}: SubscriberArgs<{ id: string }>) {
  const orderService = container.resolve("orderService");
  const order = await orderService.retrieve(data.id, {
    relations: ["customer", "items"]
  });

  // Custom logic (e.g., send notification, update inventory)
  console.log(`Order placed: ${order.id}`);
  
  // Trigger workflow
  const notificationWorkflow = container.resolve("notificationWorkflow");
  await notificationWorkflow.run({ orderId: order.id });
}

export const config: SubscriberConfig = {
  event: "order.placed",
  context: {
    subscriberId: "order-placed-handler"
  }
};
```

## PLUGINS & INTEGRATIONS

### Payment Providers
```typescript
// medusa-config.ts
module.exports = {
  plugins: [
    {
      resolve: "@medusajs/stripe",
      options: {
        api_key: process.env.STRIPE_API_KEY,
        webhook_secret: process.env.STRIPE_WEBHOOK_SECRET
      }
    }
  ]
};
```

### Custom Plugins
```typescript
// src/plugins/custom-plugin/index.ts
export default async function customPlugin(container, options) {
  // Plugin initialization
  const customService = container.resolve("customService");
  
  // Register custom functionality
}
```

## TESTING

### Service Tests
```typescript
// src/services/__tests__/custom-product.spec.ts
import { MockManager, MockRepository } from "medusa-test-utils";
import CustomProductService from "../custom-product";

describe("CustomProductService", () => {
  let service: CustomProductService;
  let productRepository: MockRepository;

  beforeEach(() => {
    productRepository = MockRepository({
      findOne: jest.fn()
    });

    service = new CustomProductService({
      productRepository,
      manager: MockManager
    });
  });

  describe("getEnrichedProduct", () => {
    it("should return enriched product", async () => {
      const mockProduct = { id: "prod_123", title: "Test" };
      productRepository.findOne.mockResolvedValue(mockProduct);

      const result = await service.getEnrichedProduct("prod_123");

      expect(result).toBeDefined();
      expect(productRepository.findOne).toHaveBeenCalledWith({
        where: { id: "prod_123" },
        relations: ["variants", "images", "tags"]
      });
    });
  });
});
```

### API Route Tests
```typescript
// src/api/store/custom/__tests__/route.spec.ts
import request from "supertest";
import { setupServer } from "medusa-test-utils";

describe("GET /store/custom", () => {
  let app;

  beforeAll(async () => {
    app = await setupServer();
  });

  it("should return products", async () => {
    const response = await request(app)
      .get("/store/custom")
      .query({ limit: 10 })
      .expect(200);

    expect(response.body.products).toBeDefined();
    expect(response.body.limit).toBe(10);
  });
});
```

## ENVIRONMENT VARIABLES

### Required Variables
```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/medusa

# Redis
REDIS_URL=redis://localhost:6379

# JWT Secret
JWT_SECRET=your-secret-key

# Admin Settings
MEDUSA_ADMIN_ONBOARDING_TYPE=default

# CORS
STORE_CORS=http://localhost:8000
ADMIN_CORS=http://localhost:9000

# Payment Providers
STRIPE_API_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
PAYPAL_CLIENT_ID=...
PAYPAL_CLIENT_SECRET=...
```

## PERFORMANCE OPTIMIZATION

### Database Queries
```typescript
// BAD: N+1 query problem
const products = await productService.list({});
for (const product of products) {
  const variants = await productVariantService.list({
    product_id: product.id
  });
}

// GOOD: Eager loading with relations
const products = await productService.list(
  {},
  {
    relations: ["variants", "images"],
    take: 20,
    skip: 0
  }
);
```

### Caching Strategy
```typescript
// Use Redis for frequently accessed data
const cacheService = container.resolve("cacheService");

async function getCachedProduct(productId: string) {
  const cacheKey = `product:${productId}`;
  
  // Try cache first
  let product = await cacheService.get(cacheKey);
  
  if (!product) {
    // Fetch from database
    product = await productService.retrieve(productId);
    // Cache for 5 minutes
    await cacheService.set(cacheKey, product, 300);
  }
  
  return product;
}
```

## COMMON PATTERNS

### Transaction Management
```typescript
// Always use transactions for multi-step operations
await this.atomicPhase_(async (manager) => {
  // Step 1
  await manager.getRepository(Product).save(product);
  
  // Step 2
  await manager.getRepository(Inventory).update(
    { product_id: product.id },
    { quantity: newQuantity }
  );
  
  // Both succeed or both rollback
});
```

### Error Handling
```typescript
import { MedusaError } from "@medusajs/utils";

// Use Medusa error types
throw new MedusaError(
  MedusaError.Types.NOT_FOUND,
  "Product not found"
);

throw new MedusaError(
  MedusaError.Types.INVALID_DATA,
  "Invalid product data",
  MedusaError.Codes.INVALID_DATA
);
```

## BEFORE IMPLEMENTING

1. **Check Medusa documentation Or Ask Medusa MCP**: <https://docs.medusajs.com>
2. **Review existing services**: Look for similar functionality
3. **Check if plugin exists**: Don't reinvent the wheel
4. **Plan transactions**: Identify operations needing atomicity
5. **Consider workflows**: Use for complex multi-step operations
6. **Test with Medusa Admin**: Verify changes in admin panel

## MEDUSA-SPECIFIC GOTCHAS

- **Breaking changes in v2**: Check migration guide from v1
- **Service resolution**: Use `container.resolve()` not direct imports
- **Transactions**: Always use `atomicPhase_` for data modifications
- **Relations**: Explicitly specify in queries, not auto-loaded
- **Migrations**: Always create down migrations for rollbacks
- **Plugin order**: Matters in medusa-config.ts

## DEBUGGING

### Enable Debug Logs
```bash
DEBUG=* npm run dev
# Or specific namespace
DEBUG=medusa:* npm run dev
```

### Common Issues
- **Port already in use**: Check if process running on 9000
- **Database connection**: Verify DATABASE_URL and PostgreSQL is running
- **Redis connection**: Ensure Redis is running on port 6379
- **Migration errors**: Check migration order and dependencies
- **Plugin errors**: Verify plugin configuration in medusa-config.ts

Remember: Read `/CLAUDE.md` for global monorepo rules. This file supplements those rules with Medusa-specific guidance.