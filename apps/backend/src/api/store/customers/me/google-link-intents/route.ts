import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { Modules } from "@medusajs/framework/utils";
import { z } from "@medusajs/framework/zod";

import { ACCOUNT_COORDINATION_MODULE } from "../../../../../modules/account-coordination";
import { checkAccountSecurityRateLimit } from "../../../../../modules/account-coordination/rate-limit";
import {
  hashOpaqueValue,
  normalizeCustomerEmail,
} from "../../../../../modules/account-coordination/security";

export const PostStoreGoogleLinkIntentSchema = z.object({
  nonce: z.string().min(32).max(256),
});

type GoogleLinkIntentInput = z.infer<typeof PostStoreGoogleLinkIntentSchema>;

type CustomerModule = {
  retrieveCustomer: (
    id: string,
  ) => Promise<{ id: string; email?: string | null }>;
};

type OAuthLinkIntentRecord = {
  id: string;
  customer_id: string;
  status: string;
};

type AccountCoordinationModule = {
  listOAuthLinkIntents: (
    filters: Record<string, unknown>,
  ) => Promise<OAuthLinkIntentRecord[]>;
  updateOAuthLinkIntents: (input: {
    id: string;
    status: string;
    last_failure_reason?: string;
  }) => Promise<OAuthLinkIntentRecord>;
  createOAuthLinkIntents: (input: {
    customer_id: string;
    expected_email: string;
    nonce_hash: string;
    status: string;
    expires_at: Date;
  }) => Promise<OAuthLinkIntentRecord & { expires_at: Date }>;
  createAccountSecurityEvents: (input: {
    customer_id: string;
    event_type: string;
    provider: string;
    metadata?: Record<string, unknown>;
  }) => Promise<unknown>;
};

type RequestWithAuthContext = MedusaRequest & {
  auth_context?: { actor_id?: string };
  validatedBody?: GoogleLinkIntentInput;
};

const getCoordinationSecret = (): string => {
  const secret =
    process.env.CUSTOMER_ACCOUNT_COORDINATION_SECRET ||
    process.env.JWT_SECRET ||
    process.env.COOKIE_SECRET;

  if (!secret) {
    throw new Error("CUSTOMER_ACCOUNT_COORDINATION_SECRET must be configured");
  }

  return secret;
};

export async function POST(
  req: MedusaRequest,
  res: MedusaResponse,
): Promise<void> {
  const request = req as RequestWithAuthContext;
  const customerId = request.auth_context?.actor_id;

  if (!customerId) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  const rate = checkAccountSecurityRateLimit(customerId, "google_link");
  if (!rate.allowed) {
    res.setHeader(
      "Retry-After",
      Math.ceil(rate.retryAfterMs / 1000).toString(),
    );
    res.status(429).json({
      message: "Too many Google connection attempts. Please try again later.",
      code: "rate_limited",
    });
    return;
  }

  const input = request.validatedBody || (req.body as GoogleLinkIntentInput);
  const customerModule = req.scope.resolve<CustomerModule>(Modules.CUSTOMER);
  const coordinationModule = req.scope.resolve<AccountCoordinationModule>(
    ACCOUNT_COORDINATION_MODULE,
  );
  const customer = await customerModule.retrieveCustomer(customerId);

  if (!customer.email) {
    res.status(409).json({
      message: "A verified customer email is required to connect Google",
    });
    return;
  }

  const pendingIntents = await coordinationModule.listOAuthLinkIntents({
    customer_id: customerId,
    status: "pending",
  });

  await Promise.all(
    pendingIntents.map((intent) =>
      coordinationModule.updateOAuthLinkIntents({
        id: intent.id,
        status: "superseded",
        last_failure_reason: "superseded_by_new_intent",
      }),
    ),
  );

  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
  const intent = await coordinationModule.createOAuthLinkIntents({
    customer_id: customerId,
    expected_email: normalizeCustomerEmail(customer.email),
    nonce_hash: hashOpaqueValue(input.nonce, getCoordinationSecret()),
    status: "pending",
    expires_at: expiresAt,
  });

  await coordinationModule.createAccountSecurityEvents({
    customer_id: customerId,
    event_type: "google_link_intent.created",
    provider: "google",
    metadata: {
      intent_id: intent.id,
      expires_at: expiresAt.toISOString(),
    },
  });

  res.status(201).json({
    intent_id: intent.id,
    expires_at: intent.expires_at,
  });
}
