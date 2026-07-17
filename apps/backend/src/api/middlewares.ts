import {
  authenticate,
  defineMiddlewares,
  validateAndTransformBody,
  validateAndTransformQuery,
} from "@medusajs/framework/http";
import {
  PostAdminCreateBrand,
  PostAdminLinkProductsToBrand,
  PostAdminUpdateBrand,
  DeleteAdminLinkProductsBrand,
  DeleteAdminBatchLinkProductsBrand,
} from "./admin/brands/validators";
import { z } from "@medusajs/framework/zod";
import { createFindParams } from "@medusajs/medusa/api/utils/validators";
import { storeAddressAutocompleteMiddlewares } from "./store/addresses/autocomplete/middlewares";
import { storeLocalityAutocompleteMiddlewares } from "./store/localities/autocomplete/middlewares";
import { UpsertPreorderVariantSchema } from "./admin/variants/[id]/preorders/route";
import { AddPricedLineItemSchema } from "./store/carts/[id]/line-items-priced/route";
import { PostAdminCreateBundledProduct } from "./admin/bundled-products/validators";
import {
  PostStoreCartLineItemBundles,
  PutStoreCartLineItemBundle,
} from "./store/carts/[id]/line-item-bundles/validators";
import {
  PostAdminEmailSenderProfileTest,
  PutAdminEmailSenderProfile,
} from "./admin/email-settings/validators";
import { PostStoreProductRegistrationSchema } from "./store/customers/me/product-registrations/route";
import { PostAdminProductRegistrationSchema } from "./admin/product-registrations/route";
import { PostAdminProductEntitlementFileSchema } from "./admin/product-entitlement-files/route";
import { PostStoreClaimCustomerAccountSchema } from "./store/customers/claim-account/route";
import { PostStoreGoogleLinkIntentSchema } from "./store/customers/me/google-link-intents/route";
import { PostStoreEmailpassLoginMethodSchema } from "./store/customers/me/login-methods/emailpass/route";
import { PostStoreCustomerEmailChangeSchema } from "./store/customers/me/email-change-requests/route";
import { PostStoreOrderLookupSchema } from "./store/orders/lookup/route";
import { GetAdminIdentityIssuesSchema } from "./admin/identity-issues/route";
import { PostAdminResolveIdentityIssueSchema } from "./admin/identity-issues/resolve/route";
import {
  adminEmailTestRateLimit,
  adminMeilisearchSyncRateLimit,
  customerDisconnectGoogleRateLimit,
  customerEmailChangeRateLimit,
  customerEmailVerificationRateLimit,
  customerGoogleLinkRateLimit,
  customerSetPasswordRateLimit,
  hermesProductDraftRateLimit,
  internalAiRateLimit,
  storeNewsletterSubscribeRateLimit,
  storeOrderLookupRateLimit,
  storeSupportTicketRateLimit,
  storeWaitlistJoinRateLimit,
} from "../lib/rate-limits/api-rules";
import { hermesProductDraftPayloadLimit } from "../lib/ai-product-drafts/security";

export const GetBrandsSchema = createFindParams();

