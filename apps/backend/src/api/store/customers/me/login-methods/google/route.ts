import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { Modules } from "@medusajs/framework/utils";

import { getRequestHeader } from "../../../../../support-ticket-utils";
import { ACCOUNT_COORDINATION_MODULE } from "../../../../../../modules/account-coordination";
import { checkAccountSecurityRateLimit } from "../../../../../../modules/account-coordination/rate-limit";
import { normalizeCustomerEmail } from "../../../../../../modules/account-coordination/security";
import {
  getProviderName,
  hasProvider,
  hasValidGoogleReauth,
  listCustomerAuthIdentities,
  resolveAuthModule,
  sendAccountSecurityNotification,
} from "../_lib";

const getCustomerId = (req: MedusaRequest): string | undefined =>
  (req as { auth_context?: { actor_id?: string } }).auth_context?.actor_id;

export async function DELETE(
  req: MedusaRequest,
  res: MedusaResponse,
): Promise<void> {
  const customerId = getCustomerId(req);

  if (!customerId) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  const rate = checkAccountSecurityRateLimit(customerId, "disconnect_google");
  if (!rate.allowed) {
    res.setHeader(
      "Retry-After",
      Math.ceil(rate.retryAfterMs / 1000).toString(),
    );
    res.status(429).json({
      message: "Too many Google disconnect attempts. Please try again later.",
      code: "rate_limited",
    });
    return;
  }

  const reauthToken = getRequestHeader(req, "x-customer-reauth-token");
  if (
    !reauthToken ||
    !hasValidGoogleReauth({ token: reauthToken, customerId })
  ) {
    res.status(403).json({
      message: "Recent Google verification is required",
      code: "reauth_required",
    });
    return;
  }

  const customerModule = req.scope.resolve<{
    retrieveCustomer: (
      id: string,
    ) => Promise<{ id: string; email?: string | null }>;
  }>(Modules.CUSTOMER);
  const customer = await customerModule.retrieveCustomer(customerId);

  if (!customer.email) {
    res.status(409).json({
      message: "Customer email is required",
      code: "customer_email_required",
    });
    return;
  }

  const authModule = resolveAuthModule(req.scope);
  const identities = await listCustomerAuthIdentities(authModule, customerId);

  if (!hasProvider(identities, "emailpass")) {
    res.status(409).json({
      message: "Add another login method before disconnecting Google",
      code: "last_login_method",
    });
    return;
  }

  const canonicalEmail = normalizeCustomerEmail(customer.email);
  const googleIdentities = identities.filter((identity) =>
    (identity.provider_identities || []).some(
      (providerIdentity) => getProviderName(providerIdentity) === "google",
    ),
  );
  const googleProviderIds = googleIdentities.flatMap((identity) =>
    (identity.provider_identities || [])
      .filter(
        (providerIdentity) => getProviderName(providerIdentity) === "google",
      )
      .map((providerIdentity) => providerIdentity.id),
  );

  if (!googleProviderIds.length) {
    res.status(404).json({
      message: "Google is not connected to this account",
      code: "login_method_not_found",
    });
    return;
  }

  await authModule.deleteProviderIdentities(googleProviderIds);
  const emptyIdentityIds = googleIdentities
    .filter((identity) => (identity.provider_identities || []).length === 1)
    .map((identity) => identity.id);

  if (emptyIdentityIds.length) {
    await authModule.deleteAuthIdentities(emptyIdentityIds);
  }

  const coordinationModule = req.scope.resolve<{
    createAccountSecurityEvents: (
      input: Record<string, unknown>,
    ) => Promise<unknown>;
  }>(ACCOUNT_COORDINATION_MODULE);
  await coordinationModule.createAccountSecurityEvents({
    customer_id: customerId,
    event_type: "login_method.google.disconnected",
    provider: "google",
  });
  await sendAccountSecurityNotification({
    container: req.scope,
    email: canonicalEmail,
    event: "login-method-google-disconnected",
    subject: "Google login disconnected",
    message: "Google login was disconnected from your 3D Byte Tech account.",
  });

  res.json({
    login_method: "google",
    disconnected: true,
  });
}
