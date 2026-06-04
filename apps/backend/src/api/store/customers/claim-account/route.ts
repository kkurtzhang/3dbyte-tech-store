import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { Modules } from "@medusajs/framework/utils";
import { z } from "@medusajs/framework/zod";
import { setAuthAppMetadataWorkflow } from "@medusajs/medusa/core-flows";
import type { AuthIdentityDTO } from "@medusajs/types";

export const PostStoreClaimCustomerAccountSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  first_name: z.string().trim().optional(),
  last_name: z.string().trim().optional(),
  source: z.enum(["emailpass", "google"]),
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

type CustomerModule = {
  listCustomers: (filters: { email: string }) => Promise<CustomerRecord[]>;
  retrieveCustomer: (id: string) => Promise<CustomerRecord>;
  updateCustomers: (
    input: Partial<CustomerRecord> & { id: string },
  ) => Promise<CustomerRecord>;
};

type AuthModule = {
  retrieveAuthIdentity: (
    id: string,
    config?: Record<string, unknown>,
  ) => Promise<AuthIdentityDTO>;
};

type RequestWithAuthContext = MedusaRequest & {
  auth_context?: {
    actor_id?: string;
    auth_identity_id?: string;
    user_metadata?: Record<string, unknown>;
  };
  validatedBody?: ClaimCustomerAccountInput;
};

const normalizeEmail = (value: string): string => value.trim().toLowerCase();

const getMetadata = (customer: CustomerRecord): Record<string, unknown> =>
  customer.metadata && typeof customer.metadata === "object"
    ? customer.metadata
    : {};

const getRequestBody = (req: MedusaRequest): ClaimCustomerAccountInput =>
  ((req as RequestWithAuthContext).validatedBody ||
    req.body) as ClaimCustomerAccountInput;

const getAuthContext = (req: MedusaRequest) =>
  (req as RequestWithAuthContext).auth_context;

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const addEmail = (emails: Set<string>, value: unknown): void => {
  if (isNonEmptyString(value) && value.includes("@")) {
    emails.add(normalizeEmail(value));
  }
};

const getAuthenticatedEmails = (
  authIdentity: AuthIdentityDTO,
  authContext: ReturnType<typeof getAuthContext>,
): Set<string> => {
  const emails = new Set<string>();

  addEmail(emails, authContext?.user_metadata?.email);

  for (const providerIdentity of authIdentity.provider_identities || []) {
    addEmail(emails, providerIdentity.entity_id);
    addEmail(emails, providerIdentity.user_metadata?.email);
    addEmail(emails, providerIdentity.provider_metadata?.email);
  }

  return emails;
};

const buildClaimedCustomerUpdate = (
  customer: CustomerRecord,
  input: ClaimCustomerAccountInput,
) => {
  const metadata = {
    ...getMetadata(customer),
    account_claimed_at: new Date().toISOString(),
    account_claim_source: input.source,
  };
  const firstName =
    isNonEmptyString(input.first_name) && !isNonEmptyString(customer.first_name)
      ? input.first_name
      : customer.first_name || undefined;
  const lastName =
    isNonEmptyString(input.last_name) && !isNonEmptyString(customer.last_name)
      ? input.last_name
      : customer.last_name || undefined;

  return {
    id: customer.id,
    has_account: true,
    metadata,
    ...(firstName ? { first_name: firstName } : {}),
    ...(lastName ? { last_name: lastName } : {}),
  };
};

async function linkAuthIdentityToCustomer({
  req,
  authIdentityId,
  customerId,
}: {
  req: MedusaRequest;
  authIdentityId: string;
  customerId: string;
}) {
  await setAuthAppMetadataWorkflow(req.scope).run({
    input: {
      authIdentityId,
      actorType: "customer",
      value: customerId,
    },
  });
}

export async function POST(
  req: MedusaRequest,
  res: MedusaResponse,
): Promise<void> {
  const input = getRequestBody(req);
  const authContext = getAuthContext(req);
  const authIdentityId = authContext?.auth_identity_id;
  const actorId = authContext?.actor_id;

  if (!authIdentityId) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  const requestedEmail = normalizeEmail(input.email);
  const customerModule = req.scope.resolve<CustomerModule>(Modules.CUSTOMER);

  if (actorId) {
    const customer = await customerModule.retrieveCustomer(actorId);

    if (!customer?.email || normalizeEmail(customer.email) !== requestedEmail) {
      res.status(403).json({
        message: "Authenticated email does not match the requested customer email",
      });
      return;
    }

    res.json({
      claimed: false,
      linked: false,
      already_registered: true,
      customer,
    });
    return;
  }

  const authModule = req.scope.resolve<AuthModule>(Modules.AUTH);
  const authIdentity = await authModule.retrieveAuthIdentity(authIdentityId, {
    relations: ["provider_identities"],
  });
  const authenticatedEmails = getAuthenticatedEmails(authIdentity, authContext);

  if (!authenticatedEmails.has(requestedEmail)) {
    res.status(403).json({
      message: "Authenticated email does not match the requested customer email",
    });
    return;
  }

  const customers = await customerModule.listCustomers({
    email: requestedEmail,
  });
  const registeredCustomer = customers.find(
    (customer) => customer.has_account === true,
  );
  const guestCustomer = customers.find(
    (customer) => customer.has_account !== true,
  );

  if (registeredCustomer) {
    await linkAuthIdentityToCustomer({
      req,
      authIdentityId,
      customerId: registeredCustomer.id,
    });

    res.json({
      claimed: false,
      linked: true,
      already_registered: true,
      customer: registeredCustomer,
    });
    return;
  }

  if (!guestCustomer) {
    res.status(404).json({
      message: "No existing customer is available to claim",
    });
    return;
  }

  const updatedCustomer = await customerModule.updateCustomers(
    buildClaimedCustomerUpdate(guestCustomer, input),
  );

  await linkAuthIdentityToCustomer({
    req,
    authIdentityId,
    customerId: guestCustomer.id,
  });

  res.json({
    claimed: true,
    linked: true,
    already_registered: false,
    customer: updatedCustomer,
  });
}
