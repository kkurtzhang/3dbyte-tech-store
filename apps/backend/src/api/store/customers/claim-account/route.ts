import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { Modules } from "@medusajs/framework/utils";
import { z } from "@medusajs/framework/zod";
import { setAuthAppMetadataWorkflow } from "@medusajs/medusa/core-flows";

import { ACCOUNT_COORDINATION_MODULE } from "../../../../modules/account-coordination";
import {
  createAccountReauthToken,
  evaluateOAuthLinkIntent,
  isGoogleAutoLinkEnabled,
  normalizeCustomerEmail,
} from "../../../../modules/account-coordination/security";

export const PostStoreClaimCustomerAccountSchema = z
  .object({
    email: z.string().trim().toLowerCase().email(),
    first_name: z.string().trim().optional(),
    last_name: z.string().trim().optional(),
    source: z.enum(["emailpass", "google"]),
    link_intent_id: z.string().min(1).optional(),
    link_nonce: z.string().min(32).max(256).optional(),
  })
  .superRefine((input, context) => {
    if (Boolean(input.link_intent_id) !== Boolean(input.link_nonce)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Google link intent and nonce must be provided together",
        path: ["link_intent_id"],
      });
    }
  });

type ClaimCustomerAccountInput = z.infer<
  typeof PostStoreClaimCustomerAccountSchema
>;

type CustomerRecord = {
  id: string;
  email?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  has_account?: boolean | null;
  metadata?: Record<string, unknown> | null;
};

type ProviderIdentityRecord = {
  provider?: string | null;
  entity_id?: string | null;
  user_metadata?: Record<string, unknown> | null;
  provider_metadata?: Record<string, unknown> | null;
};

type AuthIdentityRecord = {
  id: string;
  app_metadata?: Record<string, unknown> | null;
  user_metadata?: Record<string, unknown> | null;
  provider_identities?: ProviderIdentityRecord[] | null;
};

type OAuthLinkIntentRecord = {
  id: string;
  customer_id: string;
  expected_email: string;
  nonce_hash: string;
  status: string;
  expires_at: Date | string;
  failure_count?: number | null;
  last_failure_reason?: string | null;
  used_at?: Date | string | null;
};

type CustomerModule = {
  listCustomers: (filters: { email: string }) => Promise<CustomerRecord[]>;
  retrieveCustomer: (id: string) => Promise<CustomerRecord>;
  updateCustomers: (
    id: string,
    data: Partial<CustomerRecord>,
  ) => Promise<CustomerRecord>;
};

type AuthModule = {
  retrieveAuthIdentity: (
    id: string,
    config?: Record<string, unknown>,
  ) => Promise<AuthIdentityRecord>;
};

type AccountCoordinationModule = {
  retrieveOAuthLinkIntent: (id: string) => Promise<OAuthLinkIntentRecord>;
  updateOAuthLinkIntents: (
    input: Partial<OAuthLinkIntentRecord> & { id: string },
  ) => Promise<OAuthLinkIntentRecord>;
  createAccountSecurityEvents: (input: {
    customer_id?: string | null;
    event_type: string;
    provider?: string | null;
    severity?: string;
    metadata?: Record<string, unknown>;
  }) => Promise<unknown>;
  createIdentityConflicts: (input: {
    customer_id?: string | null;
    normalized_email?: string | null;
    provider?: string | null;
    issue_type: string;
    status: string;
    occurrence_count: number;
    last_seen_at: Date;
    details?: Record<string, unknown>;
  }) => Promise<unknown>;
};

type RequestWithAuthContext = MedusaRequest & {
  auth_context?: {
    actor_id?: string;
    auth_identity_id?: string;
    user_metadata?: Record<string, unknown>;
  };
  validatedBody?: ClaimCustomerAccountInput;
};

type AuthTokenPayload = {
  actor_type?: unknown;
  auth_identity_id?: unknown;
};

const getRequestBody = (req: MedusaRequest): ClaimCustomerAccountInput =>
  ((req as RequestWithAuthContext).validatedBody ||
    req.body) as ClaimCustomerAccountInput;

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const getAuthorizationHeader = (req: MedusaRequest): string | null => {
  const headers = req.headers as
    | Headers
    | Record<string, string | string[] | undefined>
    | undefined;

  if (!headers) {
    return null;
  }

  if (typeof (headers as Headers).get === "function") {
    return (headers as Headers).get("authorization");
  }

  const value =
    (headers as Record<string, string | string[] | undefined>).authorization ||
    (headers as Record<string, string | string[] | undefined>).Authorization;

  if (Array.isArray(value)) {
    return value[0] || null;
  }

  return value || null;
};