export default defineMiddlewares({
  routes: [
    // Media Manager plugin authentication
    {
      matcher: "/admin/media*",
      middlewares: [authenticate("user", ["session", "bearer", "api-key"])],
    },
    {
      matcher: "/admin/meilisearch*",
      middlewares: [authenticate("user", ["session", "bearer", "api-key"])],
    },
    {
      matcher: "/admin/meilisearch*",
      methods: ["POST"],
      middlewares: [adminMeilisearchSyncRateLimit],
    },
    {
      matcher: "/admin/email-settings*",
      middlewares: [authenticate("user", ["session", "bearer", "api-key"])],
    },
    {
      matcher: "/admin/product-registrations*",
      middlewares: [authenticate("user", ["session", "bearer", "api-key"])],
    },
    {
      matcher: "/admin/product-registrations",
      methods: ["POST"],
      middlewares: [
        validateAndTransformBody(PostAdminProductRegistrationSchema),
      ],
    },
    {
      matcher: "/admin/product-entitlement-files*",
      middlewares: [authenticate("user", ["session", "bearer", "api-key"])],
    },
    {
      matcher: "/admin/product-entitlement-files",
      methods: ["POST"],
      middlewares: [
        validateAndTransformBody(PostAdminProductEntitlementFileSchema),
      ],
    },
    {
      matcher: "/admin/email-settings/profiles/:key",
      methods: ["PUT"],
      middlewares: [validateAndTransformBody(PutAdminEmailSenderProfile)],
    },
    {
      matcher: "/admin/email-settings/profiles/:key/test",
      methods: ["POST"],
      middlewares: [
        adminEmailTestRateLimit,
        validateAndTransformBody(PostAdminEmailSenderProfileTest),
      ],
    },
    {
      matcher: "/admin/brands",
      method: "POST",
      middlewares: [validateAndTransformBody(PostAdminCreateBrand)],
    },
    {
      matcher: "/admin/bundled-products",
      methods: ["POST"],
      middlewares: [validateAndTransformBody(PostAdminCreateBundledProduct)],
    },
    {
      matcher: "/admin/bundled-products",
      methods: ["GET"],
      middlewares: [
        validateAndTransformQuery(createFindParams(), {
          defaults: ["id", "title", "product.*", "items.*", "items.product.*"],
          isList: true,
          defaultLimit: 15,
        }),
      ],
    },
    {
      matcher: "/admin/products",
      method: ["POST"],
      additionalDataValidator: {
        brand_id: z.string().optional(),
      },
    },
    {
      matcher: "/admin/brands",
      method: "GET",
      middlewares: [
        validateAndTransformQuery(GetBrandsSchema, {
          defaults: ["id", "name", "handle", "products.*"],
          isList: true,
        }),
      ],
    },
    {
      matcher: "/admin/brands/:id",
      method: "GET",
      middlewares: [
        validateAndTransformQuery(GetBrandsSchema, {
          defaults: [
            "id",
            "name",
            "handle",
            "created_at",
            "updated_at",
            "products.*",
          ],
          isList: true,
        }),
      ],
    },
    {
      matcher: "/admin/brands/:id",
      methods: ["PUT"],
      middlewares: [validateAndTransformBody(PostAdminUpdateBrand)],
    },
    {
      matcher: "/admin/brands/:id/products",
      methods: ["POST"],
      middlewares: [validateAndTransformBody(PostAdminLinkProductsToBrand)],
    },
    {
      matcher: "/admin/brands/:id/products",
      methods: ["GET"],
      middlewares: [
        validateAndTransformQuery(createFindParams(), {
          isList: true,
        }),
      ],
    },
    {
      matcher: "/admin/brands/:id/products",
      methods: ["DELETE"],
      middlewares: [validateAndTransformBody(DeleteAdminLinkProductsBrand)],
    },
    {
      matcher: "/admin/variants/:id/preorders",
      methods: ["POST"],
      middlewares: [validateAndTransformBody(UpsertPreorderVariantSchema)],
    },
    {
      matcher: "/admin/brands/products",
      methods: ["DELETE"],
      middlewares: [
        validateAndTransformBody(DeleteAdminBatchLinkProductsBrand),
      ],
    },
    {
      matcher: "/store/carts/:id/line-items-priced",
      methods: ["POST"],
      middlewares: [validateAndTransformBody(AddPricedLineItemSchema)],
    },
    ...storeAddressAutocompleteMiddlewares,
    ...storeLocalityAutocompleteMiddlewares,
    // Wishlist routes
    {
      matcher: "/store/wishlist",
      middlewares: [authenticate("customer", ["session", "bearer"])],
    },
    {
      matcher: "/store/waitlist",
      methods: ["GET", "DELETE"],
      middlewares: [authenticate("customer", ["session", "bearer"])],
    },
    {
      matcher: "/store/waitlist",
      methods: ["POST"],
      middlewares: [
        authenticate("customer", ["session", "bearer"], {
          allowUnauthenticated: true,
        }),
        storeWaitlistJoinRateLimit,
      ],
    },
    {
      matcher: "/admin/waitlist*",
      middlewares: [authenticate("user", ["session", "bearer", "api-key"])],
    },
    {
      matcher: "/admin/support-tickets*",
      middlewares: [authenticate("user", ["session", "bearer", "api-key"])],
    },
    {
      matcher: "/integrations/hermes/product-drafts",
      methods: ["POST"],
      middlewares: [
        hermesProductDraftRateLimit,
        hermesProductDraftPayloadLimit,
      ],
    },
    {
      matcher: "/admin/ai-product-drafts",
      methods: ["GET"],
      middlewares: [authenticate("user", ["session", "bearer", "api-key"])],
    },
    {
      matcher: "/admin/ai-product-drafts/:id*",
      middlewares: [authenticate("user", ["session", "bearer", "api-key"])],
    },
    {
      matcher: "/admin/customers/:id/account-security",
      methods: ["GET"],
      middlewares: [authenticate("user", ["session", "bearer", "api-key"])],
    },
    {
      matcher: "/admin/identity-issues",
      methods: ["GET"],
      middlewares: [
        authenticate("user", ["session", "bearer", "api-key"]),
        validateAndTransformQuery(GetAdminIdentityIssuesSchema, {
          isList: false,
        }),
      ],
    },
    {
      matcher: "/admin/identity-issues/resolve",
      methods: ["POST"],
      middlewares: [
        authenticate("user", ["session", "bearer", "api-key"]),
        validateAndTransformBody(PostAdminResolveIdentityIssueSchema),
      ],
    },
    {
      matcher: "/store/carts/:id/line-item-bundles",
      methods: ["POST"],
      middlewares: [validateAndTransformBody(PostStoreCartLineItemBundles)],
    },
    {
      matcher: "/store/carts/:id/line-item-bundles/:bundle_id",
      methods: ["PUT"],
      middlewares: [validateAndTransformBody(PutStoreCartLineItemBundle)],
    },
    {
      matcher: "/store/wishlist/:id",
      methods: ["DELETE"],
      middlewares: [authenticate("customer", ["session", "bearer"])],
    },
    {
      matcher: "/store/customers/me/product-registrations",
      methods: ["POST"],
      middlewares: [
        authenticate("customer", ["session", "bearer"]),
        validateAndTransformBody(PostStoreProductRegistrationSchema),
      ],
    },
    {
      matcher: "/store/customers/me/product-files*",
      middlewares: [authenticate("customer", ["session", "bearer"])],
    },
    {
      matcher: "/store/customers/email-verifications",
      methods: ["POST"],
      middlewares: [
        authenticate("customer", ["session", "bearer"]),
        customerEmailVerificationRateLimit,
      ],
    },
    {
      matcher: "/store/customers/claim-account",
      methods: ["POST"],
      middlewares: [
        authenticate("customer", ["session", "bearer"], {
          allowUnregistered: true,
        }),
        validateAndTransformBody(PostStoreClaimCustomerAccountSchema),
      ],
    },
    {
      matcher: "/store/customers/me/link-guest-orders",
      methods: ["POST"],
      middlewares: [authenticate("customer", ["session", "bearer"])],
    },
    {
      matcher: "/store/customers/me/login-methods",
      methods: ["GET"],
      middlewares: [authenticate("customer", ["session", "bearer"])],
    },
    {
      matcher: "/store/customers/me/account-security",
      methods: ["GET"],
      middlewares: [authenticate("customer", ["session", "bearer"])],
    },
    {
      matcher: "/store/customers/me/email-change-requests",
      methods: ["POST"],
      middlewares: [
        authenticate("customer", ["session", "bearer"]),
        customerEmailChangeRateLimit,
        validateAndTransformBody(PostStoreCustomerEmailChangeSchema),
      ],
    },
    {
      matcher: "/store/customers/me/google-link-intents",
      methods: ["POST"],
      middlewares: [
        authenticate("customer", ["session", "bearer"]),
        customerGoogleLinkRateLimit,
        validateAndTransformBody(PostStoreGoogleLinkIntentSchema),
      ],
    },
    {
      matcher: "/store/customers/me/login-methods/emailpass",
      methods: ["POST"],
      middlewares: [
        authenticate("customer", ["session", "bearer"]),
        customerSetPasswordRateLimit,
        validateAndTransformBody(PostStoreEmailpassLoginMethodSchema),
      ],
    },
    {
      matcher: "/store/customers/me/login-methods/google",
      methods: ["DELETE"],
      middlewares: [
        authenticate("customer", ["session", "bearer"]),
        customerDisconnectGoogleRateLimit,
      ],
    },
    {
      matcher: "/store/customers/me",
      methods: ["DELETE"],
      middlewares: [authenticate("customer", ["session", "bearer"])],
    },
    {
      matcher: "/store/carts/:id/customer",
      methods: ["POST"],
      middlewares: [authenticate("customer", ["session", "bearer"])],
    },
    {
      matcher: "/store/waitlist/:id",
      methods: ["DELETE"],
      middlewares: [authenticate("customer", ["session", "bearer"])],
    },
    {
      matcher: "/admin/shipping-rates",
      methods: ["POST"],
      middlewares: [authenticate("user", ["session", "bearer", "api-key"])],
    },
    {
      matcher: "/admin/fulfillments/:id/label",
      methods: ["POST"],
      middlewares: [authenticate("user", ["session", "bearer", "api-key"])],
    },
    {
      matcher: "/store/orders/lookup",
      methods: ["POST"],
      middlewares: [
        storeOrderLookupRateLimit,
        validateAndTransformBody(PostStoreOrderLookupSchema),
      ],
    },
    {
      matcher: "/store/support-tickets",
      methods: ["POST"],
      middlewares: [storeSupportTicketRateLimit],
    },
    {
      matcher: "/store/newsletter/subscribe",
      methods: ["POST"],
      middlewares: [storeNewsletterSubscribeRateLimit],
    },
    {
      matcher: "/ai*",
      methods: ["POST"],
      middlewares: [internalAiRateLimit],
    },
  ],
});
