import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { Modules } from "@medusajs/framework/utils";
import { z } from "@medusajs/framework/zod";
import { setAuthAppMetadataWorkflow } from "@medusajs/medusa/core-flows";

import { ACCOUNT_COORDINATION_MODULE } from "../../../../../../modules/account-coordination";
import { checkAccountSecurityRateLimit } from "../../../../../../modules/account-coordination/rate-limit";
import { normalizeCustomerEmail } from "../../../../../../modules/account-coordination/security";
import {
  hasProvider,
  hasValidGoogleReauth,
  listCustomerAuthIdentities,
  resolveAuthModule,
  sendAccountSecurityNotification,
} from "../_lib";

export const PostStoreEmailpassLoginMethodSchema = z.object({
  password: z
    .string()
    .min(12)
    .max(128)
    .regex(/[a-z]/)
    .regex(/[A-Z]/)
    .regex(/[0-9]/)
    .regex(/[^A-Za-z0-9]/),
  reauth_token: z.string().min(1),
});

type Input = z.infer<typeof PostStoreEmailpassLoginMethodSchema>;

type RequestWithAuth = MedusaRequest & {
  auth_context?: { actor_id?: string };
  validatedBody?: Input;
};

export async function POST(
  req: MedusaRequest,
  res: MedusaResponse,
): Promise<void> {
  const request = req as RequestWithAuth;
  const customerId = request.auth_context?.actor_id;

  if (!customerId) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  const rate = checkAccountSecurityRateLimit(customerId, "set_password");
  if (!rate.allowed) {
    res.setHeader(
      "Retry-After",
      Math.ceil(rate.retryAfterMs / 1000).toString(),
    );
    res.status(429).json({
      message: "Too many password setup attempts. Please try again later.",
      code: "rate_limited",
    });
    return;
  }

  const input = request.validatedBody || (req.body as Input);
  const customerModule = req.scope.resolve<{
    retrieveCustomer: (
      id: string,
    ) => Promise<{ id: string; email?: string | null }>;
  }>(Modules.CUSTOMER);
  const customer = await customerModule.retrieveCustomer(customerId);

  if (
    !customer.email ||
    !hasValidGoogleReauth({
      token: input.reauth_token,
      customerId,
    })
  ) {
    res.status(403).json({
      message: "Recent Google verification is required",
      code: "reauth_required",
    });
    return;
  }

  const authModule = resolveAuthModule(req.scope);
  const identities = await listCustomerAuthIdentities(authModule, customerId);

  if (hasProvider(identities, "emailpass")) {
    res.status(409).json({
      message: "Email and password login is already configured",
      code: "login_method_exists",
    });
    return;
  }

  const email = normalizeCustomerEmail(customer.email);
  const registration = await authModule.register("emailpass", {
    body: { email, password: input.password },
  });
  const authIdentity = registration.authIdentity;

  if (!registration.success || !authIdentity?.id) {
    res.status(409).json({
      message:
        registration.error ||
        "Email and password login could not be configured",
      code: "emailpass_registration_failed",
    });
    return;
  }

  const identityCustomerId = authIdentity.app_metadata?.customer_id;
  if (
    typeof identityCustomerId === "string" &&
    identityCustomerId !== customerId
  ) {
    res.status(409).json({
      message: "This email login belongs to another account",
      code: "identity_conflict",
    });
    return;
  }

  await setAuthAppMetadataWorkflow(req.scope).run({
    input: {
      authIdentityId: authIdentity.id,
      actorType: "customer",
      value: customerId,
    },
  });
  const coordinationModule = req.scope.resolve<{
    createAccountSecurityEvents: (
      input: Record<string, unknown>,
    ) => Promise<unknown>;
  }>(ACCOUNT_COORDINATION_MODULE);
  await coordinationModule.createAccountSecurityEvents({
    customer_id: customerId,
    event_type: "login_method.emailpass.added",
    provider: "emailpass",
  });
  await sendAccountSecurityNotification({
    container: req.scope,
    email,
    event: "login-method-emailpass-added",
    subject: "Password login added to your account",
    message: "Email and password login was added to your 3D Byte Tech account.",
  });

  res.status(201).json({
    login_method: "emailpass",
    added: true,
  });
}