const decodeAuthTokenPayload = (token: string): AuthTokenPayload | null => {
  const payload = token.split(".")[1];

  if (!payload) {
    return null;
  }

  try {
    const decoded = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    ) as unknown;

    return decoded && typeof decoded === "object"
      ? (decoded as AuthTokenPayload)
      : null;
  } catch {
    return null;
  }
};

const getBearerAuthIdentityId = (req: MedusaRequest): string | null => {
  const authorization = getAuthorizationHeader(req);
  const [scheme, token, extra] = authorization?.trim().split(/\s+/) || [];

  if (scheme?.toLowerCase() !== "bearer" || !token || extra !== undefined) {
    return null;
  }

  const payload = decodeAuthTokenPayload(token);

  if (
    payload?.actor_type !== "customer" ||
    !isNonEmptyString(payload.auth_identity_id)
  ) {
    return null;
  }

  return payload.auth_identity_id;
};

const getMetadata = (customer: CustomerRecord): Record<string, unknown> =>
  customer.metadata && typeof customer.metadata === "object"
    ? customer.metadata
    : {};

const addEmail = (emails: Set<string>, value: unknown): void => {
  if (isNonEmptyString(value) && value.includes("@")) {
    emails.add(normalizeCustomerEmail(value));
  }
};

const getProvider = (identity: ProviderIdentityRecord): string =>
  typeof identity.provider === "string"
    ? identity.provider.trim().toLowerCase()
    : "";

const hasVerifiedGoogleEmail = (
  metadata: Record<string, unknown> | null | undefined,
): boolean => metadata?.email_verified === true;

const hasEmailMetadata = (
  metadata: Record<string, unknown> | null | undefined,
): boolean => isNonEmptyString(metadata?.email) && metadata.email.includes("@");

const hasGoogleProviderIdentity = (
  authIdentity: AuthIdentityRecord,
): boolean =>
  (authIdentity.provider_identities || []).some(
    (providerIdentity) => getProvider(providerIdentity) === "google",
  );

const hasGoogleEmailAssertion = (
  providerIdentity: ProviderIdentityRecord,
): boolean =>
  getProvider(providerIdentity) === "google" &&
  (hasVerifiedGoogleEmail(providerIdentity.user_metadata) ||
    hasVerifiedGoogleEmail(providerIdentity.provider_metadata) ||
    hasEmailMetadata(providerIdentity.user_metadata) ||
    hasEmailMetadata(providerIdentity.provider_metadata));

const getAuthenticatedEmails = (
  authIdentity: AuthIdentityRecord,
  authContext: RequestWithAuthContext["auth_context"],
  source: ClaimCustomerAccountInput["source"],
): Set<string> => {
  const emails = new Set<string>();
  const isGoogleAuthIdentity = hasGoogleProviderIdentity(authIdentity);

  if (
    source === "emailpass" ||
    hasVerifiedGoogleEmail(authContext?.user_metadata) ||
    (source === "google" &&
      isGoogleAuthIdentity &&
      hasEmailMetadata(authContext?.user_metadata))
  ) {
    addEmail(emails, authContext?.user_metadata?.email);
  }

  for (const providerIdentity of authIdentity.provider_identities || []) {
    if (source === "emailpass" || hasGoogleEmailAssertion(providerIdentity)) {
      addEmail(emails, providerIdentity.entity_id);
      addEmail(emails, providerIdentity.user_metadata?.email);
      addEmail(emails, providerIdentity.provider_metadata?.email);
    }
  }

  return emails;
};

const getIdentityCustomerId = (
  authIdentity: AuthIdentityRecord,
): string | null => {
  const customerId = authIdentity.app_metadata?.customer_id;
  return isNonEmptyString(customerId) ? customerId : null;
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

const buildGoogleVerifiedCustomerUpdate = (customer: CustomerRecord) => ({
  metadata: {
    ...getMetadata(customer),
    email_verification_status: "verified",
    email_verification_source: "google",
    email_verified_at:
      typeof getMetadata(customer).email_verified_at === "string"
        ? getMetadata(customer).email_verified_at
        : new Date().toISOString(),
  },
});

const linkAuthIdentityToCustomer = async ({
  req,
  authIdentityId,
  customerId,
}: {
  req: MedusaRequest;
  authIdentityId: string;
  customerId: string;
}) => {
  try {
    await setAuthAppMetadataWorkflow(req.scope).run({
      input: {
        authIdentityId,
        actorType: "customer",
        value: customerId,
      },
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : String(error ?? "");
    if (!message.includes("already exists in app metadata")) {
      throw error;
    }
    const authModule = req.scope.resolve<AuthModule>(Modules.AUTH);
    const identity = await authModule.retrieveAuthIdentity(authIdentityId);
    const existingCustomerId = identity.app_metadata?.customer_id;
    if (existingCustomerId === customerId) {
      return;
    }
    throw error;
  }
};

const recordIdentityConflict = async ({
  coordinationModule,
  customerId,
  email,
  provider,
  issueType,
  details,
}: {
  coordinationModule: AccountCoordinationModule;
  customerId?: string | null;
  email: string;
  provider: string;
  issueType: string;
  details?: Record<string, unknown>;
}) => {
  await coordinationModule.createIdentityConflicts({
    customer_id: customerId || null,
    normalized_email: email,
    provider,
    issue_type: issueType,
    status: "open",
    occurrence_count: 1,
    last_seen_at: new Date(),
    details,
  });
};

const respondIdentityConflict = (res: MedusaResponse): void => {
  res.status(409).json({
    message: "This login method is already connected to another account",
    code: "identity_conflict",
  });
};

async function handleExplicitGoogleLink({
  req,
  res,
  input,
  authIdentityId,
  identityCustomerId,
  requestedEmail,
  customerModule,
  coordinationModule,
}: {
  req: MedusaRequest;
  res: MedusaResponse;
  input: ClaimCustomerAccountInput;
  authIdentityId: string;
  identityCustomerId: string | null;
  requestedEmail: string;
  customerModule: CustomerModule;
  coordinationModule: AccountCoordinationModule;
}): Promise<void> {
  let intent: OAuthLinkIntentRecord;

  try {
    intent = await coordinationModule.retrieveOAuthLinkIntent(
      input.link_intent_id as string,
    );
  } catch {
    res.status(409).json({
      message: "Google account connection could not be verified",
      code: "google_link_intent_not_found",
    });
    return;
  }

  const customer = await customerModule.retrieveCustomer(intent.customer_id);
  const evaluation = evaluateOAuthLinkIntent(intent, {
    customerId: customer.id,
    verifiedEmail: requestedEmail,
    nonce: input.link_nonce as string,
    secret: getCoordinationSecret(),
  });

  if (identityCustomerId && identityCustomerId !== intent.customer_id) {
    await recordIdentityConflict({
      coordinationModule,
      customerId: identityCustomerId,
      email: requestedEmail,
      provider: "google",
      issueType: "provider_identity_owned_by_other_customer",
      details: { intended_customer_id: intent.customer_id },
    });
    respondIdentityConflict(res);
    return;
  }

  if (!evaluation.valid) {
    await coordinationModule.updateOAuthLinkIntents({
      id: intent.id,
      status: evaluation.reason === "expired" ? "expired" : "failed",
      failure_count: (intent.failure_count || 0) + 1,
      last_failure_reason: evaluation.reason,
    });
    res.status(409).json({
      message: "Google account connection could not be verified",
      code: `google_link_${evaluation.reason}`,
    });
    return;
  }

  await coordinationModule.updateOAuthLinkIntents({
    id: intent.id,
    status: "processing",
  });
  await linkAuthIdentityToCustomer({
    req,
    authIdentityId,
    customerId: customer.id,
  });
  const updatedCustomer = await customerModule.updateCustomers(
    customer.id,
    buildGoogleVerifiedCustomerUpdate(customer),
  );
  await coordinationModule.updateOAuthLinkIntents({
    id: intent.id,
    status: "used",
    used_at: new Date(),
  });
  await coordinationModule.createAccountSecurityEvents({
    customer_id: customer.id,
    event_type: "login_method.google.linked",
    provider: "google",
    metadata: { intent_id: intent.id },
  });

  res.json({
    claimed: false,
    linked: true,
    already_registered: true,
    customer: updatedCustomer,
    reauth_token: createAccountReauthToken({
      customerId: customer.id,
      provider: "google",
      secret: getCoordinationSecret(),
      expiresInSeconds: 5 * 60,
    }),
  });
}

export async function POST(
  req: MedusaRequest,
  res: MedusaResponse,
): Promise<void> {
  const input = getRequestBody(req);
  const authContext = (req as RequestWithAuthContext).auth_context;
  const authIdentityId =
    authContext?.auth_identity_id ||
    (authContext ? getBearerAuthIdentityId(req) : null);

  if (!authIdentityId) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  const requestedEmail = normalizeCustomerEmail(input.email);
  const customerModule = req.scope.resolve<CustomerModule>(Modules.CUSTOMER);
  const authModule = req.scope.resolve<AuthModule>(Modules.AUTH);
  const coordinationModule = req.scope.resolve<AccountCoordinationModule>(
    ACCOUNT_COORDINATION_MODULE,
  );
  const authIdentity = await authModule.retrieveAuthIdentity(authIdentityId, {
    relations: ["provider_identities"],
  });
  const identityCustomerId = getIdentityCustomerId(authIdentity);
  const authenticatedEmails = getAuthenticatedEmails(
    authIdentity,
    authContext,
    input.source,
  );

  if (!authenticatedEmails.has(requestedEmail)) {
    res.status(403).json({
      message:
        "Authenticated email does not match the requested customer email",
      code:
        input.source === "google"
          ? "google_email_unverified"
          : "email_mismatch",
    });
    return;
  }

  if (input.source === "google" && input.link_intent_id && input.link_nonce) {
    await handleExplicitGoogleLink({
      req,
      res,
      input,
      authIdentityId,
      identityCustomerId,
      requestedEmail,
      customerModule,
      coordinationModule,
    });
    return;
  }

  if (identityCustomerId) {
    const actorId = authContext?.actor_id;
    if (actorId && actorId === identityCustomerId) {
      const customer = await customerModule.retrieveCustomer(actorId);
      if (
        customer.email &&
        normalizeCustomerEmail(customer.email) === requestedEmail
      ) {
        res.json({
          claimed: false,
          linked: false,
          already_registered: true,
          customer,
        });
        return;
      }
    }

    await recordIdentityConflict({
      coordinationModule,
      customerId: identityCustomerId,
      email: requestedEmail,
      provider: input.source,
      issueType: "provider_identity_owned_by_other_customer",
    });
    respondIdentityConflict(res);
    return;
  }

  const customers = await customerModule.listCustomers({
    email: requestedEmail,
  });
  const registeredCustomers = customers.filter(
    (customer) => customer.has_account === true,
  );
  const hasGuestCustomer = customers.some(
    (customer) => customer.has_account !== true,
  );

  if (registeredCustomers.length > 1) {
    await recordIdentityConflict({
      coordinationModule,
      email: requestedEmail,
      provider: input.source,
      issueType: "duplicate_registered_customers",
      details: {
        customer_ids: registeredCustomers.map((customer) => customer.id),
      },
    });
    res.status(409).json({
      message: "Multiple customer accounts require administrator review",
      code: "duplicate_registered_customers",
    });
    return;
  }

  const registeredCustomer = registeredCustomers[0];

  if (!registeredCustomer) {
    res.status(404).json({
      message: "No registered customer is available to link",
      guest_available: hasGuestCustomer,
    });
    return;
  }

  if (input.source !== "google") {
    res.json({
      claimed: false,
      linked: false,
      already_registered: true,
      customer: registeredCustomer,
    });
    return;
  }

  if (!isGoogleAutoLinkEnabled()) {
    res.status(409).json({
      message: "Google sign-in is not linked to this customer account",
      code: "google_link_required",
    });
    return;
  }

  await linkAuthIdentityToCustomer({
    req,
    authIdentityId,
    customerId: registeredCustomer.id,
  });
  const customer = await customerModule.updateCustomers(
    registeredCustomer.id,
    buildGoogleVerifiedCustomerUpdate(registeredCustomer),
  );
  await coordinationModule.createAccountSecurityEvents({
    customer_id: registeredCustomer.id,
    event_type: "login_method.google.auto_linked",
    provider: "google",
  });

  res.json({
    claimed: false,
    linked: true,
    already_registered: true,
    customer,
  });
}
